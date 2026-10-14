import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FlowerModule } from './flower/flower.module'; // <--- 1. I-import ito

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'mysql-4c445a2-gbox-91a7.j.aivencloud.com',
      port: Number(process.env.DB_PORT) || 15098,
      username: process.env.DB_USER || 'avnadmin',
      password: process.env.DB_PASSWORD || 'AVNS_xW3-mjfezU91NnpsgGt',
      database: process.env.DB_NAME || 'defaultdb', // <--- 2. Baguhin ang database name
      autoLoadEntities: true,
      synchronize: false,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    UsersModule,
    AuthModule,
    FlowerModule, // <--- 3. Idagdag sa imports list
  ],
})
export class AppModule {}