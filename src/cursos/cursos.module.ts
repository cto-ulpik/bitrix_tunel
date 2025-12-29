import { Module, OnModuleInit } from '@nestjs/common';
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
  constructor(private readonly cursosService: CursosService) {}

  async onModuleInit() {
    // Inicializar datos al arrancar la aplicación
    await this.cursosService.seedInitialData();
  }
}

