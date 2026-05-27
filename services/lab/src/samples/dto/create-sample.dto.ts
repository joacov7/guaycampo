import { IsString, IsOptional, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSampleDto {
  @ApiProperty({ description: 'ID del ticket de balanza asociado' })
  @IsString()
  scaleTicketId!: string;

  @ApiPropertyOptional({ description: 'Fecha/hora de toma de muestra (ISO 8601). Por defecto: now()' })
  @IsOptional()
  @IsDateString()
  takenAt?: string;

  @ApiPropertyOptional({ description: 'Observaciones iniciales' })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({ description: 'Datos crudos del analizador (JSON libre)' })
  @IsOptional()
  rawData?: Record<string, unknown>;
}

export class SubmitResultsDto {
  @ApiPropertyOptional({ description: 'Humedad (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;

  @ApiPropertyOptional({ description: 'Proteína (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  protein?: number;

  @ApiPropertyOptional({ description: 'Aceite / Materia Grasa (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  oil?: number;

  @ApiPropertyOptional({ description: 'Gluten húmedo (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gluten?: number;

  @ApiPropertyOptional({ description: 'Número de caída / Falling Number (seg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fallingNumber?: number;

  @ApiPropertyOptional({ description: 'Peso hectolítrico (kg/hl)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  testWeight?: number;

  @ApiPropertyOptional({ description: 'Granos dañados (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  damagedGrains?: number;

  @ApiPropertyOptional({ description: 'Granos ardidos (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  burntGrains?: number;

  @ApiPropertyOptional({ description: 'Materias extrañas / Impurezas (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  foreignMatter?: number;

  @ApiPropertyOptional({ description: 'Granos quebrados (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  brokenGrains?: number;

  @ApiPropertyOptional({ description: 'ID del analizador que generó los datos' })
  @IsOptional()
  @IsString()
  analyzerId?: string;

  @ApiPropertyOptional({ description: 'Datos crudos del analizador' })
  @IsOptional()
  rawData?: Record<string, unknown>;
}

export class ManualApproveDto {
  @ApiProperty({ description: 'Motivo de la aprobación manual (override)' })
  @IsString()
  reason!: string;
}

export class ManualRejectDto {
  @ApiProperty({ description: 'Motivo del rechazo manual' })
  @IsString()
  reason!: string;
}
