import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Sistema')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiExcludeEndpoint()
  getStatus() {
    return {
      service: 'Bitrix Integration API',
      status: 'online',
      message: 'Servidor activo y recibiendo peticiones',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        api: '/api',
        documentation: '/docs',
        health: '/health',
      },
      info: 'Sistema de integración entre plataformas. Acceso restringido.',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check del servidor' })
  getHealth() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    return {
      status: 'healthy',
      uptime: `${hours}h ${minutes}m`,
      uptime_seconds: Math.floor(uptime),
      memory: {
        used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    };
  }

  @Get('api')
  @ApiOperation({ summary: 'Información de la API' })
  getApiInfo() {
    return {
      api_name: 'Bitrix Integration API',
      version: '1.0.0',
      description: 'Sistema de integración para webhooks de Hotmart, Jelou y Bitrix24',
      modules: [
        {
          name: 'Hotmart',
          endpoints: ['/api/hotmart/webhook', '/api/hotmart/test'],
          status: 'active',
        },
        {
          name: 'Jelou',
          endpoints: ['/api/jelou/webhook', '/api/jelou/responder', '/api/jelou/terminar/chat'],
          status: 'active',
        },
        {
          name: 'Bitrix',
          endpoints: ['/api/bitrix/tarea/crear', '/api/bitrix/tareas'],
          status: 'active',
        },
        {
          name: 'Auditoría',
          endpoints: ['/api/audit/logs', '/api/audit/stats'],
          status: 'active',
        },
      ],
      documentation: '/docs',
      timestamp: new Date().toISOString(),
    };
  }
}
