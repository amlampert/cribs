import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const listingHashtagsTable = pgTable("listing_hashtags", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: text("listing_id").notNull(),
  hashtag: text("hashtag").notNull(),
  source: text("source").notNull().default("auto"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ListingHashtag = typeof listingHashtagsTable.$inferSelect;
