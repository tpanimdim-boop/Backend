import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

type ResourceConfig = {
  table: string;
  id: string;
  required: string[];
  fields: string[];
};

const resources: Record<string, ResourceConfig> = {
  customers: {
    table: 'customers',
    id: 'customer_id',
    required: ['first_name', 'last_name'],
    fields: [
      'first_name',
      'last_name',
      'email',
      'phone',
      'address',
    ],
  },
  flowers: {
    table: 'flowers',
    id: 'flower_id',
    required: [
      'category_id',
      'supplier_id',
      'flower_name',
      'price',
    ],
    fields: [
      'category_id',
      'supplier_id',
      'flower_name',
      'color',
      'price',
      'stock_quantity',
      'description',
    ],
  },
  orders: {
    table: 'orders',
    id: 'order_id',
    required: ['customer_id', 'employee_id'],
    fields: [
      'customer_id',
      'employee_id',
      'order_date',
      'total_amount',
      'status',
    ],
  },
  'order-items': {
    table: 'order_items',
    id: 'order_item_id',
    required: ['order_id', 'flower_id', 'unit_price'],
    fields: [
      'order_id',
      'flower_id',
      'quantity',
      'unit_price',
    ],
  },
  payments: {
    table: 'payments',
    id: 'payment_id',
    required: ['order_id', 'amount'],
    fields: [
      'order_id',
      'payment_date',
      'amount',
      'payment_method',
      'payment_status',
    ],
  },
  deliveries: {
    table: 'deliveries',
    id: 'delivery_id',
    required: [
      'order_id',
      'delivery_address',
      'recipient_name',
    ],
    fields: [
      'order_id',
      'delivery_date',
      'delivery_address',
      'delivery_status',
      'recipient_name',
    ],
  },
};

@Injectable()
export class ShopService {
  constructor(private readonly db: DataSource) {}

  private config(resource: string): ResourceConfig {
    if (!Object.prototype.hasOwnProperty.call(resources, resource)) {
      throw new NotFoundException('Unknown resource');
    }

    return resources[resource];
  }

  private checkId(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid ID');
    }
  }

  private validate(
    resource: string,
    body: Record<string, unknown>,
    creating: boolean,
  ): string[] {
    const config = this.config(resource);

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      throw new BadRequestException('Body must be an object');
    }

    const keys = Object.keys(body);

    if (!keys.length) {
      throw new BadRequestException('Body cannot be empty');
    }

    for (const key of keys) {
      if (!config.fields.includes(key)) {
        throw new BadRequestException(`Unknown field: ${key}`);
      }
    }

    if (creating) {
      for (const field of config.required) {
        if (
          body[field] === undefined ||
          body[field] === null
        ) {
          throw new BadRequestException(`${field} is required`);
        }
      }
    }

    const lengths: Record<string, number> = {
      first_name: 50,
      last_name: 50,
      email: 100,
      phone: 20,
      address: 255,
      flower_name: 100,
      color: 50,
      description: 255,
      status: 30,
      payment_method: 50,
      payment_status: 30,
      delivery_address: 255,
      delivery_status: 30,
      recipient_name: 100,
    };

    const nullable = [
      'email',
      'phone',
      'address',
      'color',
      'description',
      'delivery_date',
    ];

    const amountFields = [
      'price',
      'unit_price',
      'amount',
      'total_amount',
    ];

    for (const key of keys) {
      const value = body[key];

      if (value === null) {
        if (!nullable.includes(key)) {
          throw new BadRequestException(
            `${key} cannot be null`,
          );
        }

        continue;
      }

      if (key.endsWith('_id')) {
        if (
          typeof value !== 'number' ||
          !Number.isSafeInteger(value) ||
          value <= 0
        ) {
          throw new BadRequestException(
            `${key} must be a positive integer`,
          );
        }

        continue;
      }

      if (
        key === 'stock_quantity' ||
        key === 'quantity'
      ) {
        const minimum = key === 'quantity' ? 1 : 0;

        if (
          typeof value !== 'number' ||
          !Number.isSafeInteger(value) ||
          value < minimum ||
          value > 2147483647
        ) {
          throw new BadRequestException(
            `${key} must be an integer from ${minimum} to 2147483647`,
          );
        }

        continue;
      }

      if (amountFields.includes(key)) {
        if (
          typeof value !== 'number' ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > 99999999.99 ||
          Math.abs(
            value * 100 - Math.round(value * 100),
          ) > 0.000001
        ) {
          throw new BadRequestException(
            `${key} must be a nonnegative amount with at most 2 decimal places`,
          );
        }

        continue;
      }

      if (key.endsWith('_date')) {
        if (
          typeof value !== 'string' ||
          !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
        ) {
          throw new BadRequestException(
            `${key} must use YYYY-MM-DD HH:mm:ss`,
          );
        }

        const parsed = new Date(
          value.replace(' ', 'T') + 'Z',
        );

        if (
          Number.isNaN(parsed.getTime()) ||
          parsed
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ') !== value ||
          Number(value.slice(0, 4)) < 1000
        ) {
          throw new BadRequestException(
            `${key} is not a valid date`,
          );
        }

        continue;
      }

      if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.length > (lengths[key] ?? 255)
      ) {
        throw new BadRequestException(
          `${key} contains invalid text`,
        );
      }
    }

    return keys;
  }

  private async write<T>(
    action: () => Promise<T>,
  ): Promise<T> {
    try {
      return await action();
    } catch (error) {
      const err = error as {
        code?: string;
        driverError?: {
          code?: string;
        };
      };

      const code = err.driverError?.code ?? err.code;

      if (code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Duplicate value');
      }

      if (code === 'ER_NO_REFERENCED_ROW_2') {
        throw new BadRequestException(
          'A referenced ID does not exist',
        );
      }

      if (code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Another record still uses this record',
        );
      }

      if (
        [
          'ER_DATA_TOO_LONG',
          'ER_TRUNCATED_WRONG_VALUE',
          'ER_BAD_NULL_ERROR',
          'ER_WARN_DATA_OUT_OF_RANGE',
        ].includes(code ?? '')
      ) {
        throw new BadRequestException(
          'Invalid field value',
        );
      }

      throw error;
    }
  }

  async findAll(resource: string) {
    const config = this.config(resource);

    return this.db.query(
      `SELECT * FROM \`${config.table}\`
       ORDER BY \`${config.id}\``,
    );
  }

  async findOne(resource: string, id: number) {
    const config = this.config(resource);
    this.checkId(id);

    const rows = await this.db.query(
      `SELECT * FROM \`${config.table}\`
       WHERE \`${config.id}\` = ?`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException('Record not found');
    }

    return rows[0];
  }

  async create(
    resource: string,
    body: Record<string, unknown>,
  ) {
    const config = this.config(resource);
    const keys = this.validate(resource, body, true);

    const columns = keys
      .map((key) => `\`${key}\``)
      .join(', ');

    const placeholders = keys
      .map(() => '?')
      .join(', ');

    const result = await this.write(() =>
      this.db.query(
        `INSERT INTO \`${config.table}\`
         (${columns}) VALUES (${placeholders})`,
        keys.map((key) => body[key]),
      ),
    );

    return this.findOne(resource, result.insertId);
  }

  async update(
    resource: string,
    id: number,
    body: Record<string, unknown>,
  ) {
    const config = this.config(resource);
    await this.findOne(resource, id);

    const keys = this.validate(resource, body, false);

    const assignments = keys
      .map((key) => `\`${key}\` = ?`)
      .join(', ');

    await this.write(() =>
      this.db.query(
        `UPDATE \`${config.table}\`
         SET ${assignments}
         WHERE \`${config.id}\` = ?`,
        [...keys.map((key) => body[key]), id],
      ),
    );

    return this.findOne(resource, id);
  }

  async remove(resource: string, id: number) {
    const config = this.config(resource);
    await this.findOne(resource, id);

    await this.write(() =>
      this.db.query(
        `DELETE FROM \`${config.table}\`
         WHERE \`${config.id}\` = ?`,
        [id],
      ),
    );

    return {
      deleted: true,
      [config.id]: id,
    };
  }
}