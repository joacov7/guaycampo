// =============================================================================
// GuayCampo - Update Ticket DTO
// =============================================================================

import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTicketDto {
  @ApiPropertyOptional({ description: 'Confirmed license plate' })
  @IsOptional()
  @IsString()
  plateConfirmed?: string;

  @ApiPropertyOptional({ description: 'Additional observations / notes' })
  @IsOptional()
  @IsString()
  observations?: string;
}
