import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const commentsTable = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: text("listing_id").notNull(),
  userId: text("user_id").notNull(),
  parentCommentId: text("parent_comment_id"),
  body: text("body").notNull(),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentVotesTable = pgTable("comment_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  commentId: text("comment_id").notNull(),
  userId: text("user_id").notNull(),
  vote: integer("vote").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, upvotes: true, downvotes: true, createdAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof commentsTable.$inferSelect;
export type CommentVote = typeof commentVotesTable.$inferSelect;
