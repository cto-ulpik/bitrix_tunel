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

    // NUEVA LÓGICA: Buscar contacto por nombre Y email
    this.logger.log(`Buscando contacto: Nombre="${nombre}", Email="${email}"`);
    
    let contacto = await this.bitrixService.buscarContactoPorNombreYEmail(nombre, email);
    let contactId: number | null = null;

    if (contacto) {
      contactId = parseInt(contacto.ID);
      this.logger.log(`✅ Contacto encontrado: ID ${contactId}`);
    } else {
      this.logger.log(`❌ No se encontró contacto con nombre "${nombre}" y email "${email}"`);
      this.logger.log('Se creará el deal SIN contacto vinculado (campo vacío)');
    }

    // Buscar negociación existente solo si hay contacto
    let dealId: number;
    let negociacionExistente: any = null;

    if (contactId) {
      negociacionExistente = await this.bitrixService.buscarNegociacionPorContacto(contactId);
    }

    if (negociacionExistente?.ID) {
      dealId = negociacionExistente.ID;
      this.logger.log(`Usando negociación existente: Deal ID ${dealId}`);
    } else {
      // Crear nueva negociación (con o sin contacto)
      dealId = await this.crearNegociacionHotmart(
        contactId, // Puede ser null si no se encontró contacto
        nombre,
        productoNombre,
        precio,
        moneda,
      );
      this.logger.log(`✅ Nueva negociación creada: Deal ID ${dealId}, ContactID: ${contactId || 'VACÍO'}`);
    }

    // Registrar actividad con detalles de la compra
    const mensaje = this.buildPurchaseMessage(webhook);
    await this.bitrixService.registrarActividad(dealId, mensaje, 'Hotmart: ');

    this.logger.log(`Compra procesada exitosamente. Deal ID: ${dealId}`);

    // Crear tarea automática de seguimiento
    let taskId: string | null = null;
    try {
      // Usar fecha actual del servidor y sumar 3 días
      const ahora = new Date();
      const fechaLimite = new Date(ahora.getTime() + (3 * 24 * 60 * 60 * 1000)); // +3 días
      
      // Formato que Bitrix entiende: YYYY-MM-DD HH:mm:ss
      const year = fechaLimite.getFullYear();
      const month = String(fechaLimite.getMonth() + 1).padStart(2, '0');
      const day = String(fechaLimite.getDate()).padStart(2, '0');
      const fechaFormateada = `${year}-${month}-${day} 18:00:00`;
      
      this.logger.log(`📅 Fecha actual: ${ahora.toISOString()}`);
      this.logger.log(`📅 Fecha límite tarea (3 días): ${fechaFormateada}`);
      
      taskId = await this.bitrixService.crearTareaParaNegociacion(
        dealId,
        `Seguimiento post-compra: ${nombre}`,
        `Cliente: ${nombre}
Producto: ${productoNombre}
Monto: ${moneda} ${precio}
Email: ${email}
Teléfono: ${telefono}

Acción requerida: Verificar que el cliente recibió acceso al producto y confirmar su satisfacción.`,
        fechaFormateada,
      );
      
      this.logger.log(`✅ Tarea de seguimiento creada. Task ID: ${taskId}, Fecha límite: ${fechaFormateada}`);
    } catch (error) {
      this.logger.error(`❌ Error creando tarea automática: ${error.message}`);
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

    const contacto = await this.bitrixService.buscarContactoPorTelefonoOEmail(telefono);
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

    const contacto = await this.bitrixService.buscarContactoPorTelefonoOEmail(telefono);
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

    const contacto = await this.bitrixService.buscarContactoPorTelefonoOEmail(telefono);
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
    // ESTRUCTURA REAL: subscriber está en data.subscriber (no en data.subscription.subscriber)
    const subscriber = data?.subscriber;
    const product = data?.product;
    const subscription = data?.subscription;

    if (!subscriber || !subscriber.email) {
      this.logger.warn('Datos de suscriptor incompletos (email requerido)');
      return { status: 'datos incompletos' };
    }

    // Extraer información del suscriptor
    const nombre = subscriber.name || 'Sin nombre';
    const email = subscriber.email;
    const telefono = this.extractPhoneFromSubscriber(subscriber);
    const planNombre = subscription?.plan?.name || 'Plan';
    const productoNombre = product?.name || 'Suscripción Hotmart';

    this.logger.log(`❌ Cancelación de suscripción - Email: ${email}, Nombre: "${nombre}", Tel: ${telefono}`);

    // Buscar contacto SOLO por email (más confiable según requerimiento)
    let contacto = await this.bitrixService.buscarContactoPorEmail(email);
    let contactId: number | null = null;

    if (contacto) {
      contactId = parseInt(contacto.ID);
      this.logger.log(`✅ Contacto encontrado por email: ID ${contactId}`);
    } else {
      this.logger.log(`❌ No se encontró contacto con email "${email}" - se creará deal sin vincular`);
    }

    // Crear deal en etapa de CANCELACIÓN (C44:UC_Z9UPZW)
    const dealId = await this.bitrixService.crearDealCancelacion(
      contactId,
      nombre,
      productoNombre,
      telefono,
      email,
    );

    this.logger.log(`✅ Deal cancelación creado: ID ${dealId}, ContactID: ${contactId || 'VACÍO'}, Embudo: 44, Etapa: C44:UC_Z9UPZW`);

    // Registrar actividad con detalles de la cancelación
    const mensaje = this.buildCancellationMessage(webhook);
    await this.bitrixService.registrarActividad(dealId, mensaje, 'Hotmart Cancelación: ');

    // Registrar en auditoría
    await this.auditService.log({
      action: 'cancelacion_suscripcion',
      module: 'hotmart',
      event_type: webhook.event,
      bitrix_contact_id: contactId ? String(contactId) : undefined,
      bitrix_deal_id: String(dealId),
      user_name: nombre,
      user_phone: telefono,
      user_email: email,
      product_name: productoNombre,
      webhook_id: webhook.id,
      status: 'success',
      metadata: {
        plan: planNombre,
        subscription_id: subscription?.id,
        subscriber_code: subscriber.code,
      },
    });

    return { 
      status: 'cancelación de suscripción registrada',
      contactId,
      dealId,
    };
  }

  /**
   * Maneja reactivación de suscripción
   */
  private async handleSubscriptionReactivation(webhook: HotmartWebhookDto) {
    const { data } = webhook;
    const subscriber = data?.subscription?.subscriber;
    const telefono = subscriber?.phone || '';

    const contacto = await this.bitrixService.buscarContactoPorTelefonoOEmail(telefono);
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

    const contacto = await this.bitrixService.buscarContactoPorTelefonoOEmail(telefono);
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
    contactId: number | null,
    nombre: string,
    producto: string,
    precio: number,
    moneda: string,
  ): Promise<number> {
    // Usar el mismo servicio de Bitrix para crear deals
    // Esto asegura que use ulpik.bitrix24.es
    return await this.bitrixService.crearDealHotmart(
      contactId,
      nombre,
      producto,
      precio,
      moneda,
    );
  }

  /**
   * Extrae el teléfono del comprador
   */
  private extractPhone(buyer: any): string {
    return buyer?.checkout_phone || buyer?.phone || '';
  }

  /**
   * Extrae teléfono de un suscriptor (estructura de cancelación)
   * Estructura: { dddPhone, phone, dddCell, cell }
   */
  private extractPhoneFromSubscriber(subscriber: any): string {
    const phoneObj = subscriber?.phone;
    if (!phoneObj) return '';

    // Priorizar celular sobre teléfono fijo
    if (phoneObj.cell && phoneObj.dddCell) {
      return `+${phoneObj.dddCell}${phoneObj.cell}`;
    }
    if (phoneObj.cell) {
      return phoneObj.cell;
    }
    if (phoneObj.phone && phoneObj.dddPhone) {
      return `+${phoneObj.dddPhone}${phoneObj.phone}`;
    }
    if (phoneObj.phone) {
      return phoneObj.phone;
    }
    
    return '';
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
   * Construye un mensaje detallado de cancelación
   */
  private buildCancellationMessage(webhook: HotmartWebhookDto): string {
    const { data } = webhook;
    // ESTRUCTURA REAL: subscriber está en data.subscriber
    const subscriber = data?.subscriber;
    const product = data?.product;
    const subscription = data?.subscription;

    const telefono = this.extractPhoneFromSubscriber(subscriber);
    const fechaCancelacion = data?.cancellation_date 
      ? new Date(data.cancellation_date).toLocaleString('es-ES')
      : 'N/A';

    const lines = [
      `❌ CANCELACIÓN DE SUSCRIPCIÓN`,
      `Plan: ${subscription?.plan?.name || 'N/A'}`,
      `Producto: ${product?.name || 'N/A'}`,
      ``,
      `👤 Datos del Cliente:`,
      `Nombre: ${subscriber?.name || 'N/A'}`,
      `Email: ${subscriber?.email || 'N/A'}`,
      `Teléfono: ${telefono || 'N/A'}`,
      `Código suscriptor: ${subscriber?.code || 'N/A'}`,
      ``,
      `📅 Información de Cancelación:`,
      `Fecha de cancelación: ${fechaCancelacion}`,
      `ID Suscripción: ${subscription?.id || 'N/A'}`,
      `Valor de recurrencia: ${data?.actual_recurrence_value || 'N/A'}`,
      ``,
      `Fecha del evento: ${new Date().toLocaleString('es-ES')}`,
    ];

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

