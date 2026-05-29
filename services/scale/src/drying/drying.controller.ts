// =============================================================================
// GuayCampo - Drying Controller
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { DryingService } from './drying.service';
import {
  CreateDryingBatchDto,
  FinishDryingBatchDto,
  CreateDryerDto,
} from './dto/create-drying-batch.dto';

interface JwtUser {
  sub: string;
  tenantId: string;
  email: string;
}

@ApiTags('drying')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drying')
export class DryingController {
  constructor(private readonly dryingService: DryingService) {}

  // ---------------------------------------------------------------------------
  // Dryers
  // ---------------------------------------------------------------------------

  @Get('dryers')
  @ApiOperation({ summary: 'List active dryers for the tenant' })
  getDryers(@TenantId() tenantId: string) {
    return this.dryingService.getDryers(tenantId);
  }

  @Post('dryers')
  @ApiOperation({ summary: 'Create a new dryer' })
  createDryer(@Body() dto: CreateDryerDto, @TenantId() tenantId: string) {
    return this.dryingService.createDryer(dto, tenantId);
  }

  // ---------------------------------------------------------------------------
  // Batches — stats (must come before :id route)
  // ---------------------------------------------------------------------------

  @Get('batches/stats')
  @ApiOperation({ summary: 'Get drying stats for the tenant' })
  getStats(@TenantId() tenantId: string) {
    return this.dryingService.getStats(tenantId);
  }

  // ---------------------------------------------------------------------------
  // Batches — list
  // ---------------------------------------------------------------------------

  @Get('batches')
  @ApiOperation({ summary: 'List drying batches with optional filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'commodityId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('commodityId') commodityId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.dryingService.findAll(tenantId, {
      status,
      clientId,
      commodityId,
      dateFrom,
      dateTo,
    });
  }

  // ---------------------------------------------------------------------------
  // Batches — create
  // ---------------------------------------------------------------------------

  @Post('batches')
  @ApiOperation({ summary: 'Create a new drying batch' })
  createBatch(
    @Body() dto: CreateDryingBatchDto,
    @TenantId() tenantId: string,
    @Request() req: { user: JwtUser },
  ) {
    return this.dryingService.createBatch(dto, req.user.sub, tenantId);
  }

  // ---------------------------------------------------------------------------
  // Batches — detail
  // ---------------------------------------------------------------------------

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get full drying batch detail' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.dryingService.findOne(id, tenantId);
  }

  // ---------------------------------------------------------------------------
  // Batches — finish
  // ---------------------------------------------------------------------------

  @Post('batches/:id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finish a drying batch (record output weight and humidity)' })
  finishBatch(
    @Param('id') id: string,
    @Body() dto: FinishDryingBatchDto,
    @TenantId() tenantId: string,
  ) {
    return this.dryingService.finishBatch(id, dto, tenantId);
  }

  // ---------------------------------------------------------------------------
  // Batches — cancel
  // ---------------------------------------------------------------------------

  @Post('batches/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a drying batch' })
  cancelBatch(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.dryingService.cancelBatch(id, tenantId);
  }
}
