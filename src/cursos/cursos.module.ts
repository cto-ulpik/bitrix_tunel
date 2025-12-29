import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CursosController } from './cursos.controller';
import { CursosService } from './cursos.service';
import { Curso } from './entities/curso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Curso])],
  controllers: [CursosController],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule implements OnModuleInit {
  private readonly logger = new Logger(CursosModule.name);

  constructor(private readonly cursosService: CursosService) {}

  async onModuleInit() {
    // Inicializar datos al arrancar la aplicación (local y producción)
    this.logger.log('Inicializando datos de cursos...');
    await this.cursosService.seedInitialData();
    this.logger.log('✅ Inicialización de cursos completada');
  }
}

