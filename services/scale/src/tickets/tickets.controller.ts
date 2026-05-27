// =============================================================================
// GuayCampo - Tickets Controller
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
  Res,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import { TicketsService } from './tickets.service';
import { OcrService } from '../ocr/ocr.service';
import { CameraService } from '../ocr/camera.service';
import { DevicesService } from '../devices/devices.service';
import { StartEntryDto } from './dto/create-ticket.dto';
import {
  ConfirmGrossWeightDto,
  ConfirmTareWeightDto,
  RejectTicketDto,
  OcrCaptureDto,
} from './dto/complete-weighing.dto';

interface JwtUser {
  sub: string;
  tenantId: string;
  email: string;
}

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly ocrService: OcrService,
    private readonly cameraService: CameraService,
    private readonly devicesService: DevicesService,
  ) {}

  // ---------------------------------------------------------------------------
  // List tickets
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'List tickets with optional filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'plate', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('plate') plate?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.ticketsService.findAll(tenantId, {
      status,
      plate,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
  }

  // ---------------------------------------------------------------------------
  // Start entry weighing
  // ---------------------------------------------------------------------------

  @Post('start-entry')
  @ApiOperation({ summary: 'Start a new weighing entry (create ticket, begin polling)' })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  startEntry(
    @Body() dto: StartEntryDto,
    @TenantId() tenantId: string,
  ) {
    return this.ticketsService.startEntry(dto, tenantId);
  }

  // ---------------------------------------------------------------------------
  // OCR capture
  // ---------------------------------------------------------------------------

  @Post('ocr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture frame from camera and run OCR plate recognition' })
  async captureOcr(
    @Body() dto: OcrCaptureDto,
    @TenantId() tenantId: string,
  ) {
    const device = await this.devicesService.findOne(dto.deviceId);

    // Camera config is stored in device.config under the "camera" key
    const cameraConfig = (device.config as Record<string, unknown>)['camera'] as
      | import('../ocr/camera.service').CameraConfig
      | undefined;

    if (!cameraConfig) {
      return {
        success: false,
        message: `Device ${dto.deviceId} has no camera configuration`,
        plate: null,
        confidence: 0,
      };
    }

    const imageBuffer = await this.cameraService.captureFrame(cameraConfig);
    const result = await this.ocrService.recognizePlate(imageBuffer);

    return {
      success: result.plate !== null,
      ...result,
    };
  }

  // ---------------------------------------------------------------------------
  // Ticket detail
  // ---------------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({ summary: 'Get full ticket detail' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.ticketsService.findOne(id, tenantId);
  }

  // ---------------------------------------------------------------------------
  // Confirm gross weight
  // ---------------------------------------------------------------------------

  @Post(':id/confirm-gross')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm gross (loaded truck) weight' })
  confirmGross(
    @Param('id') id: string,
    @Body() dto: ConfirmGrossWeightDto,
    @TenantId() tenantId: string,
    @Request() req: { user: JwtUser },
  ) {
    return this.ticketsService.confirmGrossWeight(id, dto, tenantId, req.user.sub);
  }

  // ---------------------------------------------------------------------------
  // Confirm tare weight
  // ---------------------------------------------------------------------------

  @Post(':id/confirm-tare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm tare (empty truck) weight and finalise ticket' })
  confirmTare(
    @Param('id') id: string,
    @Body() dto: ConfirmTareWeightDto,
    @TenantId() tenantId: string,
    @Request() req: { user: JwtUser },
  ) {
    return this.ticketsService.confirmTareWeight(id, dto, tenantId, req.user.sub);
  }

  // ---------------------------------------------------------------------------
  // Reject ticket
  // ---------------------------------------------------------------------------

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject ticket (vehicle refused entry)' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectTicketDto,
    @TenantId() tenantId: string,
  ) {
    return this.ticketsService.reject(id, dto, tenantId);
  }

  // ---------------------------------------------------------------------------
  // Download PDF
  // ---------------------------------------------------------------------------

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download ticket as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file', content: { 'application/pdf': {} } })
  async downloadPdf(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.ticketsService.generatePdf(id, tenantId);
    const ticket = await this.ticketsService.findOne(id, tenantId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-${ticket.ticketNumber}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    });
    res.end(pdfBuffer);
  }
}
