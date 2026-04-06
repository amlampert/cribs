import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

export const savesTable = pgTable("saves", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: text("listing_id").notNull(),
  userId: text("user_id").notNull(),
  collectionName: text("collection_name").notNull().default("All saved"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("saves_listing_user_collection_unique").on(t.listingId, t.userId, t.collectionName),
]);

export type Save = typeof savesTable.$inferSelect;
