import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  timestamp: Date;

  // Tipo de acción realizada
  @Column()
  action: string; // 'crear_contacto', 'crear_negociacion', 'registrar_actividad', etc.

  // Módulo que realizó la acción
  @Column()
  module: string; // 'hotmart', 'jelou', 'bitrix'

  // Tipo de evento (si viene de webhook)
  @Column({ nullable: true })
  event_type: string; // 'PURCHASE_COMPLETE', 'SUBSCRIPTION_CANCELLATION', etc.

  // IDs relacionados de Bitrix
  @Column({ nullable: true })
  bitrix_contact_id: string;

  @Column({ nullable: true })
  bitrix_deal_id: string;

  @Column({ nullable: true })
  bitrix_activity_id: string;

  // Datos del usuario/comprador
  @Column({ nullable: true })
  user_name: string;

  @Column({ nullable: true })
  user_email: string;

  @Column({ nullable: true })
  user_phone: string;

  // Información del producto/servicio
  @Column({ nullable: true })
  product_name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ nullable: true })
  currency: string;

  // Detalles adicionales en JSON
  @Column({ type: 'text', nullable: true })
  metadata: string; // JSON stringificado con datos adicionales

  // Estado de la operación
  @Column({ default: 'success' })
  status: string; // 'success', 'error', 'pending'

  @Column({ type: 'text', nullable: true })
  error_message: string;

  // Información de origen
  @Column({ nullable: true })
  source_ip: string;

  @Column({ nullable: true })
  webhook_id: string; // ID del webhook de Hotmart/Jelou

  // Tiempo de procesamiento
  @Column({ type: 'integer', nullable: true })
  processing_time_ms: number;
}

