import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService } from '../services/audit.service';

@ApiTags('Auditoría')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Obtener todos los logs de auditoría' })
  @ApiQuery({ name: 'module', required: false, description: 'Filtrar por módulo (hotmart, jelou, bitrix)' })
  @ApiQuery({ name: 'action', required: false, description: 'Filtrar por acción' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado (success, error)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de resultados (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset para paginación' })
  @ApiResponse({ status: 200, description: 'Lista de logs con total' })
  async getLogs(
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditService.findAll({
      module,
      action,
      status,
      limit: limit ? parseInt(limit.toString()) : 50,
      offset: offset ? parseInt(offset.toString()) : 0,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de auditoría' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas generales',
    schema: {
      example: {
        total_actions: 150,
        success_count: 145,
        error_count: 5,
        success_rate: '96.67%',
        by_module: [
          { module: 'hotmart', count: 80 },
          { module: 'jelou', count: 50 },
          { module: 'bitrix', count: 20 }
        ],
        by_action: [
          { action: 'crear_contacto', count: 50 },
          { action: 'crear_negociacion', count: 50 },
          { action: 'registrar_actividad', count: 50 }
        ]
      }
    }
  })
  async getStats() {
    return this.auditService.getStats();
  }

  @Get('deal/:dealId')
  @ApiOperation({ summary: 'Obtener logs por Deal ID de Bitrix' })
  @ApiResponse({ status: 200, description: 'Logs del deal específico' })
  async getLogsByDealId(@Param('dealId') dealId: string) {
    const logs = await this.auditService.findByDealId(dealId);
    return {
      deal_id: dealId,
      total: logs.length,
      logs,
    };
  }

  @Get('contact/:contactId')
  @ApiOperation({ summary: 'Obtener logs por Contact ID de Bitrix' })
  @ApiResponse({ status: 200, description: 'Logs del contacto específico' })
  async getLogsByContactId(@Param('contactId') contactId: string) {
    const logs = await this.auditService.findByContactId(contactId);
    return {
      contact_id: contactId,
      total: logs.length,
      logs,
    };
  }

  @Get('phone/:phone')
  @ApiOperation({ summary: 'Obtener logs por teléfono' })
  @ApiResponse({ status: 200, description: 'Logs del teléfono específico' })
  async getLogsByPhone(@Param('phone') phone: string) {
    const logs = await this.auditService.findByPhone(phone);
    return {
      phone,
      total: logs.length,
      logs,
    };
  }
}
