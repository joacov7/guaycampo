import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';

enum ContractType {
  COMPRA = 'compra',
  VENTA = 'venta',
  CANJE = 'canje',
  DEPOSITO = 'deposito',
}

enum PriceCondition {
  FIJADO = 'fijado',
  A_FIJAR = 'a_fijar',
  CANJE = 'canje',
  MERCADO = 'mercado',
}

export class CreateContractDto {
  @IsString() clientId: string;
  @IsString() commodityId: string;
  @IsEnum(ContractType) contractType: ContractType;
  @IsEnum(PriceCondition) priceCondition: PriceCondition;
  @IsOptional() @IsNumber() pricePerTon?: number;
  @IsString() @IsOptional() currency?: string;
  @IsNumber() @Min(0.01) quantityTon: number;
  @IsDateString() fromDate: string;
  @IsDateString() toDate: string;
  @IsString() @IsOptional() notes?: string;
}

export class UpdateContractDto {
  @IsOptional() @IsNumber() pricePerTon?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsEnum(PriceCondition) priceCondition?: PriceCondition;
}
