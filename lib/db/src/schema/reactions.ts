import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

export const reactionsTable = pgTable("reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: text("listing_id").notNull(),
  userId: text("user_id").notNull(),
  reactionType: text("reaction_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("reactions_listing_user_type_unique").on(t.listingId, t.userId, t.reactionType),
]);

export type Reaction = typeof reactionsTable.$inferSelect;
