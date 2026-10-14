import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn({ name: 'employee_id' })
  employee_id!: number;

  @Column({ name: 'first_name', length: 50 })
  first_name!: string;

  @Column({ name: 'last_name', length: 50 })
  last_name!: string;

  @Column({ name: 'position', length: 50 })
  position!: string;

  @Column({ name: 'phone', length: 20, nullable: true })
  phone!: string;

  @Column({ name: 'email', length: 100, unique: true, nullable: true })
  email!: string;
}