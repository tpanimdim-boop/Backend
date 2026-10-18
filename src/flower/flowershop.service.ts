import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  private validateId(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid ID');
    }
  }

  async findAllCategories() {
    return this.categoryRepo.find();
  }

  async findOneCategory(id: number) {
    this.validateId(id);

    const item = await this.categoryRepo.findOne({
      where: { category_id: id },
    });

    if (!item) {
      throw new NotFoundException('Category not found');
    }

    return item;
  }

  async createCategory(data: Partial<Category>) {
    const item = this.categoryRepo.create({
      category_name: data.category_name,
      description: data.description,
    });

    return this.categoryRepo.save(item);
  }

  async updateCategory(id: number, data: Partial<Category>) {
    const item = await this.findOneCategory(id);
    let changed = false;

    if (data.category_name !== undefined) {
      item.category_name = data.category_name;
      changed = true;
    }

    if (data.description !== undefined) {
      item.description = data.description;
      changed = true;
    }

    if (!changed) {
      throw new BadRequestException('No valid fields to update');
    }

    return this.categoryRepo.save(item);
  }


  async findAllSuppliers() {
    return this.supplierRepo.find();
  }

  async findOneSupplier(id: number) {
    this.validateId(id);

    const item = await this.supplierRepo.findOne({
      where: { supplier_id: id },
    });

    if (!item) {
      throw new NotFoundException('Supplier not found');
    }

    return item;
  }

  async createSupplier(data: Partial<Supplier>) {
    const item = this.supplierRepo.create({
      supplier_name: data.supplier_name,
      contact_number: data.contact_number,
      email: data.email,
      address: data.address,
    });

    return this.supplierRepo.save(item);
  }

  async updateSupplier(id: number, data: Partial<Supplier>) {
    const item = await this.findOneSupplier(id);
    let changed = false;

    if (data.supplier_name !== undefined) {
      item.supplier_name = data.supplier_name;
      changed = true;
    }

    if (data.contact_number !== undefined) {
      item.contact_number = data.contact_number;
      changed = true;
    }

    if (data.email !== undefined) {
      item.email = data.email;
      changed = true;
    }

    if (data.address !== undefined) {
      item.address = data.address;
      changed = true;
    }

    if (!changed) {
      throw new BadRequestException('No valid fields to update');
    }

    return this.supplierRepo.save(item);
  }

  async removeSupplier(id: number) {
    const item = await this.findOneSupplier(id);

    await this.supplierRepo.remove(item);

    return {
      deleted: true,
      supplier_id: id,
    };
  }

  async findAllEmployees() {
    return this.employeeRepo.find();
  }

  async findOneEmployee(id: number) {
    this.validateId(id);

    const item = await this.employeeRepo.findOne({
      where: { employee_id: id },
    });

    if (!item) {
      throw new NotFoundException('Employee not found');
    }

    return item;
  }

  async createEmployee(data: Partial<Employee>) {
    const item = this.employeeRepo.create({
      first_name: data.first_name,
      last_name: data.last_name,
      position: data.position,
      phone: data.phone,
      email: data.email,
    });

    return this.employeeRepo.save(item);
  }

  async updateEmployee(id: number, data: Partial<Employee>) {
    const item = await this.findOneEmployee(id);
    let changed = false;

    if (data.first_name !== undefined) {
      item.first_name = data.first_name;
      changed = true;
    }

    if (data.last_name !== undefined) {
      item.last_name = data.last_name;
      changed = true;
    }

    if (data.position !== undefined) {
      item.position = data.position;
      changed = true;
    }

    if (data.phone !== undefined) {
      item.phone = data.phone;
      changed = true;
    }

    if (data.email !== undefined) {
      item.email = data.email;
      changed = true;
    }

    if (!changed) {
      throw new BadRequestException('No valid fields to update');
    }

    return this.employeeRepo.save(item);
  }

  async removeEmployee(id: number) {
    const item = await this.findOneEmployee(id);

    await this.employeeRepo.remove(item);

    return {
      deleted: true,
      employee_id: id,
    };
  }
  async removeCategory(id: number) {
  const category = await this.categoryRepo.findOne({
    where: { category_id: id },
  });

  if (!category) {
    throw new NotFoundException('Category not found');
  }

  await this.categoryRepo.remove(category);

  return {
    deleted: true,
    category_id: id,
  };
}
}
