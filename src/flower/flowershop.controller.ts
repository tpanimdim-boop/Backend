import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FlowershopService } from './flowershop.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/shop-access.guard';

@Controller()
export class FlowershopController {
  constructor(private readonly flowershopService: FlowershopService) {}

  // ================= CATEGORIES =================
  @UseGuards(JwtAuthGuard)
  @Get('categories')
  getAllCategories() {
    return this.flowershopService.findAllCategories();
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Post('categories')
  createCategory(@Body() body: any) {
    return this.flowershopService.createCategory(body);
  }

  // ================= SUPPLIERS =================
  @UseGuards(JwtAuthGuard, StaffGuard)
  @Get('suppliers')
  getAllSuppliers() {
    return this.flowershopService.findAllSuppliers();
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Get('suppliers/:id')
  getOneSupplier(@Param('id') id: string) {
    return this.flowershopService.findOneSupplier(+id);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Post('suppliers')
  createSupplier(@Body() body: any) {
    return this.flowershopService.createSupplier(body);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Put('suppliers/:id')
  updateSupplier(@Param('id') id: string, @Body() body: any) {
    return this.flowershopService.updateSupplier(+id, body);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Delete('suppliers/:id')
  removeSupplier(@Param('id') id: string) {
    return this.flowershopService.removeSupplier(+id);
  }

  // ================= EMPLOYEES =================
  @UseGuards(JwtAuthGuard, StaffGuard)
  @Get('employees')
  getAllEmployees() {
    return this.flowershopService.findAllEmployees();
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Get('employees/:id')
  getOneEmployee(@Param('id') id: string) {
    return this.flowershopService.findOneEmployee(+id);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Post('employees')
  createEmployee(@Body() body: any) {
    return this.flowershopService.createEmployee(body);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Put('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() body: any) {
    return this.flowershopService.updateEmployee(+id, body);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Delete('employees/:id')
  removeEmployee(@Param('id') id: string) {
    return this.flowershopService.removeEmployee(+id);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: any) {
    return this.flowershopService.updateCategory(+id, body);
  }

  @UseGuards(JwtAuthGuard, StaffGuard)
  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.flowershopService.removeCategory(+id);
  }
}
