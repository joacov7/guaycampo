import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { AfipAuthService } from './afip-auth.service';
import type { SolicitarCpeDto } from './dto/confirm-cpe.dto';

export interface CpeResult {
  nroCPE: string;
  estado: string;
  fechaEmision: string;
}

export interface CpeStatus {
  nroCPE: string;
  estado: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  pesoEstimado?: number;
  pesoDescargado?: number;
}

const WSCPE_URL_PROD = 'https://serviciosjava.afip.gob.ar/wscpe/services/wscpe';
const WSCPE_URL_TEST = 'https://fwshomo.afip.gov.ar/wscpe/services/wscpe';

@Injectable()
export class AfipCpeService {
  private readonly logger = new Logger(AfipCpeService.name);

  constructor(
    private readonly afipAuthService: AfipAuthService,
    private readonly configService: ConfigService,
  ) {}

  async solicitarCPE(data: SolicitarCpeDto, tenantId: string): Promise<CpeResult> {
    const ticket = await this.afipAuthService.getAccessTicket('wscpe', tenantId);
    const credentials = await this.afipAuthService.getCredentials(tenantId);

    const requestBody = this.buildSolicitarCPERequest({
      token: ticket.token,
      sign: ticket.sign,
      cuitEmisor: credentials.cuit,
      tipoCPE: data.cpeType,
      cuitTransportista: data.transportCuit,
      dominioCamion: data.plate,
      dominioAcoplado: data.plateTrailer,
      codigoGrano: data.commodityCode,
      cosecha: data.harvest,
      pesoEstimado: data.estimatedWeightKg,
      cuitOrigen: data.originCuit,
      localidadOrigen: data.originLocality,
      provinciaOrigen: data.originProvince,
      cuitDestino: data.destinationCuit,
      localidadDestino: data.destinationLocality,
      provinciaDestino: data.destinationProvince,
    });

    const response = await this.callWSCPE(
      'solicitarCPEAutomotor',
      requestBody,
      credentials.isProduction,
    );
    const result = await this.parseCPEResponse(response, 'solicitarCPEAutomotorReturn');

    if (!result.nroCPE) {
      throw new InternalServerErrorException('AFIP no retornó número de CPE');
    }

    return {
      nroCPE: result.nroCPE,
      estado: result.estado ?? 'AC',
      fechaEmision: result.fechaEmision ?? new Date().toISOString().split('T')[0],
    };
  }

  async confirmarArribo(
    cpeNumber: string,
    pesoReal: number,
    tenantId: string,
  ): Promise<void> {
    const ticket = await this.afipAuthService.getAccessTicket('wscpe', tenantId);
    const credentials = await this.afipAuthService.getCredentials(tenantId);

    const requestBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:cpe="http://cpe.service.afip.gov.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <cpe:confirmarArriboCPE>
      <cpe:auth>
        <cpe:token>${ticket.token}</cpe:token>
        <cpe:sign>${ticket.sign}</cpe:sign>
        <cpe:cuitRepresentada>${credentials.cuit}</cpe:cuitRepresentada>
      </cpe:auth>
      <cpe:nroCPE>${cpeNumber}</cpe:nroCPE>
      <cpe:pesoDescargado>${pesoReal}</cpe:pesoDescargado>
      <cpe:cantidadHoras>0</cpe:cantidadHoras>
    </cpe:confirmarArriboCPE>
  </soapenv:Body>
</soapenv:Envelope>`;

    await this.callWSCPE('confirmarArriboCPE', requestBody, credentials.isProduction);
    this.logger.log(`CPE ${cpeNumber} arribo confirmado, peso real: ${pesoReal} kg`);
  }

  async anularCPE(cpeNumber: string, motivo: string, tenantId: string): Promise<void> {
    const ticket = await this.afipAuthService.getAccessTicket('wscpe', tenantId);
    const credentials = await this.afipAuthService.getCredentials(tenantId);

    const requestBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:cpe="http://cpe.service.afip.gov.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <cpe:anularCPE>
      <cpe:auth>
        <cpe:token>${ticket.token}</cpe:token>
        <cpe:sign>${ticket.sign}</cpe:sign>
        <cpe:cuitRepresentada>${credentials.cuit}</cpe:cuitRepresentada>
      </cpe:auth>
      <cpe:nroCPE>${cpeNumber}</cpe:nroCPE>
      <cpe:motivo>${motivo}</cpe:motivo>
    </cpe:anularCPE>
  </soapenv:Body>
</soapenv:Envelope>`;

    await this.callWSCPE('anularCPE', requestBody, credentials.isProduction);
    this.logger.log(`CPE ${cpeNumber} anulada. Motivo: ${motivo}`);
  }

  async consultarCPE(cpeNumber: string, tenantId: string): Promise<CpeStatus> {
    const ticket = await this.afipAuthService.getAccessTicket('wscpe', tenantId);
    const credentials = await this.afipAuthService.getCredentials(tenantId);

    const requestBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:cpe="http://cpe.service.afip.gov.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <cpe:consultarCPE>
      <cpe:auth>
        <cpe:token>${ticket.token}</cpe:token>
        <cpe:sign>${ticket.sign}</cpe:sign>
        <cpe:cuitRepresentada>${credentials.cuit}</cpe:cuitRepresentada>
      </cpe:auth>
      <cpe:nroCPE>${cpeNumber}</cpe:nroCPE>
    </cpe:consultarCPE>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await this.callWSCPE('consultarCPE', requestBody, credentials.isProduction);
    const result = await this.parseCPEResponse(response, 'consultarCPEReturn');

    if (!result.nroCPE) {
      throw new NotFoundException(`CPE ${cpeNumber} no encontrada en AFIP`);
    }

    return {
      nroCPE: result.nroCPE,
      estado: result.estado,
      fechaEmision: result.fechaEmision,
      fechaVencimiento: result.fechaVencimiento,
      pesoEstimado: result.pesoEstimado ? Number(result.pesoEstimado) : undefined,
      pesoDescargado: result.pesoDescargado ? Number(result.pesoDescargado) : undefined,
    };
  }

  private buildSolicitarCPERequest(params: {
    token: string;
    sign: string;
    cuitEmisor: string;
    tipoCPE: string;
    cuitTransportista: string;
    dominioCamion: string;
    dominioAcoplado?: string;
    codigoGrano: number;
    cosecha: string;
    pesoEstimado: number;
    cuitOrigen: string;
    localidadOrigen: string;
    provinciaOrigen: string;
    cuitDestino: string;
    localidadDestino: string;
    provinciaDestino: string;
  }): string {
    const acoplado = params.dominioAcoplado
      ? `<cpe:dominioAcoplado>${params.dominioAcoplado}</cpe:dominioAcoplado>`
      : '';

    return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:cpe="http://cpe.service.afip.gov.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <cpe:solicitarCPEAutomotor>
      <cpe:auth>
        <cpe:token>${params.token}</cpe:token>
        <cpe:sign>${params.sign}</cpe:sign>
        <cpe:cuitRepresentada>${params.cuitEmisor}</cpe:cuitRepresentada>
      </cpe:auth>
      <cpe:tipoCPE>${params.tipoCPE}</cpe:tipoCPE>
      <cpe:datosCamion>
        <cpe:cuitTransportista>${params.cuitTransportista}</cpe:cuitTransportista>
        <cpe:dominioCamion>${params.dominioCamion}</cpe:dominioCamion>
        ${acoplado}
      </cpe:datosCamion>
      <cpe:datosCarga>
        <cpe:codigoGrano>${params.codigoGrano}</cpe:codigoGrano>
        <cpe:cosecha>${params.cosecha}</cpe:cosecha>
        <cpe:pesoEstimado>${params.pesoEstimado}</cpe:pesoEstimado>
      </cpe:datosCarga>
      <cpe:datosOrigen>
        <cpe:cuitOrigen>${params.cuitOrigen}</cpe:cuitOrigen>
        <cpe:localidadOrigen>${params.localidadOrigen}</cpe:localidadOrigen>
        <cpe:provinciaOrigen>${params.provinciaOrigen}</cpe:provinciaOrigen>
      </cpe:datosOrigen>
      <cpe:datosDestino>
        <cpe:cuitDestino>${params.cuitDestino}</cpe:cuitDestino>
        <cpe:localidadDestino>${params.localidadDestino}</cpe:localidadDestino>
        <cpe:provinciaDestino>${params.provinciaDestino}</cpe:provinciaDestino>
      </cpe:datosDestino>
    </cpe:solicitarCPEAutomotor>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private async callWSCPE(
    action: string,
    body: string,
    isProduction: boolean,
  ): Promise<string> {
    const url = isProduction ? WSCPE_URL_PROD : WSCPE_URL_TEST;

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: action,
        },
        timeout: 30000,
      });
      return response.data as string;
    } catch (error) {
      this.logger.error(`WSCPE ${action} error:`, error);
      throw new InternalServerErrorException(`Error comunicando con AFIP WSCPE: ${action}`);
    }
  }

  private async parseCPEResponse(
    xmlResponse: string,
    returnKey: string,
  ): Promise<Record<string, string>> {
    const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });
    const body =
      parsed['soapenv:Envelope']?.['soapenv:Body'] ??
      parsed['S:Envelope']?.['S:Body'];

    const returnObj = body?.[returnKey] ?? {};
    // Flatten single-level XML into plain object
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(returnObj)) {
      if (typeof value === 'string' || typeof value === 'number') {
        result[key] = String(value);
      }
    }
    return result;
  }
}
