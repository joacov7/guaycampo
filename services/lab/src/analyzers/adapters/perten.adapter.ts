// =============================================================================
// PertenAdapter — Integración con analizadores NIRS Perten DA7250/DA9500
// =============================================================================
// Los equipos Perten envían datos por:
//   1. Puerto serial RS-232 (legacy — DA7000/DA7200)
//   2. TCP/IP (DA7250/DA9500 — modelos modernos)
//   3. Archivo CSV en carpeta compartida (integración básica)
//
// Protocolo serial/TCP: el analizador envía string ASCII con valores separados por coma
//   Ejemplo: "SOJA,13.2,34.5,18.1,0.8,2.1\r\n"
//   Orden:    cultivo, humedad, proteína, aceite, granos_dañados, extrañas
//
// Protocolo archivo CSV: un archivo por análisis con encabezados en primera línea
// =============================================================================

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import type { AnalyzerAdapter, AnalyzerConfig, RawAnalyzerData } from '../analyzers.types';
import type { LabSampleInput } from '../../quality/quality.types';

export class PertenAdapter implements AnalyzerAdapter {
  private readonly logger = new Logger(PertenAdapter.name);
  readonly name = 'Perten DA7250/DA9500';

  // -------------------------------------------------------------------------
  // connect — verificar conectividad con el equipo
  // -------------------------------------------------------------------------
  async connect(config: AnalyzerConfig): Promise<void> {
    if (config.connectionType === 'tcp' && config.host && config.port) {
      await this.testTcpConnection(config.host, config.port, config.timeout ?? 5000);
      this.logger.log(`[Perten] TCP connected to ${config.host}:${config.port}`);
    } else if (config.connectionType === 'file' && config.watchPath) {
      if (!fs.existsSync(config.watchPath)) {
        throw new Error(`[Perten] Watch path does not exist: ${config.watchPath}`);
      }
      this.logger.log(`[Perten] File watch path ready: ${config.watchPath}`);
    } else {
      throw new Error('[Perten] Invalid configuration: requires tcp (host+port) or file (watchPath)');
    }
  }

  // -------------------------------------------------------------------------
  // readLastSample — leer la última muestra procesada por el equipo
  // -------------------------------------------------------------------------
  async readLastSample(config: AnalyzerConfig): Promise<RawAnalyzerData> {
    if (config.connectionType === 'tcp' && config.host && config.port) {
      const raw = await this.readViaTcp(config.host, config.port, config.timeout ?? 5000);
      return {
        raw,
        source: 'perten-tcp',
        receivedAt: new Date().toISOString(),
      };
    }

    if (config.connectionType === 'file' && config.watchPath) {
      const raw = await this.readLatestFile(config.watchPath);
      return {
        raw,
        source: 'perten-file',
        receivedAt: new Date().toISOString(),
      };
    }

    throw new Error('[Perten] No valid connection type configured');
  }

  // -------------------------------------------------------------------------
  // parseData — parsear string crudo del Perten a valores de muestra
  // Formato CSV: cultivo,humedad,proteina,aceite,daniados,extranas
  // -------------------------------------------------------------------------
  parseData(rawData: string, _commodity: string): Partial<LabSampleInput> {
    const line = rawData.trim().replace(/\r\n?$/, '');

    // Formato con encabezados (archivo CSV con header)
    if (line.includes('\n')) {
      return this.parseCsvWithHeaders(line);
    }

    // Formato simple una línea: SOJA,13.2,34.5,18.1,0.8,2.1
    const parts = line.split(',');
    if (parts.length < 2) {
      throw new Error(`[Perten] Cannot parse data: "${rawData}"`);
    }

    // El primer campo puede ser el código de cultivo (skip) o un valor numérico
    const startIdx = isNaN(Number(parts[0])) ? 1 : 0;

    return {
      humidity: this.parseField(parts[startIdx]),
      protein: this.parseField(parts[startIdx + 1]),
      oil: this.parseField(parts[startIdx + 2]),
      damagedGrains: this.parseField(parts[startIdx + 3]),
      foreignMatter: this.parseField(parts[startIdx + 4]),
    };
  }

  // -------------------------------------------------------------------------
  // Métodos privados
  // -------------------------------------------------------------------------

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

      socket.setTimeout(timeout);
      socket.connect(port, host, () => {
        // El Perten envía el último resultado al conectarse; no necesita solicitud
      });

      socket.on('data', (chunk: Buffer) => {
        data += chunk.toString('ascii');
        if (data.includes('\n')) {
          socket.destroy();
          resolve(data.trim());
        }
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Read timeout from ${host}:${port}`));
      });
    });
  }

  private async readLatestFile(watchPath: string): Promise<string> {
    const files = fs
      .readdirSync(watchPath)
      .filter((f) => f.endsWith('.csv') || f.endsWith('.txt'))
      .map((f) => ({
        name: f,
        mtime: fs.statSync(path.join(watchPath, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (!files.length) {
      throw new Error(`[Perten] No result files found in ${watchPath}`);
    }

    const latest = path.join(watchPath, files[0].name);
    return fs.readFileSync(latest, 'utf-8');
  }

  private parseCsvWithHeaders(csv: string): Partial<LabSampleInput> {
    const lines = csv.split('\n').filter((l) => l.trim());
    if (lines.length < 2) throw new Error('[Perten] CSV must have header + data row');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const values = lines[lines.length - 1].split(',');

    const result: Partial<LabSampleInput> = {};
    const fieldMap: Record<string, keyof LabSampleInput> = {
      moisture: 'humidity',
      humidity: 'humidity',
      humedad: 'humidity',
      protein: 'protein',
      'crude protein': 'protein',
      proteina: 'protein',
      oil: 'oil',
      'crude fat': 'oil',
      fat: 'oil',
      aceite: 'oil',
      foreign: 'foreignMatter',
      'foreign matter': 'foreignMatter',
      damaged: 'damagedGrains',
      'damaged grains': 'damagedGrains',
      broken: 'brokenGrains',
      'broken grains': 'brokenGrains',
    };

    for (let i = 0; i < headers.length; i++) {
      const key = fieldMap[headers[i]];
      if (key && values[i] !== undefined) {
        const val = this.parseField(values[i]);
        if (val !== undefined) (result as Record<string, number>)[key] = val;
      }
    }

    return result;
  }

  private parseField(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const n = parseFloat(value.trim().replace(',', '.'));
    return isNaN(n) ? undefined : n;
  }
}
