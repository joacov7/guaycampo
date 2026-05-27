import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty({ description: 'Descripción del ítem' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Cantidad' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Precio unitario sin IVA (ARS)' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Alícuota IVA (%)', default: 21 })
  @IsNumber()
  @IsOptional()
  ivaRate?: number;
}

export class EmitInvoiceDto {
  @ApiProperty({
    description: 'Tipo de comprobante',
    enum: ['FC-A', 'FC-B', 'FC-C', 'NC-A', 'NC-B', 'NC-C', 'ND-A', 'ND-B', 'ND-C', 'FC-E-A', 'FC-E-B'],
  })
  @IsString()
  @IsIn(['FC-A', 'FC-B', 'FC-C', 'NC-A', 'NC-B', 'NC-C', 'ND-A', 'ND-B', 'ND-C', 'FC-E-A', 'FC-E-B'])
  type: string;

  @ApiProperty({ description: 'ID del cliente' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ description: 'ID de la liquidación asociada' })
  @IsString()
  @IsOptional()
  liquidationId?: string;

  @ApiProperty({ description: 'CUIT del cliente receptor' })
  @IsString()
  clientCuit: string;

  @ApiProperty({ description: 'Subtotal sin IVA (ARS)' })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ description: 'Monto IVA (ARS)' })
  @IsNumber()
  @Min(0)
  ivaAmount: number;

  @ApiProperty({ description: 'Total con IVA (ARS)' })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiPropertyOptional({ description: 'Ítems de la factura' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  @IsOptional()
  items?: InvoiceItemDto[];

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}
