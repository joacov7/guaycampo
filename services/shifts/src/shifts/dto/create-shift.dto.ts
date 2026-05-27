import {
  IsDateString,
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OperationType } from '@guaycampo/shared-types';

export class CreateShiftDto {
  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  date!: string;

  @ApiProperty()
  @IsString()
  commodityId!: string;

  @ApiProperty({ enum: OperationType })
  @IsEnum(OperationType)
  operationType!: OperationType;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  totalSlots!: number;

  @ApiPropertyOptional({ example: '06:00' })
  @IsOptional()
  @IsString()
  timeFrom?: string;

  @ApiPropertyOptional({ example: '20:00' })
  @IsOptional()
  @IsString()
  timeTo?: string;
}
