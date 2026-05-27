import { PartialType } from '@nestjs/swagger';
import { CreateTruckShiftDto } from './create-truck-shift.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TruckShiftStatus } from '@guaycampo/shared-types';

export class UpdateTruckShiftDto extends PartialType(CreateTruckShiftDto) {
  @ApiPropertyOptional({ enum: TruckShiftStatus })
  @IsOptional()
  @IsEnum(TruckShiftStatus)
  status?: TruckShiftStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkoutAt?: string;
}
