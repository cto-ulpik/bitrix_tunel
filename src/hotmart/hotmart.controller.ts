import { Controller, Post, Body, Logger, HttpCode, UnauthorizedException, Query, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { HotmartService } from './hotmart.service';
import { HotmartWebhookDto } from './dto/hotmart-webhook.dto';
import { Request } from 'express';

@ApiTags('Hotmart')
@Controller('hotmart')
export class HotmartController {
  private readonly logger = new Logger(HotmartController.name);
  
  // Token secreto de Hotmart - DEBE coincidir con el configurado en Hotmart
  private readonly HOTMART_SECRET = 'ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc';

  constructor(private readonly hotmartService: HotmartService) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Recibe webhooks de Hotmart',
    description: 'Endpoint para recibir notificaciones de eventos de Hotmart (compras, suscripciones, cancelaciones, etc.). Requiere token de seguridad (hottok).'
  })
  @ApiQuery({
    name: 'hottok',
    required: false,
    description: 'Token de seguridad de Hotmart',
    example: 'ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc'
  })
  @ApiBody({
    description: 'Payload del webhook de Hotmart',
    type: HotmartWebhookDto,
    examples: {
      purchaseComplete: {
        summary: 'Compra completada',
        value: {
          id: 'abc123',
          event: 'PURCHASE_COMPLETE',
          version: '2.0.0',
          creation_date: 1638360000,
          hottok: 'ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc',
          data: {
            product: {
              id: 123456,
              name: 'Curso de Ejemplo',
              ucode: 'curso-ejemplo'
            },
            buyer: {
              name: 'Juan Pérez',
              email: 'juan@ejemplo.com',
              checkout_phone: '+593999999999'
            },
            purchase: {
              order_date: 1638360000,
              price: {
                value: 99.90,
                currency_code: 'USD'
              },
              payment: {
                method: 'credit_card',
                type: 'visa'
              },
              status: 'approved',
              transaction: 'HP12345678'
            }
          }
        }
      },
      subscriptionCancellation: {
        summary: 'Cancelación de suscripción',
        value: {
          id: 'def456',
          event: 'SUBSCRIPTION_CANCELLATION',
          version: '2.0.0',
          creation_date: 1638360000,
          hottok: 'ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc',
          data: {
            product: {
              id: 123456,
              name: 'Membresía Mensual',
              ucode: 'membresia-mensual'
            },
            subscription: {
              status: 'canceled',
              subscriber: {
                name: 'María García',
                email: 'maria@ejemplo.com',
                phone: '+593988888888'
              },
              plan: {
                name: 'Plan Premium'
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Webhook procesado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Webhook procesado correctamente',
        result: {
          status: 'compra procesada',
          contactId: 123,
          dealId: 456,
          producto: 'Curso de Ejemplo'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Token inválido o no proporcionado' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos inválidos en el webhook' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Error al procesar el webhook' 
  })
  async receiveWebhook(
    @Body() webhookData: any,
    @Query('hottok') hottokQuery?: string,
    @Req() request?: Request,
  ) {
    const startTime = Date.now();
    
    // Extraer el token de diferentes fuentes (body, query, headers)
    const hottok = webhookData?.hottok || hottokQuery || request?.headers['x-hotmart-hottok'];
    
    // Log inicial con headers (para debugging)
    this.logger.log(`[WEBHOOK HIT] Event: ${webhookData?.event || 'unknown'}`);
    this.logger.debug(`Headers: ${JSON.stringify(request?.headers || {})}`);
    
    // Guardar log en archivo
    await this.hotmartService.logToFile('HIT', {
      timestamp: new Date().toISOString(),
      headers: request?.headers || {},
      body: webhookData,
      token_received: hottok ? '***' + hottok.slice(-8) : 'NONE',
    });

    // Validación de token
    if (!this.HOTMART_SECRET || !hottok) {
      this.logger.error('[BAD_TOKEN] Token no proporcionado');
      await this.hotmartService.logToFile('BAD_TOKEN', {
        timestamp: new Date().toISOString(),
        error: 'Token no proporcionado',
        body: webhookData,
      });
      
      // Enviar email de alerta
      await this.hotmartService.sendEmailAlert(
        '[Hotmart Webhook] ⚠️ BAD_TOKEN - Sin token',
        { received: webhookData, error: 'Token no proporcionado' }
      );
      
      throw new UnauthorizedException({
        success: false,
        error: 'Token no proporcionado',
      });
    }

    // Comparación segura de tokens (timing-safe)
    if (!this.secureCompare(this.HOTMART_SECRET, hottok)) {
      this.logger.error(`[BAD_TOKEN] Token inválido: ${hottok.slice(0, 10)}...`);
      await this.hotmartService.logToFile('BAD_TOKEN', {
        timestamp: new Date().toISOString(),
        error: 'Token inválido',
        token_received: hottok.slice(0, 20) + '...',
        body: webhookData,
      });
      
      // Enviar email de alerta
      await this.hotmartService.sendEmailAlert(
        '[Hotmart Webhook] 🚨 BAD_TOKEN - Token inválido',
        { received: webhookData, token: hottok.slice(0, 20) + '...' }
      );
      
      throw new UnauthorizedException({
        success: false,
        error: 'Token inválido',
      });
    }

    // Token válido, procesar webhook
    this.logger.log(`[TOKEN OK] Procesando evento: ${webhookData.event}`);
    
    try {
      // Validar que tenga la estructura mínima
      if (!webhookData.event) {
        throw new BadRequestException('Evento no especificado en el webhook');
      }

      const result = await this.hotmartService.processWebhook(webhookData as HotmartWebhookDto);
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`[OK] Webhook procesado en ${processingTime}ms: ${JSON.stringify(result)}`);
      
      // Log exitoso
      await this.hotmartService.logToFile('OK', {
        timestamp: new Date().toISOString(),
        event: webhookData.event,
        result,
        processing_time_ms: processingTime,
      });

      // Enviar email de confirmación
      await this.hotmartService.sendEmailAlert(
        `[Hotmart Webhook] ✅ OK - ${webhookData.event}`,
        {
          headers: request?.headers || {},
          body: webhookData,
          result,
          processing_time_ms: processingTime,
        }
      );
      
      return {
        success: true,
        message: 'Webhook procesado correctamente',
        result,
      };
    } catch (error) {
      this.logger.error(`[ERROR] ${error.message}`, error.stack);
      
      await this.hotmartService.logToFile('ERROR', {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        body: webhookData,
      });

      // Enviar email de error
      await this.hotmartService.sendEmailAlert(
        '[Hotmart Webhook] ❌ ERROR',
        {
          error: error.message,
          stack: error.stack,
          body: webhookData,
        }
      );
      
      return {
        success: false,
        message: 'Error al procesar webhook',
        error: error.message,
      };
    }
  }

  /**
   * Comparación segura de strings (timing-safe)
   * Previene ataques de timing
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Endpoint de prueba para validar que el servidor está funcionando
   */
  @Post('test')
  @ApiOperation({ 
    summary: 'Prueba de conexión',
    description: 'Endpoint para probar que el servicio de Hotmart está funcionando'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Servicio funcionando correctamente' 
  })
  async testEndpoint() {
    return {
      status: 'ok',
      message: 'Endpoint de Hotmart funcionando correctamente',
      timestamp: new Date().toISOString(),
    };
  }
}

