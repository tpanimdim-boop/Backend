import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FlowerModule } from './flower/flower.module';
import { ShopModule } from './shop/shop.module';
import { databaseOptions } from './database/database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      ...databaseOptions(),
      autoLoadEntities: true,
      synchronize: false,
    }),
    UsersModule,
    AuthModule,
    FlowerModule,
    ShopModule,
  ],
})
export class AppModule {}
