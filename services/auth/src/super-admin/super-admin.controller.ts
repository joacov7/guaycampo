import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from './super-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@ApiTags('super-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get global platform stats' })
  async getGlobalStats() {
    return this.superAdminService.getGlobalStats();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with metrics' })
  async listTenants(
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
  ) {
    return this.superAdminService.listTenants({ status, plan, search });
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Create a new tenant with admin user' })
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.superAdminService.createTenant(dto);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get full tenant detail' })
  async getTenantDetail(@Param('id') id: string) {
    return this.superAdminService.getTenantDetail(id);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Update tenant plan or status' })
  async updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.superAdminService.updateTenant(id, dto);
  }

  @Post('tenants/:id/impersonate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate impersonation token for a user in a tenant' })
  async impersonate(
    @Param('id') tenantId: string,
    @Query('userId') userId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.superAdminService.impersonateToken(tenantId, userId, req.user.sub);
  }
}
