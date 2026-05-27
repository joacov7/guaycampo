// =============================================================================
// GuayCampo IoT Bridge — OCR Bridge Service
// Captures images from IP cameras (RTSP/HTTP snapshot) and runs local
// Tesseract OCR to extract text (e.g. truck licence plates, ticket numbers).
// Results are forwarded to the scale service via HTTP.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as tesseract from 'node-tesseract-ocr';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface OcrCapture {
  cameraId: string;
  cameraUrl: string;
  text: string;
  confidence: number;
  capturedAt: string;
  imagePath?: string;
}

export interface OcrCameraConfig {
  id: string;
  name: string;
  snapshotUrl: string; // e.g. http://cam/snapshot.jpg or RTSP URL
  username?: string;
  password?: string;
  ocrLang?: string;  // tesseract lang code, e.g. 'eng', 'spa'
  ocrPsm?: number;   // page segmentation mode (default 7 = single text line)
  targetPattern?: string; // regex to extract specific value (e.g. plate number)
}

@Injectable()
export class OcrBridgeService {
  private readonly logger = new Logger(OcrBridgeService.name);
  private readonly cameras = new Map<string, OcrCameraConfig>();

  constructor() {
    this.loadCamerasFromEnv();
  }

  // ---------------------------------------------------------------------------
  // Camera management
  // ---------------------------------------------------------------------------

  registerCamera(config: OcrCameraConfig): void {
    this.cameras.set(config.id, config);
    this.logger.log(`Camera registered: ${config.name} (${config.id})`);
  }

  getCamera(id: string): OcrCameraConfig | undefined {
    return this.cameras.get(id);
  }

  listCameras(): OcrCameraConfig[] {
    return Array.from(this.cameras.values());
  }

  // ---------------------------------------------------------------------------
  // Capture + OCR
  // ---------------------------------------------------------------------------

  /**
   * Capture a snapshot from the camera and run OCR on it.
   * Returns the extracted text and confidence score.
   */
  async capture(cameraId: string): Promise<OcrCapture> {
    const camera = this.cameras.get(cameraId);
    if (!camera) throw new Error(`Camera ${cameraId} not configured`);

    const tmpPath = path.join(os.tmpdir(), `guaycampo-ocr-${cameraId}-${Date.now()}.jpg`);

    try {
      // 1. Fetch snapshot image from camera
      await this.downloadSnapshot(camera, tmpPath);

      // 2. Run Tesseract OCR
      const config: tesseract.Config = {
        lang: camera.ocrLang ?? 'eng',
        oem: 1,  // LSTM neural net
        psm: camera.ocrPsm ?? 7,  // single text line (good for plates/displays)
      };
      const rawText = await tesseract.recognize(tmpPath, config);

      // 3. Clean up and optionally apply regex extraction
      const text = this.extractValue(rawText.trim(), camera.targetPattern);

      this.logger.log(
        `OCR capture from ${camera.name}: "${text}"`,
      );

      return {
        cameraId,
        cameraUrl: camera.snapshotUrl,
        text,
        confidence: 0, // node-tesseract-ocr doesn't expose confidence; extend with raw api if needed
        capturedAt: new Date().toISOString(),
        imagePath: tmpPath,
      };
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  /**
   * Capture and forward the result to the scale service.
   */
  async captureAndForward(
    cameraId: string,
    ticketId: string,
    weighType: 'gross' | 'tare',
  ): Promise<OcrCapture> {
    const result = await this.capture(cameraId);

    const scaleApiUrl = process.env.SCALE_API_URL;
    if (scaleApiUrl && result.text) {
      try {
        await axios.patch(
          `${scaleApiUrl}/api/tickets/${ticketId}`,
          {
            plateDetected: result.text,
            ocrConfidence: result.confidence,
            [`${weighType}PhotoUrl`]: undefined, // would be set by scale service after upload
          },
          { timeout: 5_000 },
        );
        this.logger.log(
          `Forwarded OCR result to scale service: ticket=${ticketId} plate=${result.text}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to forward OCR result: ${msg}`);
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async downloadSnapshot(
    camera: OcrCameraConfig,
    destPath: string,
  ): Promise<void> {
    const auth =
      camera.username && camera.password
        ? { username: camera.username, password: camera.password }
        : undefined;

    const response = await axios.get<ArrayBuffer>(camera.snapshotUrl, {
      responseType: 'arraybuffer',
      auth,
      timeout: 10_000,
    });

    fs.writeFileSync(destPath, Buffer.from(response.data));
  }

  private extractValue(text: string, pattern?: string): string {
    if (!pattern) return text;
    try {
      const match = new RegExp(pattern).exec(text);
      return match ? (match[1] ?? match[0]) : text;
    } catch {
      return text;
    }
  }

  /**
   * Load camera configuration from environment variables.
   * Format: CAMERA_<ID>_URL, CAMERA_<ID>_NAME, CAMERA_<ID>_USER, CAMERA_<ID>_PASS
   * Example: CAMERA_ENTRADA_URL=http://192.168.1.201/snapshot.jpg
   */
  private loadCamerasFromEnv(): void {
    const envKeys = Object.keys(process.env).filter((k) =>
      /^CAMERA_[A-Z0-9_]+_URL$/.test(k),
    );

    for (const key of envKeys) {
      const idMatch = /^CAMERA_([A-Z0-9_]+)_URL$/.exec(key);
      if (!idMatch) continue;

      const rawId = idMatch[1]!;
      const id = rawId.toLowerCase();
      const url = process.env[key]!;
      const name = process.env[`CAMERA_${rawId}_NAME`] ?? id;
      const username = process.env[`CAMERA_${rawId}_USER`];
      const password = process.env[`CAMERA_${rawId}_PASS`];

      this.registerCamera({ id, name, snapshotUrl: url, username, password });
    }
  }
}
