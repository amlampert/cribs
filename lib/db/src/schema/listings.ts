import { pgTable, text, integer, real, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingsTable = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  mlsId: text("mls_id").notNull().unique(),
  address: text("address").notNull(),
  city: text("city").notNull().default(""),
  neighborhood: text("neighborhood"),
  state: text("state").notNull().default(""),
  zip: text("zip").notNull().default(""),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  status: text("status").notNull().default("active"),
  beds: integer("beds").notNull().default(0),
  bathsFull: integer("baths_full").notNull().default(0),
  bathsHalf: integer("baths_half").notNull().default(0),
  sqft: integer("sqft").notNull().default(0),
  lotSize: integer("lot_size"),
  yearBuilt: integer("year_built"),
  stories: integer("stories"),
  propertyType: text("property_type").notNull().default(""),
  description: text("description"),
  photos: text("photos").array().notNull().default([]),
  latitude: real("latitude"),
  longitude: real("longitude"),
  pricePerSqft: real("price_per_sqft"),
  areaAvgPricePerSqft: real("area_avg_price_per_sqft"),
  valueBadge: text("value_badge"),
  soldPrice: integer("sold_price"),
  soldAt: timestamp("sold_at", { withTimezone: true }),
  listedAt: timestamp("listed_at", { withTimezone: true }),
  garage: text("garage"),
  heating: text("heating"),
  cooling: text("cooling"),
  amenities: text("amenities").array().notNull().default([]),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;
