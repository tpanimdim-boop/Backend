import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { databaseOptions } from './database.config';

dotenv.config();

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  pool!: mysql.Pool;

  async onModuleInit() {
    const { username, ...options } = databaseOptions();
    this.pool = mysql.createPool({
      ...options,
      user: username,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // optional: test connection
    const conn = await this.pool.getConnection();
    await conn.ping();
    conn.release();

    console.log('MySQL pool created');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  getPool() {
    return this.pool;
  }
}
