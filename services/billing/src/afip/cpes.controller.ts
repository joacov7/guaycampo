import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { AfipCpeService } from './afip-cpe.service';
import { SolicitarCpeDto, ConfirmCpeDto } from './dto/confirm-cpe.dto';

class CancelCpeBodyDto {
  @ApiProperty({ description: 'Motivo de anulación' })
  @IsString()
  motivo: string;
}

class CpeFiltersDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}

@ApiTags('cpes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cpes')
export class CpesController {
  private readonly prisma = new PrismaClient();

  constructor(private readonly afipCpeService: AfipCpeService) {}

  @Get()
  @ApiOperation({ summary: 'Listar CPEs del tenant' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @TenantId() tenantId: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const where: Record<string, unknown> = { tenantId };
    if (clientId) where['clientId'] = clientId;
    if (status) where['status'] = status;

    const [data, total] = await Promise.all([
      this.prisma.cpe.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, cuit: true } },
          commodity: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.cpe.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  @Post()
  @ApiOperation({ summary: 'Solicitar nueva CPE a AFIP' })
  async create(@Body() dto: SolicitarCpeDto, @TenantId() tenantId: string) {
    const cpeResult = await this.afipCpeService.solicitarCPE(dto, tenantId);

    // Persist in DB
    const cpe = await this.prisma.cpe.create({
      data: {
        cpeNumber: cpeResult.nroCPE,
        truckShiftId: dto.truckShiftId ?? null,
        clientId: dto.clientId ?? dto.originCuit, // fallback
        commodityId: dto.commodityId ?? '',
        originCuit: dto.originCuit,
        destinationCuit: dto.destinationCuit,
        originProvince: dto.originProvince,
        destinationProvince: dto.destinationProvince,
        estimatedKg: dto.estimatedWeightKg,
        issueDate: new Date(cpeResult.fechaEmision),
        status: 'activa',
        afipResponse: cpeResult as unknown as Record<string, unknown>,
        tenantId,
      },
    });

    return cpe;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de CPE + estado AFIP' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    const cpe = await this.prisma.cpe.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        commodity: true,
      },
    });

    if (!cpe) {
      return { error: `CPE ${id} no encontrada` };
    }

    // Optionally refresh status from AFIP
    try {
      const afipStatus = await this.afipCpeService.consultarCPE(cpe.cpeNumber, tenantId);
      return { ...cpe, afipStatus };
    } catch {
      return cpe;
    }
  }

  @Post(':id/confirm-arrival')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar arribo con peso real descargado' })
  async confirmArrival(
    @Param('id') id: string,
    @Body() dto: ConfirmCpeDto,
    @TenantId() tenantId: string,
  ) {
    const cpe = await this.prisma.cpe.findFirst({
      where: { id, tenantId },
    });

    if (!cpe) {
      return { error: `CPE ${id} no encontrada` };
    }

    await this.afipCpeService.confirmarArribo(cpe.cpeNumber, dto.pesoReal, tenantId);

    return this.prisma.cpe.update({
      where: { id },
      data: { realKg: dto.pesoReal, status: 'confirmada' },
    });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anular CPE en AFIP' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelCpeBodyDto,
    @TenantId() tenantId: string,
  ) {
    const cpe = await this.prisma.cpe.findFirst({
      where: { id, tenantId },
    });

    if (!cpe) {
      return { error: `CPE ${id} no encontrada` };
    }

    await this.afipCpeService.anularCPE(cpe.cpeNumber, dto.motivo, tenantId);

    return this.prisma.cpe.update({
      where: { id },
      data: { status: 'anulada', observations: dto.motivo },
    });
  }
}
