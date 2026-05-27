// =============================================================================
// FossAdapter — Integración con analizadores NIRS FOSS Infratec
// =============================================================================
// Los equipos FOSS Infratec (1241, 1229, Nova) se integran via:
//   1. Archivo de resultados (*.txt o *.res) en directorio compartido
//   2. TCP/IP (modelos con opción de red)
//   3. FOSS Connect software (API propietaria — no implementada aquí)
//
// Formato archivo FOSS Infratec:
//   Line 1: número de muestra y timestamp
//   Line 2+: PARÁMETRO  VALOR  UNIDAD
//   Ejemplo:
//     Sample: 001  12/01/2025 14:32:11
//     Moisture     13.20  %
//     Protein      34.80  %
//     Oil          18.50  %
//     Starch       25.10  %
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { Logger } from '@nestjs/common';
import type { AnalyzerAdapter, AnalyzerConfig, RawAnalyzerData } from '../analyzers.types';
import type { LabSampleInput } from '../../quality/quality.types';

export class FossAdapter implements AnalyzerAdapter {
  private readonly logger = new Logger(FossAdapter.name);
  readonly name = 'FOSS Infratec';

  async connect(config: AnalyzerConfig): Promise<void> {
    if (config.connectionType === 'tcp' && config.host && config.port) {
      await this.testTcpConnection(config.host, config.port, config.timeout ?? 5000);
      this.logger.log(`[FOSS] TCP connected to ${config.host}:${config.port}`);
    } else if (config.connectionType === 'file' && config.watchPath) {
      if (!fs.existsSync(config.watchPath)) {
        throw new Error(`[FOSS] Watch path does not exist: ${config.watchPath}`);
      }
      this.logger.log(`[FOSS] File watch path ready: ${config.watchPath}`);
    } else {
      throw new Error('[FOSS] Invalid configuration: requires tcp or file');
    }
  }

  async readLastSample(config: AnalyzerConfig): Promise<RawAnalyzerData> {
    let raw: string;

    if (config.connectionType === 'tcp' && config.host && config.port) {
      raw = await this.readViaTcp(config.host, config.port, config.timeout ?? 5000);
      return { raw, source: 'foss-tcp', receivedAt: new Date().toISOString() };
    }

    if (config.connectionType === 'file' && config.watchPath) {
      raw = await this.readLatestFile(config.watchPath);
      return { raw, source: 'foss-file', receivedAt: new Date().toISOString() };
    }

    throw new Error('[FOSS] No valid connection type configured');
  }

  /**
   * Parsear formato propietario FOSS Infratec
   * Soporta tanto el formato multi-línea como CSV exportado
   */
  parseData(rawData: string, _commodity: string): Partial<LabSampleInput> {
    const lines = rawData
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (!lines.length) throw new Error('[FOSS] Empty data');

    // Detectar formato CSV (primera línea tiene comas)
    if (lines[0].includes(',')) {
      return this.parseCsvFormat(lines);
    }

    // Formato multi-línea FOSS
    return this.parseMultiLineFormat(lines);
  }

  // -------------------------------------------------------------------------
  // Helpers privados
  // -------------------------------------------------------------------------

  private parseMultiLineFormat(lines: string[]): Partial<LabSampleInput> {
    const result: Partial<LabSampleInput> = {};

    // Mapeo de nombres FOSS → campos LabSampleInput
    const fieldMap: Record<string, keyof LabSampleInput> = {
      moisture: 'humidity',
      'water content': 'humidity',
      humidity: 'humidity',
      protein: 'protein',
      'crude protein': 'protein',
      'raw protein': 'protein',
      oil: 'oil',
      fat: 'oil',
      'crude fat': 'oil',
      'oil content': 'oil',
      gluten: 'gluten',
      'wet gluten': 'gluten',
      'falling number': 'fallingNumber',
      fn: 'fallingNumber',
      'test weight': 'testWeight',
      'hectoliter weight': 'testWeight',
      'hl weight': 'testWeight',
    };

    for (const line of lines) {
      // Saltar líneas de encabezado/metadata
      if (line.startsWith('Sample:') || line.startsWith('Date:') || line.startsWith('ID:')) {
        continue;
      }

      // Parsear "PARAMETRO  VALOR  UNIDAD" o "PARAMETRO: VALOR"
      const match =
        line.match(/^([A-Za-z][A-Za-z\s/]+?)\s{2,}([\d.,]+)/) ??
        line.match(/^([A-Za-z][A-Za-z\s/]+?):\s*([\d.,]+)/);

      if (match) {
        const paramName = match[1].trim().toLowerCase();
        const value = parseFloat(match[2].replace(',', '.'));

        const field = fieldMap[paramName];
        if (field && !isNaN(value)) {
          (result as Record<string, number>)[field] = value;
        }
      }
    }

    return result;
  }

  private parseCsvFormat(lines: string[]): Partial<LabSampleInput> {
    if (lines.length < 2) return {};

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const values = lines[lines.length - 1].split(',');

    const result: Partial<LabSampleInput> = {};
    const fieldMap: Record<string, keyof LabSampleInput> = {
      moisture: 'humidity',
      humidity: 'humidity',
      protein: 'protein',
      oil: 'oil',
      fat: 'oil',
      gluten: 'gluten',
      fn: 'fallingNumber',
      'test weight': 'testWeight',
    };

    for (let i = 0; i < headers.length; i++) {
      const key = fieldMap[headers[i]];
      if (key && values[i]) {
        const val = parseFloat(values[i].trim().replace(',', '.'));
        if (!isNaN(val)) (result as Record<string, number>)[key] = val;
      }
    }

    return result;
  }

  private async testTcpConnection(host: string, port: number, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.connect(port, host, () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', (err) => reject(err));
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Connection timeout to ${host}:${port}`));
      });
    });
  }

  private readViaTcp(host: string, port: number, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let data = '';
      let timer: NodeJS.Timeout;

      socket.setTimeout(timeout);
      socket.connect(port, host);

      socket.on('data', (chunk: Buffer) => {
        data += chunk.toString('utf-8');
        // FOSS envía datos hasta una línea en blanco (doble \n)
        if (data.includes('\n\n')) {
          clearTimeout(timer);
          socket.destroy();
          resolve(data.trim());
        }
      });

      // Timeout alternativo para terminar si no hay doble newline
      timer = setTimeout(() => {
        socket.destroy();
        if (data.trim().length > 0) resolve(data.trim());
        else reject(new Error(`Read timeout from FOSS at ${host}:${port}`));
      }, timeout);

      socket.on('error', (err) => {
        clearTimeout(timer);
        socket.destroy();
        reject(err);
      });
    });
  }

  private async readLatestFile(watchPath: string): Promise<string> {
    const extensions = ['.txt', '.res', '.csv', '.dat'];
    const files = fs
      .readdirSync(watchPath)
      .filter((f) => extensions.some((ext) => f.toLowerCase().endsWith(ext)))
      .map((f) => ({
        name: f,
        mtime: fs.statSync(path.join(watchPath, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (!files.length) {
      throw new Error(`[FOSS] No result files found in ${watchPath}`);
    }

    const latest = path.join(watchPath, files[0].name);
    return fs.readFileSync(latest, 'utf-8');
  }
}
