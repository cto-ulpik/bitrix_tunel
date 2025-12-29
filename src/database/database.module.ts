import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curso } from '../cursos/entities/curso.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [Curso],
      synchronize: true, // Solo para desarrollo, en producción usar migraciones
      logging: false,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}