// =============================================================================
// GuayCampo - Complete Weighing DTOs
// =============================================================================

import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Confirm gross weight (first weighing — loaded truck).
 * Used by POST /tickets/:id/confirm-gross
 */
export class ConfirmGrossWeightDto {
  @ApiProperty({ description: 'Gross weight in kg', example: 28540 })
  @IsNumber()
  @IsPositive()
  grossWeightKg!: number;

  @ApiPropertyOptional({ description: 'Confirmed license plate (overrides OCR result)' })
  @IsOptional()
  @IsString()
  plateConfirmed?: string;

  @ApiPropertyOptional({ description: 'URL to gross weight photo (uploaded externally)' })
  @IsOptional()
  @IsString()
  grossPhotoUrl?: string;

  @ApiPropertyOptional({ description: 'Observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

/**
 * Confirm tare weight (second weighing — empty truck).
 * Used by POST /tickets/:id/confirm-tare
 * Net = Gross - Tare is calculated automatically.
 */
export class ConfirmTareWeightDto {
  @ApiProperty({ description: 'Tare weight in kg', example: 8540 })
  @IsNumber()
  @IsPositive()
  tareWeightKg!: number;

  @ApiPropertyOptional({ description: 'URL to tare weight photo (uploaded externally)' })
  @IsOptional()
  @IsString()
  tarePhotoUrl?: string;

  @ApiPropertyOptional({ description: 'Target silo ID for stock update' })
  @IsOptional()
  @IsString()
  siloId?: string;

  @ApiPropertyOptional({ description: 'Observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

/**
 * Reject a ticket (vehicle rejected at scale).
 * Used by POST /tickets/:id/reject
 */
export class RejectTicketDto {
  @ApiProperty({ description: 'Reason for rejection', example: 'Exceso de humedad' })
  @IsString()
  reason!: string;
}

/**
 * Trigger OCR from a specific device's camera.
 * Used by POST /tickets/ocr
 */
export class OcrCaptureDto {
  @ApiProperty({ description: 'Scale device ID with attached camera', example: 'cuid...' })
  @IsString()
  deviceId!: string;
}
