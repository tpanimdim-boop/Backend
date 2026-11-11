import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest, principal } from '../auth/shop-access.guard';
import { CheckoutService } from './checkout.service';

@UseGuards(JwtAuthGuard)
@Controller('shop')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('checkout')
  checkout(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.checkoutService.checkout(principal(request.user).userId, body);
  }

  @Get('my-orders')
  myOrders(@Req() request: AuthenticatedRequest) {
    return this.checkoutService.myOrders(principal(request.user).userId);
  }

  @Get('my-orders/:id')
  myOrder(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.checkoutService.myOrder(principal(request.user).userId, id);
  }
}
