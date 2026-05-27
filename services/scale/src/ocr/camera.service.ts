// =============================================================================
// GuayCampo - Camera Service
// Captures frames from IP cameras via HTTP snapshot or RTSP stream.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { spawn } from 'child_process';

export interface CameraConfig {
  type: 'http_snapshot' | 'rtsp';
  /** For http_snapshot: full URL, e.g. http://192.168.1.50/cgi-bin/snapshot.cgi */
  snapshotUrl?: string;
  /** For rtsp: full RTSP URL */
  rtspUrl?: string;
  username?: string;
  password?: string;
  timeoutMs?: number;
}

@Injectable()
export class CameraService {
  private readonly logger = new Logger(CameraService.name);

  /**
   * Capture a single JPEG frame from the configured camera.
   * Returns a Buffer containing JPEG image data.
   */
  async captureFrame(cameraConfig: CameraConfig): Promise<Buffer> {
    if (cameraConfig.type === 'http_snapshot') {
      return this.captureHttpSnapshot(cameraConfig);
    }
    if (cameraConfig.type === 'rtsp') {
      return this.captureRtspFrame(cameraConfig.rtspUrl ?? '');
    }
    throw new Error(`Unsupported camera type: ${cameraConfig.type}`);
  }

  // ---------------------------------------------------------------------------
  // HTTP Snapshot (Hikvision, Dahua, Axis, etc.)
  // ---------------------------------------------------------------------------

  private async captureHttpSnapshot(config: CameraConfig): Promise<Buffer> {
    if (!config.snapshotUrl) {
      throw new Error('snapshotUrl is required for http_snapshot cameras');
    }

    const timeoutMs = config.timeoutMs ?? 5000;
    this.logger.debug(`Fetching HTTP snapshot from ${config.snapshotUrl}`);

    const response = await axios.get<ArrayBuffer>(config.snapshotUrl, {
      ...(config.username && config.password
        ? { auth: { username: config.username, password: config.password } }
        : {}),
      responseType: 'arraybuffer',
      timeout: timeoutMs,
    });

    const buf = Buffer.from(response.data);
    this.logger.debug(`HTTP snapshot captured: ${buf.length} bytes`);
    return buf;
  }

  // ---------------------------------------------------------------------------
  // RTSP via ffmpeg (single frame extraction)
  // ---------------------------------------------------------------------------

  private captureRtspFrame(rtspUrl: string): Promise<Buffer> {
    if (!rtspUrl) {
      throw new Error('rtspUrl is required for rtsp cameras');
    }

    return new Promise<Buffer>((resolve, reject) => {
      this.logger.debug(`Capturing RTSP frame from ${rtspUrl}`);
      const chunks: Buffer[] = [];

      const proc = spawn('ffmpeg', [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-frames:v', '1',
        '-q:v', '2',   // quality 1-31, lower is better
        '-f', 'image2',
        'pipe:1',
      ], { stdio: ['ignore', 'pipe', 'ignore'] });

      proc.stdout.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      proc.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          const frame = Buffer.concat(chunks);
          this.logger.debug(`RTSP frame captured: ${frame.length} bytes`);
          resolve(frame);
        } else {
          reject(new Error(`ffmpeg exited with code ${String(code)} — no frame captured`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`ffmpeg spawn error: ${err.message}`));
      });

      // Kill ffmpeg if it hangs
      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('ffmpeg timed out capturing RTSP frame'));
      }, 10_000);

      proc.on('close', () => clearTimeout(timeout));
    });
  }
}
