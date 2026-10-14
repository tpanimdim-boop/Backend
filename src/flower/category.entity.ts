import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn({ name: 'category_id' })
  category_id!: number;

  @Column({ name: 'category_name', length: 100, unique: true })
  category_name!: string;

  @Column({ name: 'description', length: 255, nullable: true })
  description!: string;
}