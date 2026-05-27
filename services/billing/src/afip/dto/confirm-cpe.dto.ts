import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SolicitarCpeDto {
  @ApiProperty({
    description: 'Tipo de CPE: A (productor→acopio), B (acopio→destino), C (entre acopios)',
    enum: ['A', 'B', 'C'],
  })
  @IsString()
  @IsIn(['A', 'B', 'C'])
  cpeType: string;

  @ApiProperty({ description: 'CUIT del origen (productor/acopiador)' })
  @IsString()
  originCuit: string;

  @ApiProperty({ description: 'CUIT del destino (acopio/planta)' })
  @IsString()
  destinationCuit: string;

  @ApiProperty({ description: 'CUIT del transportista' })
  @IsString()
  transportCuit: string;

  @ApiProperty({ description: 'Dominio (patente) del camión' })
  @IsString()
  plate: string;

  @ApiPropertyOptional({ description: 'Dominio del acoplado' })
  @IsString()
  @IsOptional()
  plateTrailer?: string;

  @ApiProperty({ description: 'Código de grano AFIP (ej: 2 = soja, 23 = trigo)' })
  @IsNumber()
  commodityCode: number;

  @ApiProperty({ description: 'Cosecha (ej: "2324" para campaña 2023/2024)' })
  @IsString()
  harvest: string;

  @ApiProperty({ description: 'Peso estimado en kg' })
  @IsNumber()
  @IsPositive()
  estimatedWeightKg: number;

  @ApiProperty({ description: 'Localidad de origen' })
  @IsString()
  originLocality: string;

  @ApiProperty({ description: 'Provincia de origen' })
  @IsString()
  originProvince: string;

  @ApiProperty({ description: 'Localidad de destino' })
  @IsString()
  destinationLocality: string;

  @ApiProperty({ description: 'Provincia de destino' })
  @IsString()
  destinationProvince: string;

  @ApiPropertyOptional({ description: 'ID del turno de camión asociado' })
  @IsString()
  @IsOptional()
  truckShiftId?: string;

  @ApiPropertyOptional({ description: 'ID del cliente asociado' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: 'ID del commodity' })
  @IsString()
  @IsOptional()
  commodityId?: string;
}

export class ConfirmCpeDto {
  @ApiProperty({ description: 'Número de CPE a confirmar' })
  @IsString()
  cpeNumber: string;

  @ApiProperty({ description: 'Peso real descargado en kg' })
  @IsNumber()
  @Min(0)
  pesoReal: number;
}

export class CancelCpeDto {
  @ApiProperty({ description: 'Número de CPE a anular' })
  @IsString()
  cpeNumber: string;

  @ApiProperty({ description: 'Motivo de anulación' })
  @IsString()
  motivo: string;
}
