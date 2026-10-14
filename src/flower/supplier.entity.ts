import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn({ name: 'supplier_id' })
  supplier_id!: number;

  @Column({ name: 'supplier_name', length: 100 })
  supplier_name!: string;

  @Column({ name: 'contact_number', length: 20, nullable: true })
  contact_number!: string;

  @Column({ name: 'email', length: 100, unique: true, nullable: true })
  email!: string;

  @Column({ name: 'address', length: 255, nullable: true })
  address!: string;
}