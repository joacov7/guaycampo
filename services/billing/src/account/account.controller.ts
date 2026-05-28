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
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import type { JwtPayload } from '../common/strategies/jwt.strategy';
import { AccountService, RegisterPaymentDto, type BulkPaymentItem } from './account.service';

class PaymentBodyDto implements RegisterPaymentDto {
  @ApiProperty({ description: 'Monto del pago (ARS)' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Descripción del pago' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'N° de recibo o documento' })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiPropertyOptional({ description: 'Fecha del movimiento (ISO)', example: '2024-07-15' })
  @IsString()
  @IsOptional()
  movementDate?: string;
}

class BulkPaymentItemDto implements BulkPaymentItem {
  @ApiProperty({ description: 'ID del cliente' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: 'Monto del pago (ARS)' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Descripción del pago' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'N° de documento' })
  @IsString()
  @IsOptional()
  documentNumber?: string;
}

class BulkPaymentBodyDto {
  @ApiProperty({ type: [BulkPaymentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPaymentItemDto)
  payments: BulkPaymentItemDto[];
}

@ApiTags('account')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get(':clientId')
  @ApiOperation({ summary: 'Saldo y resumen de cuenta corriente del cliente' })
  getBalance(@Param('clientId') clientId: string, @TenantId() tenantId: string) {
    return this.accountService.getBalance(clientId, tenantId);
  }

  @Get(':clientId/statement')
  @ApiOperation({ summary: 'Extracto de cuenta corriente del período' })
  @ApiQuery({ name: 'from', required: true, description: 'Fecha desde (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'Fecha hasta (ISO)' })
  getStatement(
    @Param('clientId') clientId: string,
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.accountService.getStatement(clientId, new Date(from), new Date(to), tenantId);
  }

  @Post(':clientId/payment')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar pago recibido en cuenta corriente' })
  registerPayment(
    @Param('clientId') clientId: string,
    @Body() dto: PaymentBodyDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountService.registerPayment(clientId, dto, user.sub, tenantId);
  }

  @Get('aging')
  @ApiOperation({ summary: 'Reporte de aging de cuentas a cobrar' })
  getAging(@TenantId() tenantId: string) {
    return this.accountService.getAging(tenantId);
  }

  @Post('bulk-payment')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar pagos masivos en cuentas corrientes' })
  bulkPayment(
    @Body() dto: BulkPaymentBodyDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountService.bulkPayment(dto.payments, user.sub, tenantId);
  }

  @Get(':clientId/statement/pdf')
  @ApiOperation({ summary: 'Descargar extracto de cuenta corriente en PDF' })
  @ApiQuery({ name: 'from', required: true, description: 'Fecha desde (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'Fecha hasta (ISO)' })
  async getStatementPdf(
    @Param('clientId') clientId: string,
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const buffer = await this.accountService.getStatementPdf(
      clientId,
      new Date(from),
      new Date(to),
      tenantId,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="extracto-${clientId}-${from}-${to}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
