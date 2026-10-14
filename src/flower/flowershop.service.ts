import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { Supplier } from './supplier.entity';
import { Employee } from './employee.entity';

@Injectable()
export class FlowershopService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  // ================= CATEGORIES =================
  createCategory(data: Partial<Category>) {
    const item = this.categoryRepo.create(data);
    return this.categoryRepo.save(item);
  }

  findAllCategories() {
    return this.categoryRepo.find();
  }

  // ================= SUPPLIERS =================
  createSupplier(data: Partial<Supplier>) {
    const item = this.supplierRepo.create(data);
    return this.supplierRepo.save(item);
  }

  findAllSuppliers() {
    return this.supplierRepo.find();
  }

  async findOneSupplier(id: number) {
    const item = await this.supplierRepo.findOne({ where: { supplier_id: id } });
    if (!item) throw new NotFoundException('Supplier not found');
    return item;
  }

  async updateSupplier(id: number, data: Partial<Supplier>) {
    await this.supplierRepo.update(id, data);
    return this.findOneSupplier(id);
  }

  async removeSupplier(id: number) {
    const item = await this.findOneSupplier(id);
    return this.supplierRepo.remove(item);
  }

  // ================= EMPLOYEES =================
  createEmployee(data: Partial<Employee>) {
    const item = this.employeeRepo.create(data);
    return this.employeeRepo.save(item);
  }

  findAllEmployees() {
    return this.employeeRepo.find();
  }

  async findOneEmployee(id: number) {
    const item = await this.employeeRepo.findOne({ where: { employee_id: id } });
    if (!item) throw new NotFoundException('Employee not found');
    return item;
  }

  async updateEmployee(id: number, data: Partial<Employee>) {
    await this.employeeRepo.update(id, data);
    return this.findOneEmployee(id);
  }

  async removeEmployee(id: number) {
    const item = await this.findOneEmployee(id);
    return this.employeeRepo.remove(item);
  }
}