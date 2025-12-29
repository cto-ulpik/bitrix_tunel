import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CursosService } from './cursos.service';
import { Curso } from './entities/curso.entity';

@ApiTags('Cursos')
@Controller('cursos')
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los cursos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los cursos',
    type: [Curso],
  })
  async findAll(): Promise<Curso[]> {
    return this.cursosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un curso por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Curso encontrado',
    type: Curso,
  })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Curso> {
    return this.cursosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo curso' })
  @ApiBody({
    description: 'Datos del curso a crear',
    schema: {
      type: 'object',
      required: ['id', 'curso', 'mes', 'desc'],
      properties: {
        id: { type: 'number', example: 1234567 },
        curso: { type: 'string', example: 'Nuevo Curso' },
        mes: { type: 'string', example: 'Enero' },
        desc: { type: 'string', example: 'Descripción del curso' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Curso creado exitosamente',
    type: Curso,
  })
  async create(@Body() cursoData: Partial<Curso>): Promise<Curso> {
    return this.cursosService.create(cursoData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un curso existente' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del curso a actualizar' })
  @ApiBody({
    description: 'Datos del curso a actualizar',
    schema: {
      type: 'object',
      properties: {
        curso: { type: 'string', example: 'Curso Actualizado' },
        mes: { type: 'string', example: 'Febrero' },
        desc: { type: 'string', example: 'Nueva descripción' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Curso actualizado exitosamente',
    type: Curso,
  })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() cursoData: Partial<Curso>,
  ): Promise<Curso> {
    return this.cursosService.update(id, cursoData);
  }
}

