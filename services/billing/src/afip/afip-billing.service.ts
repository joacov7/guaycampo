import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { format } from 'date-fns';
import { AfipAuthService } from './afip-auth.service';

export interface InvoiceData {
  type: string;
  clientCuit: string;
  subtotal: number;
  ivaAmount: number;
  total: number;
  items?: Array<{ description: string; quantity: number; unitPrice: number; ivaRate?: number }>;
  notes?: string;
}

export interface AfipInvoiceResult {
  cae: string;
  caeVto: string;
  numeroComprobante: number;
  puntoVenta: number;
}

export interface TenantAfipConfig {
  cuit: string;
  pointOfSale: number;
  cbu?: string;
  isProduction: boolean;
}

const AFIP_WSFE_URL_PROD = 'https://servicios1.afip.gov.ar/wsfev1/service.asmx';
const AFIP_WSFE_URL_TEST = 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';

@Injectable()
export class AfipBillingService {
  private readonly logger = new Logger(AfipBillingService.name);

  constructor(
    private readonly afipAuthService: AfipAuthService,
    private readonly configService: ConfigService,
  ) {}

  async emitirFactura(invoice: InvoiceData, tenantId: string): Promise<AfipInvoiceResult> {
    const ticket = await this.afipAuthService.getAccessTicket('wsfe', tenantId);
    const config = await this.getTenantAfipConfig(tenantId);

    const tipoComprobante = this.getComprobanteTipo(invoice.type);
    const lastNumber = await this.getLastVoucher(
      config.cuit,
      config.pointOfSale,
      tipoComprobante,
      ticket,
      config.isProduction,
    );
    const nextNumber = lastNumber + 1;

    const requestBody = this.buildFECAESolicitarRequest({
      token: ticket.token,
      sign: ticket.sign,
      cuit: config.cuit,
      tipo: tipoComprobante,
      puntoVenta: config.pointOfSale,
      numero: nextNumber,
      docNro: invoice.clientCuit.replace(/-/g, ''),
      impTotal: invoice.total.toFixed(2),
      impNeto: invoice.subtotal.toFixed(2),
      impIVA: invoice.ivaAmount.toFixed(2),
      opcionales: invoice.type.startsWith('FC-E') && config.cbu
        ? [{ id: '27', valor: config.cbu }]
        : undefined,
    });

    const response = await this.callWSFE('FECAESolicitar', requestBody, config.isProduction);
    const result = await this.parseCAEResponse(response);

    if (result.resultado !== 'A') {
      const errores = result.errores?.join('; ') ?? 'Error desconocido AFIP';
      throw new BadRequestException(`AFIP rechazó la solicitud: ${errores}`);
    }

    return {
      cae: result.cae,
      caeVto: result.caeVto,
      numeroComprobante: nextNumber,
      puntoVenta: config.pointOfSale,
    };
  }

  async consultarComprobante(
    tipo: number,
    puntoVenta: number,
    numero: number,
    tenantId: string,
  ): Promise<Record<string, unknown>> {
    const ticket = await this.afipAuthService.getAccessTicket('wsfe', tenantId);
    const config = await this.getTenantAfipConfig(tenantId);

    const requestBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Body>
    <ar:FECompConsultar>
      <ar:Auth>
        <ar:Token>${ticket.token}</ar:Token>
        <ar:Sign>${ticket.sign}</ar:Sign>
        <ar:Cuit>${config.cuit}</ar:Cuit>
      </ar:Auth>
      <ar:FeCompConsReq>
        <ar:CbteTipo>${tipo}</ar:CbteTipo>
        <ar:PtoVta>${puntoVenta}</ar:PtoVta>
        <ar:CbteNro>${numero}</ar:CbteNro>
      </ar:FeCompConsReq>
    </ar:FECompConsultar>
  </soap:Body>
</soap:Envelope>`;

    const response = await this.callWSFE('FECompConsultar', requestBody, config.isProduction);
    const parsed = await parseStringPromise(response, { explicitArray: false });
    return parsed as Record<string, unknown>;
  }

  async anularFactura(invoiceId: string, tenantId: string): Promise<AfipInvoiceResult> {
    // AFIP does not allow invoice cancellation; a credit note must be emitted
    // This method should receive original invoice data and call emitirFactura with NC type
    this.logger.warn(`Anulación solicitada para factura ${invoiceId} — emitir nota de crédito`);
    throw new BadRequestException(
      'AFIP no permite anular facturas. Debe emitir una Nota de Crédito.',
    );
  }

  async getTenantAfipConfig(tenantId: string): Promise<TenantAfipConfig> {
    const credentials = await this.afipAuthService.getCredentials(tenantId);
    return {
      cuit: credentials.cuit,
      pointOfSale: parseInt(
        this.configService.get<string>('AFIP_PUNTO_VENTA') ?? '1',
        10,
      ),
      cbu: this.configService.get<string>('AFIP_CBU'),
      isProduction: credentials.isProduction,
    };
  }

  private getComprobanteTipo(type: string): number {
    const tipos: Record<string, number> = {
      'FC-A': 1,
      'ND-A': 2,
      'NC-A': 3,
      'FC-B': 6,
      'ND-B': 7,
      'NC-B': 8,
      'FC-C': 11,
      'ND-C': 12,
      'NC-C': 13,
      'FC-E-A': 201,
      'FC-E-B': 206,
    };
    return tipos[type] ?? 6;
  }

  private async getLastVoucher(
    cuit: string,
    puntoVenta: number,
    tipo: number,
    ticket: { token: string; sign: string },
    isProduction: boolean,
  ): Promise<number> {
    const requestBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>
        <ar:Token>${ticket.token}</ar:Token>
        <ar:Sign>${ticket.sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>${puntoVenta}</ar:PtoVta>
      <ar:CbteTipo>${tipo}</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soap:Body>
</soap:Envelope>`;

    const response = await this.callWSFE(
      'FECompUltimoAutorizado',
      requestBody,
      isProduction,
    );
    const parsed = await parseStringPromise(response, { explicitArray: false });
    const body =
      parsed['soap:Envelope']?.['soap:Body'] ??
      parsed['S:Envelope']?.['S:Body'];

    const result =
      body?.FECompUltimoAutorizadoResponse?.FECompUltimoAutorizadoResult;
    return parseInt(result?.CbteNro ?? '0', 10);
  }

  private buildFECAESolicitarRequest(params: {
    token: string;
    sign: string;
    cuit: string;
    tipo: number;
    puntoVenta: number;
    numero: number;
    docNro: string;
    impTotal: string;
    impNeto: string;
    impIVA: string;
    opcionales?: Array<{ id: string; valor: string }>;
  }): string {
    const fechaEmision = format(new Date(), 'yyyyMMdd');

    const opcionalesXml = params.opcionales
      ? `<ar:Opcionales>
        ${params.opcionales
          .map(
            (o) =>
              `<ar:Opcional><ar:Id>${o.id}</ar:Id><ar:Valor>${o.valor}</ar:Valor></ar:Opcional>`,
          )
          .join('')}
      </ar:Opcionales>`
      : '';

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Body>
    <ar:FECAESolicitar>
      <ar:Auth>
        <ar:Token>${params.token}</ar:Token>
        <ar:Sign>${params.sign}</ar:Sign>
        <ar:Cuit>${params.cuit}</ar:Cuit>
      </ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${params.puntoVenta}</ar:PtoVta>
          <ar:CbteTipo>${params.tipo}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetReq>
            <ar:Concepto>1</ar:Concepto>
            <ar:DocTipo>80</ar:DocTipo>
            <ar:DocNro>${params.docNro}</ar:DocNro>
            <ar:CbteDesde>${params.numero}</ar:CbteDesde>
            <ar:CbteHasta>${params.numero}</ar:CbteHasta>
            <ar:CbteFch>${fechaEmision}</ar:CbteFch>
            <ar:ImpTotal>${params.impTotal}</ar:ImpTotal>
            <ar:ImpTotConc>0.00</ar:ImpTotConc>
            <ar:ImpNeto>${params.impNeto}</ar:ImpNeto>
            <ar:ImpOpEx>0.00</ar:ImpOpEx>
            <ar:ImpTrib>0.00</ar:ImpTrib>
            <ar:ImpIVA>${params.impIVA}</ar:ImpIVA>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1.00</ar:MonCotiz>
            <ar:Iva>
              <ar:AlicIva>
                <ar:Id>5</ar:Id>
                <ar:BaseImp>${params.impNeto}</ar:BaseImp>
                <ar:Importe>${params.impIVA}</ar:Importe>
              </ar:AlicIva>
            </ar:Iva>
            ${opcionalesXml}
          </ar:FECAEDetReq>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soap:Body>
</soap:Envelope>`;
  }

  private async callWSFE(
    action: string,
    body: string,
    isProduction: boolean,
  ): Promise<string> {
    const url = isProduction ? AFIP_WSFE_URL_PROD : AFIP_WSFE_URL_TEST;

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: `http://ar.gov.afip.dif.FEV1/${action}`,
        },
        timeout: 30000,
      });
      return response.data as string;
    } catch (error) {
      this.logger.error(`WSFE ${action} error:`, error);
      throw new InternalServerErrorException(`Error comunicando con AFIP WSFE: ${action}`);
    }
  }

  private async parseCAEResponse(xmlResponse: string): Promise<{
    resultado: string;
    cae: string;
    caeVto: string;
    errores?: string[];
    observaciones?: string[];
  }> {
    const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });
    const body =
      parsed['soap:Envelope']?.['soap:Body'] ??
      parsed['S:Envelope']?.['S:Body'];

    const result =
      body?.FECAESolicitarResponse?.FECAESolicitarResult;
    const detResp = result?.FeDetResp?.FECAEDetResponse;

    const erroresArr = result?.Errors?.Err;
    const errores = erroresArr
      ? (Array.isArray(erroresArr) ? erroresArr : [erroresArr]).map(
          (e: { Msg: string }) => e.Msg,
        )
      : undefined;

    const obsArr = detResp?.Observaciones?.Obs;
    const observaciones = obsArr
      ? (Array.isArray(obsArr) ? obsArr : [obsArr]).map(
          (o: { Msg: string }) => o.Msg,
        )
      : undefined;

    return {
      resultado: detResp?.Resultado ?? 'R',
      cae: detResp?.CAE ?? '',
      caeVto: detResp?.CAEFchVto ?? '',
      errores,
      observaciones,
    };
  }
}
