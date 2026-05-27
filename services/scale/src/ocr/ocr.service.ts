// =============================================================================
// GuayCampo - OCR Service
// Argentine license plate recognition using Tesseract.
// =============================================================================
//
// Plate formats:
//   Old format  : ABC 123  (3 letters + 3 digits)
//   Mercosur    : AB 123 CD (2 letters + 3 digits + 2 letters)

import { Injectable, Logger } from '@nestjs/common';
import tesseract from 'node-tesseract-ocr';

export type PlateFormat = 'old' | 'mercosur' | 'unknown';

export interface PlateResult {
  plate: string | null;
  rawText: string;
  confidence: number;
  format: PlateFormat;
  matchedShiftId: string | null;
}

// Common OCR mis-reads in numeric positions
const LETTER_TO_DIGIT: Record<string, string> = {
  O: '0',
  I: '1',
  L: '1',
  S: '5',
  B: '8',
  Z: '2',
  G: '6',
};

// Common OCR mis-reads in letter positions
const DIGIT_TO_LETTER: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '5': 'S',
  '8': 'B',
};

const TESSERACT_CONFIG: tesseract.Config = {
  lang: 'eng',
  oem: 1,      // LSTM engine
  psm: 7,      // Single text line
};

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * Recognize an Argentine license plate from an image buffer.
   * Returns the normalized plate string and confidence level.
   */
  async recognizePlate(imageBuffer: Buffer): Promise<PlateResult> {
    this.logger.debug('Starting OCR plate recognition');

    // Run Tesseract OCR
    let rawText = '';
    let confidence = 0;
    try {
      rawText = await tesseract.recognize(imageBuffer, TESSERACT_CONFIG);
      confidence = 0.5; // node-tesseract-ocr does not expose per-call confidence
    } catch (err) {
      this.logger.warn(`Tesseract error: ${err instanceof Error ? err.message : String(err)}`);
      return {
        plate: null,
        rawText: '',
        confidence: 0,
        format: 'unknown',
        matchedShiftId: null,
      };
    }

    this.logger.debug(`OCR raw text: "${rawText}"`);

    // Normalize and validate
    const normalizedText = this.normalizeOcrText(rawText);
    const candidates = this.generateCandidates(normalizedText);

    for (const candidate of candidates) {
      const format = this.detectFormat(candidate);
      if (format !== 'unknown') {
        this.logger.log(`Plate recognized: ${candidate} (format: ${format})`);
        return {
          plate: candidate,
          rawText,
          confidence,
          format,
          matchedShiftId: null, // Caller should perform shift lookup
        };
      }
    }

    // No valid plate found
    return {
      plate: null,
      rawText,
      confidence: 0,
      format: 'unknown',
      matchedShiftId: null,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private normalizeOcrText(text: string): string {
    return text
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') // strip spaces, hyphens, etc.
      .trim();
  }

  /**
   * Generate OCR correction candidates.
   * E.g. "AB1230D" → try also "AB123OD" (0→O in letter position).
   */
  private generateCandidates(text: string): string[] {
    const candidates: string[] = [text];

    // Old format attempt: ABC123
    if (text.length === 6) {
      const corrected = this.applyOldFormatCorrections(text);
      if (corrected !== text) candidates.push(corrected);
    }

    // Mercosur format attempt: AB123CD
    if (text.length === 7) {
      const corrected = this.applyMercosurFormatCorrections(text);
      if (corrected !== text) candidates.push(corrected);
    }

    return [...new Set(candidates)];
  }

  /**
   * Old format ABC123: positions 0-2 must be letters, 3-5 must be digits.
   */
  private applyOldFormatCorrections(text: string): string {
    const chars = text.split('');
    // Positions 0, 1, 2 → must be letters
    for (let i = 0; i < 3; i++) {
      const c = chars[i];
      if (c && /\d/.test(c) && DIGIT_TO_LETTER[c]) {
        chars[i] = DIGIT_TO_LETTER[c];
      }
    }
    // Positions 3, 4, 5 → must be digits
    for (let i = 3; i < 6; i++) {
      const c = chars[i];
      if (c && /[A-Z]/.test(c) && LETTER_TO_DIGIT[c]) {
        chars[i] = LETTER_TO_DIGIT[c];
      }
    }
    return chars.join('');
  }

  /**
   * Mercosur format AB123CD: positions 0-1 letters, 2-4 digits, 5-6 letters.
   */
  private applyMercosurFormatCorrections(text: string): string {
    const chars = text.split('');
    const letterPositions = [0, 1, 5, 6];
    const digitPositions = [2, 3, 4];

    for (const i of letterPositions) {
      const c = chars[i];
      if (c && /\d/.test(c) && DIGIT_TO_LETTER[c]) {
        chars[i] = DIGIT_TO_LETTER[c];
      }
    }
    for (const i of digitPositions) {
      const c = chars[i];
      if (c && /[A-Z]/.test(c) && LETTER_TO_DIGIT[c]) {
        chars[i] = LETTER_TO_DIGIT[c];
      }
    }
    return chars.join('');
  }

  /**
   * Detect whether a normalized string matches an Argentine plate format.
   */
  detectFormat(text: string): PlateFormat {
    // Old: exactly 3 uppercase letters + 3 digits
    if (/^[A-Z]{3}\d{3}$/.test(text)) return 'old';
    // Mercosur: 2 uppercase letters + 3 digits + 2 uppercase letters
    if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(text)) return 'mercosur';
    return 'unknown';
  }
}
