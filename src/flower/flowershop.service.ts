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

  async createCategory(data: Partial<Category>) {
    const item = this.categoryRepo.create({
      category_name: data.category_name,
      description: data.description,
    });

    return this.categoryRepo.save(item);
  }

  async findAllCategories() {
    return this.categoryRepo.find();
  }

  async findOneCategory(id: number) {
    const item = await this.categoryRepo.findOne({
      where: { category_id: id },
    });

    if (!item) {
      throw new NotFoundException('Category not found');
    }

    return item;
  }

  async updateCategory(id: number, data: Partial<Category>) {
    await this.findOneCategory(id);

    await this.categoryRepo.update(id, {
      category_name: data.category_name,
      description: data.description,
    });

    return this.findOneCategory(id);
  }

  async removeCategory(id: number) {
    const item = await this.findOneCategory(id);

    await this.categoryRepo.remove(item);

    return {
      deleted: true,
      category_id: id,
    };
  }

  async createSupplier(data: Partial<Supplier>) {
    const item = this.supplierRepo.create(data);

    return this.supplierRepo.save(item);
  }

  async findAllSuppliers() {
    return this.supplierRepo.find();
  }

  async findOneSupplier(id: number) {
    const item = await this.supplierRepo.findOne({
      where: { supplier_id: id },
    });

    if (!item) {
      throw new NotFoundException('Supplier not found');
    }

    return item;
  }

  async updateSupplier(id: number, data: Partial<Supplier>) {
    await this.findOneSupplier(id);

    const { supplier_id, ...fields } = data;

    await this.supplierRepo.update(id, fields);

    return this.findOneSupplier(id);
  }

  async removeSupplier(id: number) {
    const item = await this.findOneSupplier(id);

    await this.supplierRepo.remove(item);

    return {
      deleted: true,
      supplier_id: id,
    };
  }

  async createEmployee(data: Partial<Employee>) {
    const item = this.employeeRepo.create(data);

    return this.employeeRepo.save(item);
  }

  async findAllEmployees() {
    return this.employeeRepo.find();
  }

  async findOneEmployee(id: number) {
    const item = await this.employeeRepo.findOne({
      where: { employee_id: id },
    });

    if (!item) {
      throw new NotFoundException('Employee not found');
    }

    return item;
  }

  async updateEmployee(id: number, data: Partial<Employee>) {
    await this.findOneEmployee(id);

    const { employee_id, ...fields } = data;

    await this.employeeRepo.update(id, fields);

    return this.findOneEmployee(id);
  }

  async removeEmployee(id: number) {
    const item = await this.findOneEmployee(id);

    await this.employeeRepo.remove(item);

    return {
      deleted: true,
      employee_id: id,
    };
  }
}