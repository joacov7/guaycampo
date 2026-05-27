// =============================================================================
// QualityParamsController — gestión de parámetros de calidad por cultivo
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { QualityParamsService, CreateQualityParamData } from './quality-params.service';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export class CreateQualityParamDto implements CreateQualityParamData {
  @IsString()
  commodityId!: string;

  @IsString()
  parameter!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  unit!: string;

  @IsNumber()
  baseValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  toleranceMinus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tolerancePlus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusPerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBonus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  rejectBelow?: number;

  @IsOptional()
  @IsNumber()
  rejectAbove?: number;

  @IsOptional()
  @IsString()
  normReference?: string;
}

export class UpdateQualityParamDto {
  @IsOptional()
  @IsNumber()
  baseValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  toleranceMinus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tolerancePlus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusPerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBonus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  rejectBelow?: number;

  @IsOptional()
  @IsNumber()
  rejectAbove?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  normReference?: string;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@ApiTags('quality-params')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality-params')
export class QualityParamsController {
  constructor(private readonly qualityParamsService: QualityParamsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los parámetros de calidad del tenant' })
  @ApiResponse({ status: 200, description: 'Lista de parámetros' })
  async findAll(@TenantId() tenantId: string) {
    return this.qualityParamsService.listForTenant(tenantId);
  }

  @Get('commodity/:code')
  @ApiOperation({ summary: 'Obtener parámetros para un cultivo específico' })
  @ApiResponse({ status: 200, description: 'Parámetros del cultivo' })
  async findByCommodity(
    @Param('code') code: string,
    @TenantId() tenantId: string,
  ) {
    return this.qualityParamsService.getForCommodity(code.toUpperCase(), tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear parámetro de calidad personalizado' })
  @ApiResponse({ status: 201, description: 'Parámetro creado' })
  async create(
    @Body() dto: CreateQualityParamDto,
    @TenantId() tenantId: string,
  ) {
    return this.qualityParamsService.create(dto, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar valor base, tolerancias, bonif/descuento' })
  @ApiResponse({ status: 200, description: 'Parámetro actualizado' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQualityParamDto,
    @TenantId() tenantId: string,
  ) {
    return this.qualityParamsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar parámetro personalizado' })
  @ApiResponse({ status: 204, description: 'Parámetro eliminado' })
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    return this.qualityParamsService.remove(id, tenantId);
  }

  @Post('reset/:code')
  @ApiOperation({ summary: 'Restaurar parámetros default SENASA para un cultivo' })
  @ApiResponse({ status: 200, description: 'Parámetros restaurados a defaults SENASA' })
  async resetToDefaults(
    @Param('code') code: string,
    @TenantId() tenantId: string,
  ) {
    return this.qualityParamsService.resetToDefaults(code.toUpperCase(), tenantId);
  }
}
