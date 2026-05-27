// =============================================================================
// GuayCampo - Create / Start Entry DTO
// =============================================================================

import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for starting a new weighing entry (POST /tickets/start-entry).
 */
export class StartEntryDto {
  @ApiProperty({ description: 'Vehicle ID', example: 'cuid...' })
  @IsString()
  vehicleId!: string;

  @ApiProperty({ description: 'Driver ID', example: 'cuid...' })
  @IsString()
  driverId!: string;

  @ApiProperty({ description: 'Client ID', example: 'cuid...' })
  @IsString()
  clientId!: string;

  @ApiProperty({ description: 'Commodity ID', example: 'cuid...' })
  @IsString()
  commodityId!: string;

  @ApiPropertyOptional({ description: 'Truck shift ID to link this ticket', example: 'cuid...' })
  @IsOptional()
  @IsString()
  truckShiftId?: string;

  @ApiPropertyOptional({ description: 'Scale device ID for Modbus polling', example: 'cuid...' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Observations / notes' })
  @IsOptional()
  @IsString()
  observations?: string;
}
