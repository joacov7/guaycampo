import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as forge from 'node-forge';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export interface AfipTicket {
  token: string;
  sign: string;
  expiry: Date;
}

export interface AfipCredentials {
  certificate: string;
  privateKey: string;
  cuit: string;
  isProduction: boolean;
}

const WSAA_URL_PROD = 'https://wsaa.afip.gov.ar/ws/services/LoginCms';
const WSAA_URL_TEST = 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';

@Injectable()
export class AfipAuthService {
  private readonly logger = new Logger(AfipAuthService.name);
  private readonly ticketCache = new Map<string, AfipTicket>();

  constructor(private readonly configService: ConfigService) {}

  async getAccessTicket(service: string, tenantId: string): Promise<AfipTicket> {
    const cacheKey = `${tenantId}:${service}`;
    const cached = this.ticketCache.get(cacheKey);

    if (cached && cached.expiry > new Date(Date.now() + 5 * 60 * 1000)) {
      return cached;
    }

    const credentials = await this.getCredentials(tenantId);
    const tra = this.buildTRA(service);
    const signedTra = await this.signTRA(tra, credentials.privateKey, credentials.certificate);
    const response = await this.callWSAA(signedTra, credentials.isProduction);
    const ticket = await this.parseTicketResponse(response);

    // Cache for 11 hours (TA lasts 12h, keep 1h margin)
    const cachedTicket: AfipTicket = {
      ...ticket,
      expiry: new Date(Date.now() + 11 * 60 * 60 * 1000),
    };
    this.ticketCache.set(cacheKey, cachedTicket);

    return cachedTicket;
  }

  async getCredentials(tenantId: string): Promise<AfipCredentials> {
    // In production these would come from a secrets manager (AWS Secrets Manager / Vault)
    // For now read from environment variables per tenant
    const certificate =
      this.configService.get<string>(`AFIP_CERT_${tenantId}`) ??
      this.configService.get<string>('AFIP_CERT') ??
      '';
    const privateKey =
      this.configService.get<string>(`AFIP_KEY_${tenantId}`) ??
      this.configService.get<string>('AFIP_KEY') ??
      '';
    const cuit =
      this.configService.get<string>(`AFIP_CUIT_${tenantId}`) ??
      this.configService.get<string>('AFIP_CUIT') ??
      '';
    const isProduction =
      (this.configService.get<string>('AFIP_ENVIRONMENT') ?? 'homologacion') === 'produccion';

    return { certificate, privateKey, cuit, isProduction };
  }

  private buildTRA(service: string): string {
    const now = new Date();
    const genTime = now.toISOString().replace('Z', '-03:00');
    const expTime = new Date(now.getTime() + 12 * 60 * 60 * 1000)
      .toISOString()
      .replace('Z', '-03:00');
    const uniqueId = Math.floor(Math.random() * 2147483647);

    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${genTime}</generationTime>
    <expirationTime>${expTime}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
  }

  private async signTRA(
    tra: string,
    privateKeyPem: string,
    certificatePem: string,
  ): Promise<string> {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const certificate = forge.pki.certificateFromPem(certificatePem);

    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(tra, 'utf8');
    p7.addCertificate(certificate);
    p7.addSigner({
      key: privateKey,
      certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: new Date() },
      ],
    });
    p7.sign();

    const der = forge.asn1.toDer(p7.toAsn1());
    return forge.util.encode64(der.getBytes());
  }

  private async callWSAA(signedCms: string, isProduction: boolean): Promise<string> {
    const url = isProduction ? WSAA_URL_PROD : WSAA_URL_TEST;
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${signedCms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await axios.post(url, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '',
      },
      timeout: 30000,
    });

    return response.data as string;
  }

  private async parseTicketResponse(xmlResponse: string): Promise<AfipTicket> {
    const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });
    const body =
      parsed['soapenv:Envelope']?.['soapenv:Body'] ??
      parsed['S:Envelope']?.['S:Body'];

    const loginResponse =
      body?.['loginCmsReturn'] ?? body?.['ns2:loginCmsResponse']?.loginCmsReturn;
    const ta = loginResponse?._;

    if (!ta) {
      this.logger.error('WSAA response:', JSON.stringify(parsed));
      throw new Error('No se pudo obtener el Ticket de Acceso de AFIP');
    }

    const taParsed = await parseStringPromise(
      Buffer.from(ta, 'base64').toString('utf8'),
      { explicitArray: false },
    );
    const credentials = taParsed?.loginTicketResponse?.credentials;

    return {
      token: credentials?.token ?? '',
      sign: credentials?.sign ?? '',
      expiry: new Date(taParsed?.loginTicketResponse?.header?.expirationTime ?? Date.now()),
    };
  }
}
