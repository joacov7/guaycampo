// =============================================================================
// GuayCampo - Scale Device DTO
// =============================================================================

import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsObject,
  IsEnum,
  IsIP,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScaleProtocol {
  TOLEDO = 'toledo',
  METTLER = 'mettler',
  GENERIC = 'generic',
}

export class CreateScaleDeviceDto {
  @ApiProperty({ description: 'Human-readable device name', example: 'Balanza Principal' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Device IP address', example: '192.168.1.100' })
  @IsIP()
  ipAddress!: string;

  @ApiProperty({ description: 'Modbus TCP port', example: 502 })
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @ApiPropertyOptional({ description: 'Modbus unit/slave ID (default 1)', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(247)
  unitId?: number;

  @ApiProperty({ description: 'Scale adapter protocol', enum: ScaleProtocol })
  @IsEnum(ScaleProtocol)
  protocol!: ScaleProtocol;

  @ApiPropertyOptional({
    description: 'Protocol-specific configuration (for generic adapter)',
    example: { weightRegister: 0, weightLength: 2, encoding: 'float32_be', multiplier: 1.0 },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Location / description', example: 'Entrada principal' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateScaleDeviceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(247)
  unitId?: number;

  @ApiPropertyOptional({ enum: ScaleProtocol })
  @IsOptional()
  @IsEnum(ScaleProtocol)
  protocol?: ScaleProtocol;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
