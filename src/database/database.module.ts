import { Module } from '@nestjs/common';

// DatabaseModule vacío - los servicios de auditoría fueron eliminados
// Este módulo se mantiene por compatibilidad pero no exporta nada
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class DatabaseModule {}