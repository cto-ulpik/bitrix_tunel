import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface CreateAuditLogDto {
  action: string;
  module: string;
  event_type?: string;
  bitrix_contact_id?: string;
  bitrix_deal_id?: string;
  bitrix_activity_id?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  product_name?: string;
  amount?: number;
  currency?: string;
  metadata?: any;
  status?: string;
  error_message?: string;
  source_ip?: string;
  webhook_id?: string;
  processing_time_ms?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Registra una acción en el sistema
   */
  async log(data: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = this.auditRepository.create({
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
        status: data.status || 'success',
      });

      const saved = await this.auditRepository.save(auditLog);
      const savedId = Array.isArray(saved) ? saved[0]?.id : saved.id;
      this.logger.log(`[AUDIT] ${data.module} - ${data.action} - ID: ${savedId}`);
      
      return Array.isArray(saved) ? saved[0] : saved;
    } catch (error) {
      this.logger.error(`Error guardando audit log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Registra una acción exitosa con datos de Bitrix
   */
  async logBitrixAction(
    action: string,
    module: string,
    contactId?: string,
    dealId?: string,
    activityId?: string,
    additionalData?: Partial<CreateAuditLogDto>,
  ): Promise<AuditLog> {
    return this.log({
      action,
      module,
      bitrix_contact_id: contactId,
      bitrix_deal_id: dealId,
      bitrix_activity_id: activityId,
      status: 'success',
      ...additionalData,
    });
  }

  /**
   * Registra un error
   */
  async logError(
    action: string,
    module: string,
    error: string,
    additionalData?: Partial<CreateAuditLogDto>,
  ): Promise<AuditLog> {
    return this.log({
      action,
      module,
      status: 'error',
      error_message: error,
      ...additionalData,
    });
  }

  /**
   * Obtiene todos los logs con filtros opcionales
   */
  async findAll(options?: {
    module?: string;
    action?: string;
    status?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const query = this.auditRepository.createQueryBuilder('log');

    if (options?.module) {
      query.andWhere('log.module = :module', { module: options.module });
    }

    if (options?.action) {
      query.andWhere('log.action = :action', { action: options.action });
    }

    if (options?.status) {
      query.andWhere('log.status = :status', { status: options.status });
    }

    if (options?.startDate && options?.endDate) {
      query.andWhere('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });
    }

    const total = await query.getCount();

    query
      .orderBy('log.timestamp', 'DESC')
      .skip(options?.offset || 0)
      .take(options?.limit || 50);

    const logs = await query.getMany();

    return { logs, total };
  }

  /**
   * Obtiene logs por Deal ID de Bitrix
   */
  async findByDealId(dealId: string): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { bitrix_deal_id: dealId },
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * Obtiene logs por Contact ID de Bitrix
   */
  async findByContactId(contactId: string): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { bitrix_contact_id: contactId },
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * Obtiene logs por teléfono
   */
  async findByPhone(phone: string): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { user_phone: phone },
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * Obtiene estadísticas
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.auditRepository.createQueryBuilder('log');

    if (startDate && endDate) {
      query.where('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [
      totalActions,
      successCount,
      errorCount,
      byModule,
      byAction,
    ] = await Promise.all([
      query.getCount(),
      query.clone().andWhere('log.status = :status', { status: 'success' }).getCount(),
      query.clone().andWhere('log.status = :status', { status: 'error' }).getCount(),
      query.clone().select('log.module', 'module').addSelect('COUNT(*)', 'count').groupBy('log.module').getRawMany(),
      query.clone().select('log.action', 'action').addSelect('COUNT(*)', 'count').groupBy('log.action').getRawMany(),
    ]);

    return {
      total_actions: totalActions,
      success_count: successCount,
      error_count: errorCount,
      success_rate: totalActions > 0 ? ((successCount / totalActions) * 100).toFixed(2) + '%' : '0%',
      by_module: byModule,
      by_action: byAction,
    };
  }

  /**
   * Limpia logs antiguos (opcional, para mantenimiento)
   */
  async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditRepository
      .createQueryBuilder()
      .delete()
      .where('timestamp < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Limpieza de logs: ${result.affected} registros eliminados`);
    return result.affected || 0;
  }
}
