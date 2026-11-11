import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  controllers: [CheckoutController, ShopController],
  providers: [ShopService, CheckoutService],
})
export class ShopModule {}
