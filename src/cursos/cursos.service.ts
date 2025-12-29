import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curso } from './entities/curso.entity';

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private readonly cursoRepository: Repository<Curso>,
  ) {}

  // GET - Obtener todos los cursos
  async findAll(): Promise<Curso[]> {
    return this.cursoRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  // GET - Obtener un curso por ID
  async findOne(id: number): Promise<Curso> {
    const curso = await this.cursoRepository.findOne({
      where: { id },
    });

    if (!curso) {
      throw new NotFoundException(`Curso con ID ${id} no encontrado`);
    }

    return curso;
  }

  // POST - Crear un nuevo curso
  async create(cursoData: Partial<Curso>): Promise<Curso> {
    const curso = this.cursoRepository.create(cursoData);
    return this.cursoRepository.save(curso);
  }

  // PUT - Actualizar un curso existente
  async update(id: number, cursoData: Partial<Curso>): Promise<Curso> {
    const curso = await this.findOne(id); // Esto lanzará NotFoundException si no existe

    Object.assign(curso, cursoData);
    return this.cursoRepository.save(curso);
  }

  // Método auxiliar para inicializar datos
  async seedInitialData(): Promise<void> {
    const cursosIniciales = [
      { id: 5634737, curso: 'DGW', mes: 'Enero', desc: 'DGW' },
      { id: 6647281, curso: 'Emprende MMV', mes: 'Febrero', desc: 'Emprende MMV' },
      { id: 6091983, curso: 'Impuestos sin Miedo', mes: 'marzo', desc: 'Impuestos sin Miedo' },
      { id: 6647284, curso: 'Evento presencial Quito', mes: 'abril', desc: 'Evento presencial Quito' },
      { id: 6647285, curso: 'Curso de alguien del team (nuevo o existente)', mes: 'mayo', desc: 'Curso de alguien del team (nuevo o existente)' },
      { id: 6442736, curso: 'Cripto Pro  (speed launch)', mes: 'junio', desc: 'Cripto Pro  (speed launch)' },
      { id: 5634738, curso: 'DGW', mes: 'julio', desc: 'DGW' },
      { id: 6647289, curso: 'Curso de alguien del team (nuevo o existente)', mes: 'agosto', desc: 'Curso de alguien del team (nuevo o existente)' },
      { id: 6647280, curso: 'Emprende MMV (2ª edición)', mes: 'septiembre', desc: 'Emprende MMV (2ª edición)' },
      { id: 5634711, curso: 'DGW (3ª edición)', mes: 'octubre', desc: 'DGW (3ª edición)' },
      { id: 6442712, curso: 'Cripto Pro (2ª edición)', mes: 'noviembre', desc: 'Cripto Pro (2ª edición)' },
      { id: 6647213, curso: 'Nuevo curso que facture 15k', mes: 'diciembre', desc: 'Nuevo curso que facture 15k' },
      { id: 5845552, curso: 'Ulpik Priv - Comunidad', mes: 'Ulpik Priv - Comunidad', desc: 'Ulpik Priv - Comunidad' },
    ];

    for (const cursoData of cursosIniciales) {
      const existe = await this.cursoRepository.findOne({
        where: { id: cursoData.id },
      });

      if (!existe) {
        await this.cursoRepository.save(cursoData);
      }
    }
  }
}

