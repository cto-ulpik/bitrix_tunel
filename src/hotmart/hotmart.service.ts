import { Injectable, Logger } from '@nestjs/common';
import { BitrixService } from '../bitrix/bitrix.service';
import { HotmartWebhookDto } from './dto/hotmart-webhook.dto';
import { AuditService } from '../database/services/audit.service';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

@Injectable()
export class HotmartService {
  private readonly logger = new Logger(HotmartService.name);
  private readonly LOG_FILE = path.join(process.cwd(), 'logs', 'hotmart.log');
  
  // Email de notificaciones (configurable)
  private readonly NOTIFICATION_EMAIL = 'cto@ulpik.com';
  
  // Servicio de email (puedes usar SendGrid, AWS SES, etc.)
  private readonly EMAIL_ENABLED = false; // Cambiar a true para activar emails

  constructor(
    private readonly bitrixService: BitrixService,
    private readonly auditService: AuditService,
  ) {
    // Asegurar que existe el directorio de logs
    this.ensureLogDirectory();
  }

  /**
   * Procesa el webhook de Hotmart y ejecuta acciones en Bitrix
   */
  async processWebhook(webhook: HotmartWebhookDto) {
    const { event, data } = webhook;

    this.logger.log(`Procesando evento de Hotmart: ${event}`);

    try {
      switch (event) {
        // EVENTOS DE COMPRA
        case 'PURCHASE_COMPLETE':
        case 'PURCHASE_APPROVED':
          return await this.handlePurchaseApproved(webhook);

        case 'PURCHASE_CANCELED':
        case 'PURCHASE_REFUNDED':
        case 'PURCHASE_CHARGEBACK':
          return await this.handlePurchaseCanceled(webhook);

        case 'PURCHASE_DELAYED':
        case 'PURCHASE_PROTEST':
          return await this.handlePurchaseDelayed(webhook);

        case 'PURCHASE_BILLET_PRINTED':
          return await this.handleBilletPrinted(webhook);

        // EVENTOS DE SUSCRIPCIÓN
        case 'SUBSCRIPTION_CANCELLATION':
          return await this.handleSubscriptionCancellation(webhook);

        case 'SUBSCRIPTION_REACTIVATION':
          return await this.handleSubscriptionReactivation(webhook);

        // EVENTOS DE CLUB
        case 'SWITCH_PLAN':
          return await this.handleSwitchPlan(webhook);

        // OTROS EVENTOS
        default:
          this.logger.warn(`Evento no manejado: ${event}`);
          return { status: 'evento no procesado', event };
      }
    } catch (error) {
      this.logger.error(`Error procesando webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Maneja compras aprobadas/completadas
   */
  private async handlePurchaseApproved(webhook: HotmartWebhookDto) {
    const { data } = webhook;
    const buyer = data?.buyer;
    const product = data?.product;
    const purchase = data?.purchase;

    if (!buyer || !product) {
      this.logger.warn('Datos incompletos en el webhook');
      return { status: 'datos incompletos' };
    }

    // Extraer información del comprador
    const nombre = buyer.name || 'Sin nombre';
    const telefono = this.extractPhone(buyer);
    const email = buyer.email || '';
    const productoNombre = product.name || 'Producto Hotmart';
    const precio = purchase?.price?.value || 0;
    const moneda = purchase?.price?.currency_code || 'USD';

    // Buscar o crear contacto en Bitrix
    let contacto = await this.bitrixService.buscarContactoPorTelefono(telefono);
    let contactId = contacto?.ID;

    if (!contactId && email) {
      // Si no existe por teléfono, buscar por email (puedes agregar este método en BitrixService)
      contactId = await this.bitrixService.crearContacto(nombre, telefono);
    } else if (!contactId) {
      contactId = await this.bitrixService.crearContacto(nombre, telefono);
    }

    // Buscar negociación existente (puedes usar un embudo específico para Hotmart)
    const negociacionExistente = await this.bitrixService.buscarNegociacionPorContacto(contactId);

    let dealId: number;

    if (negociacionExistente) {
      dealId = negociacionExistente.ID;
    } else {
      // Crear nueva negociación con información de la compra
      dealId = await this.crearNegociacionHotmart(
        contactId,
        nombre,
        productoNombre,
        precio,
        moneda,
      );
    }

    // Registrar actividad con detalles de la compra
    const mensaje = this.buildPurchaseMessage(webhook);
    await this.bitrixService.registrarActividad(dealId, mensaje, 'Hotmart: ');

    this.logger.log(`Compra procesada exitosamente. Deal ID: ${dealId}`);

    // Crear tarea automática de seguimiento
    let taskId: string | null = null;
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 3); // 3 días después de la compra
      
      taskId = await this.bitrixService.crearTareaParaNegociacion(
        dealId,
        `Seguimiento post-compra: ${nombre}`,
        `Cliente: ${nombre}
Producto: ${productoNombre}
Monto: ${moneda} ${precio}
Email: ${email}
Teléfono: ${telefono}

Acción requerida: Verificar que el cliente recibió acceso al producto y confirmar su satisfacción.`,
        fechaLimite.toISOString().split('T')[0] + ' 18:00:00',
      );
      
      this.logger.log(`Tarea de seguimiento creada. Task ID: ${taskId}`);
    } catch (error) {
      this.logger.error(`Error creando tarea automática: ${error.message}`);
      // No lanzar error, continuar con el proceso
    }

    // Registrar en la base de datos de auditoría
    await this.auditService.log({
      action: 'compra_procesada',
      module: 'hotmart',
      event_type: webhook.event,
      bitrix_contact_id: String(contactId),
      bitrix_deal_id: String(dealId),
      bitrix_activity_id: taskId || undefined,
      user_name: nombre,
      user_phone: telefono,
      user_email: email,
      product_name: productoNombre,
      amount: precio,
      currency: moneda,
      webhook_id: webhook.id,
      status: 'success',
      metadata: {
        transaction: purchase?.transaction,
        payment_method: purchase?.payment?.method,
        payment_type: purchase?.payment?.type,
        task_id: taskId,
      },
    });

    return {
      status: 'compra procesada',
      contactId,
      dealId,
      producto: productoNombre,
      taskId,
    };
  }

  /**
   * Maneja compras canceladas/reembolsadas/chargeback
   */
  private async handlePurchaseCanceled(webhook: HotmartWebhookDto) {
    const { event, data } = webhook;
    const buyer = data?.buyer;
    const telefono = this.extractPhone(buyer);

    const contacto = await this.bitrixService.buscarContactoPorTelefono(telefono);
    if (!contacto) {
      this.logger.warn('Contacto no encontrado para cancelación');
      return { status: 'contacto no encontrado' };
    }

    const negociacion = await this.bitrixService.buscarNegociacionPorContacto(contacto.ID);
    if (negociacion) {
      const mensaje = `Compra ${event}: ${data?.product?.name || 'Producto'}. Motivo: ${data?.purchase?.status || 'No especificado'}`;
      await this.bitrixService.registrarActividad(negociacion.ID, mensaje, 'Hotmart Cancelación: ');
    }

    return { status: 'cancelación registrada', event };
  }

  /**
   * Maneja compras atrasadas/protestadas
   */
  private async handlePurchaseDelayed(webhook: HotmartWebhookDto) {
    const { data } = webhook;
    const buyer = data?.buyer;
    const telefono = this.extractPhone(buyer);

    const contacto = await this.bitrixService.buscarContactoPorTelefono(telefono);
    if (contacto) {
      const negociacion = await this.bitrixService.buscarNegociacionPorContacto(contacto.ID);
      if (negociacion) {
        const mensaje = `Pago atrasado: ${data?.product?.name || 'Producto'}`;
        await this.bitrixService.registrarActividad(negociacion.ID, mensaje, 'Hotmart Alerta: ');
      }
    }

    return { status: 'pago atrasado registrado' };
  }

  /**
   * Maneja impresión de boleto
   */
  private async handleBilletPrinted(webhook: HotmartWebhookDto) {
    const { data } = webhook;
    const buyer = data?.buyer;
    const telefono = this.extractPhone(buyer);

    const contacto = await this.bitrixService.buscarContactoPorTelefono(telefono);
    if (contacto) {
      const negociacion = await this.bitrixService.buscarNegociacionPorContacto(contacto.ID);
      if (negociacion) {
        const mensaje = `Boleto impreso para: ${data?.product?.name || 'Producto'}`;
        await this.bitrixService.registrarActividad(negociacion.ID, mensaje, 'Hotmart Info: ');
      }
    }

    return { status: 'boleto registrado' };
  }

  /**
   * Maneja cancelación de suscripción
   */
  private async handleSubscriptionCancellation(webhook: HotmartWebhookDto) {
    const { data } = webhook;
    const subscriber = data?.subscription?.subscriber;
    const telefono = subscriber?.phone || '';

    const contacto = await this.bitrixService.buscarContactoPorTelefono(telefono);
    if (contacto) {
      const negociacion = await this.bitrixService.buscarNegociacionPorContacto(contacto.ID);
      if (negociacion) {
        const mensaje = `Suscripción cancelada: ${data?.subscription?.plan?.name || 'Plan'}`;
        await this.bitrixService.registrarActividad(negociacion.ID, mensaje, 'Hotmart Suscripción: ');
      }
    }

    return { status: 'cancelación de suscripción registrada' };
  }

  /**
   * Maneja reactivación de suscripción
   */
  private async handleSubscriptionReactivation(webhook: HotmartWebhookDto) {
    const { data } = webhook;
    const subscriber = data?.subscription?.subscriber;
    const telefono = subscriber?.phone || '';

    const contacto = await this.bitrixService.buscarContactoPorTelefono(telefono);
    if (contacto) {
      const negociacion = await this.bitrixService.buscarNegociacionPorContacto(contacto.ID);
      if (negociacion) {
        const mensaje = `Suscripción reactivada: ${data?.subscription?.plan?.name || 'Plan'}`;
        await this.bitrixService.registrarActividad(negociacion.ID, mensaje, 'Hotmart Suscripción: ');
      }
    }

    return { status: 'reactivación de suscripción registrada' };
  }

  /**
   * Maneja cambio de plan
   */
  private async handleSwitchPlan(webhook: HotmartWebhookDto) {
    const { data } = webhook;
    const subscriber = data?.subscription?.subscriber;
    const telefono = subscriber?.phone || '';

    const contacto = await this.bitrixService.buscarContactoPorTelefono(telefono);
    if (contacto) {
      const negociacion = await this.bitrixService.buscarNegociacionPorContacto(contacto.ID);
      if (negociacion) {
        const mensaje = `Cambio de plan a: ${data?.subscription?.plan?.name || 'Nuevo Plan'}`;
        await this.bitrixService.registrarActividad(negociacion.ID, mensaje, 'Hotmart Club: ');
      }
    }

    return { status: 'cambio de plan registrado' };
  }

  /**
   * Crea una negociación específica para Hotmart
   */
  private async crearNegociacionHotmart(
    contactId: number,
    nombre: string,
    producto: string,
    precio: number,
    moneda: string,
  ): Promise<number> {
    // Aquí puedes personalizar el embudo y etapa para Hotmart
    // Por ahora uso valores genéricos, pero deberías ajustarlos según tu configuración de Bitrix
    const axios = require('axios');
    
    const dealAdd = `https://bitrix.elsagrario.fin.ec/rest/138/wswyvle82l8ajlut/crm.deal.add.json`;
    
    const { data } = await axios.post(dealAdd, {
      fields: {
        TITLE: `Hotmart: ${producto} - ${nombre}`,
        CONTACT_ID: contactId,
        OPPORTUNITY: precio,
        CURRENCY_ID: moneda,
        // Ajusta estos valores según tu configuración de Bitrix
        // CATEGORY_ID: '7', // ID del embudo de Hotmart (crea uno específico)
        // STAGE_ID: 'C7:NEW', // Etapa inicial
      },
    });

    return data.result;
  }

  /**
   * Extrae el teléfono del comprador
   */
  private extractPhone(buyer: any): string {
    return buyer?.checkout_phone || buyer?.phone || '';
  }

  /**
   * Construye un mensaje detallado de la compra
   */
  private buildPurchaseMessage(webhook: HotmartWebhookDto): string {
    const { data } = webhook;
    const product = data?.product;
    const purchase = data?.purchase;
    const buyer = data?.buyer;

    const lines = [
      `✅ COMPRA APROBADA`,
      `Producto: ${product?.name || 'N/A'}`,
      `Valor: ${purchase?.price?.currency_code || ''} ${purchase?.price?.value || 0}`,
      `Método de pago: ${purchase?.payment?.method || 'N/A'}`,
      `Email: ${buyer?.email || 'N/A'}`,
      `Transacción: ${purchase?.transaction || 'N/A'}`,
    ];

    if (purchase?.recurrency_number) {
      lines.push(`Recurrencia: ${purchase.recurrency_number}`);
    }

    return lines.join('\n');
  }

  /**
   * Asegura que existe el directorio de logs
   */
  private ensureLogDirectory() {
    const logDir = path.dirname(this.LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
      this.logger.log(`Directorio de logs creado: ${logDir}`);
    }
  }

  /**
   * Guarda logs en archivo
   * Similar al file_put_contents de PHP
   */
  async logToFile(level: string, data: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logLine = `${timestamp} [${level}] → ${JSON.stringify(data)}\n`;
      
      fs.appendFileSync(this.LOG_FILE, logLine, 'utf8');
    } catch (error) {
      this.logger.error(`Error escribiendo log: ${error.message}`);
    }
  }

  /**
   * Envía email de alerta
   * Similar al wp_mail de WordPress
   */
  async sendEmailAlert(subject: string, payload: any): Promise<boolean> {
    if (!this.EMAIL_ENABLED) {
      this.logger.debug(`Email deshabilitado. Asunto: ${subject}`);
      return false;
    }

    try {
      // OPCIÓN 1: Usando un servicio de email (ejemplo con SendGrid)
      // Descomentar y configurar si tienes SendGrid
      /*
      const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
      if (SENDGRID_API_KEY) {
        const response = await axios.post(
          'https://api.sendgrid.com/v3/mail/send',
          {
            personalizations: [
              {
                to: [{ email: this.NOTIFICATION_EMAIL }],
                subject: subject,
              },
            ],
            from: { email: 'noreply@ulpik.com', name: 'Bitrix Tunnel' },
            content: [
              {
                type: 'text/html',
                value: this.buildEmailHtml(subject, payload),
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        this.logger.log(`Email enviado: ${subject}`);
        return true;
      }
      */

      // OPCIÓN 2: Logging del email (para desarrollo)
      this.logger.log(`[EMAIL] ${subject}`);
      this.logger.debug(`Contenido: ${JSON.stringify(payload, null, 2)}`);
      
      // Guardar el "email" en un archivo
      const emailLogFile = path.join(process.cwd(), 'logs', 'emails.log');
      const emailLog = {
        timestamp: new Date().toISOString(),
        to: this.NOTIFICATION_EMAIL,
        subject,
        payload,
      };
      
      fs.appendFileSync(
        emailLogFile,
        JSON.stringify(emailLog, null, 2) + '\n---\n\n',
        'utf8'
      );

      return true;
    } catch (error) {
      this.logger.error(`Error enviando email: ${error.message}`);
      return false;
    }
  }

  /**
   * Construye el HTML del email
   */
  private buildEmailHtml(subject: string, payload: any): string {
    const jsonFormatted = JSON.stringify(payload, null, 2)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5;">
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">🔔 Hotmart Webhook Notification</h2>
          <p><strong>Asunto:</strong> ${subject}</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace; font-size: 12px; line-height: 1.4;">${jsonFormatted}</pre>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px; margin-bottom: 0;">
            <em>Este email fue generado automáticamente por Bitrix Tunnel</em><br>
            <em>Timestamp: ${new Date().toISOString()}</em>
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

