import { sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const productsTable = pgTable("nixx_products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: text("price").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  orderUrl: text("order_url"),
  features: jsonb("features").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ProductRow = typeof productsTable.$inferSelect;
