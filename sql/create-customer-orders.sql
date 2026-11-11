-- Additive migration for the existing Aiven MySQL flower shop.
-- Run after create-flowers.sql. No existing rows change.

CREATE TABLE IF NOT EXISTS `customers` (
  `customer_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `address` VARCHAR(255) NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `uq_customers_user` (`user_id`),
  CONSTRAINT `fk_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `order_id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `employee_id` INT NULL,
  `checkout_key` CHAR(36) NOT NULL,
  `request_hash` CHAR(64) NOT NULL,
  `order_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `fulfillment` VARCHAR(20) NOT NULL,
  `recipient_name` VARCHAR(101) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `delivery_address` VARCHAR(255) NULL,
  `notes` VARCHAR(500) NOT NULL DEFAULT '',
  `payment_method` VARCHAR(20) NOT NULL DEFAULT 'mock',
  `payment_status` VARCHAR(30) NOT NULL DEFAULT 'simulated',
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `uq_orders_checkout` (`customer_id`, `checkout_key`),
  KEY `idx_orders_customer_date` (`customer_id`, `order_date`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `fk_orders_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `ck_orders_total` CHECK (`total_amount` >= 0),
  CONSTRAINT `ck_orders_status` CHECK (`status` IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  CONSTRAINT `ck_orders_fulfillment` CHECK (`fulfillment` IN ('pickup', 'delivery')),
  CONSTRAINT `ck_orders_mock` CHECK (`payment_method` = 'mock' AND `payment_status` = 'simulated')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `order_item_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `flower_id` INT NOT NULL,
  `flower_name` VARCHAR(100) NOT NULL,
  `color` VARCHAR(50) NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`order_item_id`),
  UNIQUE KEY `uq_order_items_flower` (`order_id`, `flower_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `fk_order_items_flower` FOREIGN KEY (`flower_id`) REFERENCES `flowers` (`flower_id`),
  CONSTRAINT `ck_order_items_quantity` CHECK (`quantity` BETWEEN 1 AND 99),
  CONSTRAINT `ck_order_items_price` CHECK (`unit_price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
