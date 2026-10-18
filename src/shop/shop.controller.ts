import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShopService } from './shop.service';

@UseGuards(JwtAuthGuard)
@Controller('shop')
export class ShopController {
    FlowershopService: any;
  constructor(private readonly shopService: ShopService) {}

  @Get(':resource')
  findAll(@Param('resource') resource: string) {
    return this.shopService.findAll(resource);
  }

  @Get(':resource/:id')
  findOne(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.shopService.findOne(resource, id);
  }

  @Post(':resource')
  create(
    @Param('resource') resource: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.shopService.create(resource, body);
  }

  @Put(':resource/:id')
  update(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.shopService.update(resource, id, body);
  }

  @Delete(':resource/:id')
  remove(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.shopService.remove(resource, id);
  }
  @UseGuards(JwtAuthGuard)
@Get('categories/:id')
getOneCategory(@Param('id') id: string) {
  return this.FlowershopService.findOneCategory(+id);
}

@UseGuards(JwtAuthGuard)
@Put('categories/:id')
updateCategory(@Param('id') id: string, @Body() body: any) {
  return this.FlowershopService.updateCategory(+id, body);
}

@UseGuards(JwtAuthGuard)
@Delete('categories/:id')
removeCategory(@Param('id') id: string) {
  return this.FlowershopService.removeCategory(+id);
}
}