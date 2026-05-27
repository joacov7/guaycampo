import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AfipAuthService } from './afip-auth.service';
import { AfipBillingService } from './afip-billing.service';
import { AfipCpeService } from './afip-cpe.service';

export interface AfipConfigDto {
  certificate: string;
  privateKey: string;
  cuit: string;
  pointOfSale: number;
  cbu?: string;
  isProduction: boolean;
}

export interface AfipConnectionTestResult {
  success: boolean;
  wsaa: boolean;
  wsfe: boolean;
  wscpe: boolean;
  message: string;
}

@Injectable()
export class AfipService {
  private readonly logger = new Logger(AfipService.name);

  constructor(
    private readonly afipAuthService: AfipAuthService,
    private readonly afipBillingService: AfipBillingService,
    private readonly afipCpeService: AfipCpeService,
    private readonly configService: ConfigService,
  ) {}

  async getConfig(tenantId: string): Promise<AfipConfigDto> {
    const credentials = await this.afipAuthService.getCredentials(tenantId);
    const config = await this.afipBillingService.getTenantAfipConfig(tenantId);

    return {
      certificate: credentials.certificate ? '*** (configurado) ***' : '',
      privateKey: credentials.privateKey ? '*** (configurado) ***' : '',
      cuit: credentials.cuit,
      pointOfSale: config.pointOfSale,
      cbu: config.cbu,
      isProduction: credentials.isProduction,
    };
  }

  async testConnection(tenantId: string): Promise<AfipConnectionTestResult> {
    const result: AfipConnectionTestResult = {
      success: false,
      wsaa: false,
      wsfe: false,
      wscpe: false,
      message: '',
    };

    try {
      await this.afipAuthService.getAccessTicket('wsfe', tenantId);
      result.wsaa = true;
      result.wsfe = true;
    } catch (error) {
      this.logger.warn(`WSAA/WSFE test failed for tenant ${tenantId}:`, error);
      result.message = error instanceof Error ? error.message : String(error);
    }

    try {
      await this.afipAuthService.getAccessTicket('wscpe', tenantId);
      result.wscpe = true;
    } catch (error) {
      this.logger.warn(`WSCPE test failed for tenant ${tenantId}:`, error);
    }

    result.success = result.wsaa && result.wsfe;
    if (result.success) {
      result.message = 'Conexión con AFIP exitosa';
    }

    return result;
  }

  async checkServerStatus(isProduction: boolean): Promise<boolean> {
    const url = isProduction
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL';

    try {
      await axios.get(url, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}
