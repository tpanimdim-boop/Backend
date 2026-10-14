import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Employee } from './employee.entity';
import { Supplier } from './supplier.entity';
import { FlowershopController } from './flowershop.controller';
import { FlowershopService } from './flowershop.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Employee, Supplier])],
  controllers: [FlowershopController],
  providers: [FlowershopService],
})
export class FlowerModule {}