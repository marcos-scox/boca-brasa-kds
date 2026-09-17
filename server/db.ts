import { desc, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, Order, orders, settings, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export type OrderItem = {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
};

export type OrderView = Omit<Order, "items"> & { items: OrderItem[] };

export function calculateOrderTotal(items: OrderItem[]) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

function toOrderView(order: Order): OrderView {
  let items: OrderItem[] = [];
  try {
    items = JSON.parse(order.items) as OrderItem[];
  } catch {
    items = [];
  }
  return { ...order, items };
}

export async function createOrderRecord(input: {
  tableNumber: string;
  items: OrderItem[];
  totalCents: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const code = `PED-${String(Date.now()).slice(-6)}`;
  const result = await db.insert(orders).values({
    code,
    tableNumber: input.tableNumber,
    items: JSON.stringify(input.items),
    totalCents: input.totalCents,
    status: "recebido",
  }).$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Não foi possível identificar o pedido criado");
  const created = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!created[0]) throw new Error("Não foi possível criar o pedido");
  return toOrderView(created[0]);
}

export async function getOrderRecord(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0] ? toOrderView(result[0]) : undefined;
}

export async function listActiveOrderRecords() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(orders).where(ne(orders.status, "entregue")).orderBy(desc(orders.createdAt));
  return result.map(toOrderView);
}

export async function updateOrderStatusRecord(id: number, status: "recebido" | "preparando" | "pronto" | "entregue") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(orders).set({ status }).where(eq(orders.id, id));
  return getOrderRecord(id);
}

export async function getWhatsappSetting() {
  const db = await getDb();
  if (!db) return "";
  const result = await db.select().from(settings).where(eq(settings.settingKey, "whatsapp")).limit(1);
  return result[0]?.value || "";
}

export async function updateWhatsappSetting(value: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(settings).values({ settingKey: "whatsapp", value }).onDuplicateKeyUpdate({ set: { value } });
  return value;
}
