import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { ReadingsService } from './readings.service';

@ApiTags('Readings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('readings')
export class ReadingsController {
  constructor(private readonly readingsService: ReadingsService) {}

  @Get(':siloId')
  @ApiOperation({ summary: 'Get latest readings for all sensors in a silo' })
  getLatest(@Param('siloId') siloId: string, @TenantId() tenantId: string) {
    return this.readingsService.getLatestBySilo(siloId, tenantId);
  }

  @Get(':siloId/temperature-map')
  @ApiOperation({ summary: 'Get temperature map (cable/position grid) for a silo' })
  getTemperatureMap(@Param('siloId') siloId: string, @TenantId() tenantId: string) {
    return this.readingsService.getTemperatureMap(siloId, tenantId);
  }

  @Get(':siloId/chart')
  @ApiOperation({ summary: 'Get time-series data for charting' })
  @ApiQuery({ name: 'sensor', required: true, example: 'temperature' })
  @ApiQuery({ name: 'hours', required: false, example: 24 })
  getChart(
    @Param('siloId') siloId: string,
    @Query('sensor') sensorType: string,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
    @TenantId() tenantId: string,
  ) {
    return this.readingsService.getHourlyAverages(siloId, sensorType, hours, tenantId);
  }

  @Get(':siloId/raw')
  @ApiOperation({ summary: 'Get raw recent readings for a sensor' })
  @ApiQuery({ name: 'sensor', required: true, example: 'temperature' })
  @ApiQuery({ name: 'hours', required: false, example: 6 })
  getRaw(
    @Param('siloId') siloId: string,
    @Query('sensor') sensorType: string,
    @Query('hours', new DefaultValuePipe(6), ParseIntPipe) hours: number,
    @TenantId() tenantId: string,
  ) {
    return this.readingsService.getRecentReadings(siloId, sensorType, hours, tenantId);
  }

  @Get(':siloId/stats')
  @ApiOperation({ summary: 'Get aggregated statistics for all sensors' })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  getStats(
    @Param('siloId') siloId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
    @TenantId() tenantId: string,
  ) {
    return this.readingsService.getStats(siloId, days, tenantId);
  }
}
