import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('cursos')
export class Curso {
  @PrimaryColumn()
  id: number;

  @Column()
  curso: string;

  @Column()
  mes: string;

  @Column()
  desc: string;
}

