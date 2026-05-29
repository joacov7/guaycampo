import { IsString, IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';

export class CreateDryingBatchDto {
  @IsOptional()
  @IsUUID()
  dryerId?: string;

  @IsOptional()
  @IsUUID()
  scaleTicketId?: string;

  @IsUUID()
  clientId!: string;

  @IsUUID()
  commodityId!: string;

  @IsNumber()
  @Min(0)
  inputWeightKg!: number;

  @IsNumber()
  @Min(0)
  @Max(50)
  inputHumidityPct!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  targetHumidityPct?: number;

  @IsOptional()
  @IsNumber()
  costPerTon?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinishDryingBatchDto {
  @IsNumber()
  @Min(0)
  outputWeightKg!: number;

  @IsNumber()
  @Min(0)
  @Max(50)
  outputHumidityPct!: number;

  @IsOptional()
  @IsNumber()
  costPerTon?: number;
}

export class CreateDryerDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityTonH?: number;

  @IsOptional()
  @IsString()
  fuelType?: string;
}
