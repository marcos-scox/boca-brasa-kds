CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(24) NOT NULL,
	`tableNumber` varchar(10) NOT NULL,
	`items` text NOT NULL,
	`totalCents` int NOT NULL,
	`status` enum('recebido','preparando','pronto','entregue') NOT NULL DEFAULT 'recebido',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(64) NOT NULL,
	`value` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_settingKey_unique` UNIQUE(`settingKey`)
);
