import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';

enum RemitoType {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  TRANSFERENCIA = 'transferencia',
}

export class CreateRemitoDto {
  @IsEnum(RemitoType)
  remitoType: RemitoType;

  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsString()
  commodityId: string;

  @IsOptional()
  @IsString()
  scaleTicketId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  grossWeightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tareWeightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  netWeightKg?: number;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
