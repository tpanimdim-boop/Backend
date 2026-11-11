import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { checkoutSchema, positiveId, priceInCents } from './checkout.schema';

type OrderRow = {
  order_id: number;
  order_date: Date | string;
  total_amount: string;
  status: string;
  fulfillment: string;
  recipient_name: string;
  email: string;
  phone: string;
  delivery_address: string | null;
  notes: string;
  payment_method: string;
  payment_status: string;
};

type ItemRow = {
  order_item_id: number;
  order_id: number;
  flower_id: number;
  flower_name: string;
  color: string | null;
  quantity: number;
  unit_price: string;
};

type FlowerRow = {
  flower_id: number;
  flower_name: string;
  color: string | null;
  price: string;
  stock_quantity: number;
};
type Order = Omit<OrderRow, 'order_date'> & {
  order_date: string;
  items: ItemRow[];
};
type Queryable = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;

const orderColumns = `o.order_id, o.order_date, o.total_amount, o.status,
  o.fulfillment, o.recipient_name, o.email, o.phone, o.delivery_address,
  o.notes, o.payment_method, o.payment_status`;

@Injectable()
export class CheckoutService {
  constructor(private readonly db: DataSource) {}

  async checkout(userId: number, input: unknown): Promise<Order> {
    if (!positiveId.safeParse(userId).success)
      throw new UnauthorizedException();
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message),
      );
    const data = parsed.data;
    const hash = createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    const runner = this.db.createQueryRunner();
    await runner.connect();
    let started = false;
    try {
      await runner.startTransaction();
      started = true;
      const users: { id: number }[] = await runner.query(
        'SELECT id FROM users WHERE id = ? FOR UPDATE',
        [userId],
      );
      if (!users.length) throw new UnauthorizedException();

      const existing: { order_id: number; request_hash: string }[] =
        await runner.query(
          `SELECT o.order_id, o.request_hash FROM orders o
         JOIN customers c ON c.customer_id = o.customer_id
         WHERE c.user_id = ? AND o.checkout_key = ?`,
          [userId, data.checkout_key],
        );
      if (existing.length) {
        if (existing[0].request_hash !== hash)
          throw new ConflictException(
            'This checkout was already submitted with different details. Start a new checkout.',
          );
        const order = await this.loadOrder(
          runner,
          userId,
          existing[0].order_id,
        );
        await runner.commitTransaction();
        return order;
      }

      const items = [...data.items].sort((a, b) => a.flower_id - b.flower_id);
      const ids = items.map((item) => item.flower_id);
      const flowers: FlowerRow[] = await runner.query(
        `SELECT flower_id, flower_name, color, price, stock_quantity FROM flowers
         WHERE flower_id IN (${ids.map(() => '?').join(',')}) ORDER BY flower_id FOR UPDATE`,
        ids,
      );
      const byId = new Map(flowers.map((flower) => [flower.flower_id, flower]));
      let totalCents = 0;
      for (const item of items) {
        const flower = byId.get(item.flower_id);
        if (!flower)
          throw new ConflictException(
            'A flower in your bag is no longer available. Refresh your bag.',
          );
        if (flower.stock_quantity < item.quantity)
          throw new ConflictException(
            `${flower.flower_name} has only ${flower.stock_quantity} available. Update your bag.`,
          );
        totalCents += priceInCents(flower.price) * item.quantity;
      }
      if (totalCents > 9999999999)
        throw new BadRequestException(
          'Order total exceeds the allowed amount.',
        );

      const customer = data.customer;
      await runner.query(
        `INSERT INTO customers (user_id, first_name, last_name, email, phone, address)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE first_name = ?, last_name = ?, email = ?, phone = ?, address = ?`,
        [
          userId,
          customer.first_name,
          customer.last_name,
          customer.email,
          customer.phone,
          customer.address || null,
          customer.first_name,
          customer.last_name,
          customer.email,
          customer.phone,
          customer.address || null,
        ],
      );
      const customers: { customer_id: number }[] = await runner.query(
        'SELECT customer_id FROM customers WHERE user_id = ?',
        [userId],
      );
      const result: { insertId: number } = await runner.query(
        `INSERT INTO orders (customer_id, checkout_key, request_hash, total_amount, status,
         fulfillment, recipient_name, email, phone, delivery_address, notes, payment_method, payment_status)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 'mock', 'simulated')`,
        [
          customers[0].customer_id,
          data.checkout_key,
          hash,
          (totalCents / 100).toFixed(2),
          data.fulfillment,
          `${customer.first_name} ${customer.last_name}`,
          customer.email,
          customer.phone,
          data.fulfillment === 'delivery' ? customer.address : null,
          data.notes,
        ],
      );
      for (const item of items) {
        const flower = byId.get(item.flower_id)!;
        await runner.query(
          `INSERT INTO order_items (order_id, flower_id, flower_name, color, quantity, unit_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            result.insertId,
            flower.flower_id,
            flower.flower_name,
            flower.color,
            item.quantity,
            flower.price,
          ],
        );
        const updated: { affectedRows: number } = await runner.query(
          'UPDATE flowers SET stock_quantity = stock_quantity - ? WHERE flower_id = ? AND stock_quantity >= ?',
          [item.quantity, item.flower_id, item.quantity],
        );
        if (updated.affectedRows !== 1)
          throw new ConflictException(
            'Stock changed. Refresh your bag and try again.',
          );
      }
      const order = await this.loadOrder(runner, userId, result.insertId);
      await runner.commitTransaction();
      return order;
    } catch (error) {
      if (started) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async myOrders(userId: number): Promise<Order[]> {
    const orders: OrderRow[] = await this.db.query(
      `SELECT ${orderColumns} FROM orders o JOIN customers c ON c.customer_id = o.customer_id
       WHERE c.user_id = ? ORDER BY o.order_id DESC LIMIT 100`,
      [userId],
    );
    return this.attachItems(this.db, orders);
  }

  async myOrder(userId: number, id: number): Promise<Order> {
    if (!positiveId.safeParse(id).success)
      throw new BadRequestException('Invalid order ID.');
    return this.loadOrder(this.db, userId, id);
  }

  private async loadOrder(
    db: Queryable,
    userId: number,
    id: number,
  ): Promise<Order> {
    const orders: OrderRow[] = await db.query(
      `SELECT ${orderColumns} FROM orders o JOIN customers c ON c.customer_id = o.customer_id
       WHERE c.user_id = ? AND o.order_id = ?`,
      [userId, id],
    );
    if (!orders.length) throw new NotFoundException('Order not found.');
    return (await this.attachItems(db, orders))[0];
  }

  private async attachItems(
    db: Queryable,
    orders: OrderRow[],
  ): Promise<Order[]> {
    if (!orders.length) return [];
    const ids = orders.map((order) => order.order_id);
    const items: ItemRow[] = await db.query(
      `SELECT order_item_id, order_id, flower_id, flower_name, color, quantity, unit_price
       FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY order_item_id`,
      ids,
    );
    return orders.map((order) => ({
      ...order,
      order_date:
        order.order_date instanceof Date
          ? order.order_date.toISOString()
          : String(order.order_date),
      items: items.filter((item) => item.order_id === order.order_id),
    }));
  }
}
