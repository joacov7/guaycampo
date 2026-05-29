import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';

export enum PriceCondition {
  PIZARRA = 'pizarra',
  FORWARD = 'forward',
  SPOT = 'spot',
  CANJE = 'canje',
  FIJACION = 'fijacion',
}

export enum PriceCurrency {
  ARS = 'ARS',
  USD = 'USD',
}

export class CreatePriceDto {
  @IsString() commodityId: string;
  @IsEnum(PriceCondition) condition: PriceCondition;
  @IsNumber() @Min(0) pricePerTon: number;
  @IsEnum(PriceCurrency) currency: PriceCurrency;
  @IsDateString() validFrom: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsString() deliveryMonths?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePriceDto {
  @IsOptional() @IsNumber() @Min(0) pricePerTon?: number;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
