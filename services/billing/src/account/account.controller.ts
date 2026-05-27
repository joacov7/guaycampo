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
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import type { JwtPayload } from '../common/strategies/jwt.strategy';
import { AccountService, RegisterPaymentDto } from './account.service';

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
}
