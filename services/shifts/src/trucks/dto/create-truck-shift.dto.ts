import {
  IsString,
  IsOptional,
  IsDecimal,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTruckShiftDto {
  @ApiProperty()
  @IsString()
  shiftId!: string;

  @ApiProperty()
  @IsString()
  vehicleId!: string;

  @ApiProperty()
  @IsString()
  driverId!: string;

  @ApiProperty()
  @IsString()
  clientId!: string;

  @ApiProperty()
  @IsString()
  commodityId!: string;

  @ApiPropertyOptional({ example: '30000' })
  @IsOptional()
  @IsDecimal()
  estimatedQty?: string;

  @ApiPropertyOptional({ example: 'CPE-2024-000123' })
  @IsOptional()
  @IsString()
  cpeNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkinAt?: string;
}
