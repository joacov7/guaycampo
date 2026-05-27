import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'List all shift schedules' })
  @ApiQuery({ name: 'date', required: false, example: '2024-03-15' })
  findAll(
    @TenantId() tenantId: string,
    @Query('date') date?: string,
  ) {
    return this.shiftsService.findAll(tenantId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift schedule by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.shiftsService.findOne(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new shift schedule' })
  create(@Body() dto: CreateShiftDto, @TenantId() tenantId: string) {
    return this.shiftsService.create(dto, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a shift schedule' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
    @TenantId() tenantId: string,
  ) {
    return this.shiftsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shift schedule' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.shiftsService.remove(id, tenantId);
  }
}
