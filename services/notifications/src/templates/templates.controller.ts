import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TemplatesService } from './templates.service';

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all available notification templates' })
  listTemplates() {
    return this.templatesService.listTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification template by ID' })
  getTemplate(@Param('id') id: string) {
    const template = this.templatesService.getTemplate(id);
    if (!template) throw new NotFoundException(`Template '${id}' not found`);
    return template;
  }
}
