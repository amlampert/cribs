import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { VoteCommentParams, VoteCommentBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/comments/:id/vote", async (req, res): Promise<void> => {
  const params = VoteCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = VoteCommentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { id } = params.data;
  const { vote, userId } = body.data;

  const existing = await db.execute(sql`
    SELECT id, vote FROM comment_votes WHERE comment_id = ${id} AND user_id = ${userId} LIMIT 1
  `);

  if (existing.rows.length > 0) {
    const existingVote = (existing.rows[0] as Record<string, unknown>).vote as number;
    if (existingVote === vote) {
      await db.execute(sql`DELETE FROM comment_votes WHERE comment_id = ${id} AND user_id = ${userId}`);
      if (vote === 1) {
        await db.execute(sql`UPDATE comments SET upvotes = GREATEST(0, upvotes - 1) WHERE id = ${id}::uuid`);
      } else {
        await db.execute(sql`UPDATE comments SET downvotes = GREATEST(0, downvotes - 1) WHERE id = ${id}::uuid`);
      }
    } else {
      await db.execute(sql`UPDATE comment_votes SET vote = ${vote} WHERE comment_id = ${id} AND user_id = ${userId}`);
      if (vote === 1) {
        await db.execute(sql`UPDATE comments SET upvotes = upvotes + 1, downvotes = GREATEST(0, downvotes - 1) WHERE id = ${id}::uuid`);
      } else {
        await db.execute(sql`UPDATE comments SET downvotes = downvotes + 1, upvotes = GREATEST(0, upvotes - 1) WHERE id = ${id}::uuid`);
      }
    }
  } else {
    await db.execute(sql`INSERT INTO comment_votes (comment_id, user_id, vote) VALUES (${id}, ${userId}, ${vote})`);
    if (vote === 1) {
      await db.execute(sql`UPDATE comments SET upvotes = upvotes + 1 WHERE id = ${id}::uuid`);
    } else {
      await db.execute(sql`UPDATE comments SET downvotes = downvotes + 1 WHERE id = ${id}::uuid`);
    }
  }

  const updated = await db.execute(sql`
    SELECT upvotes, downvotes, (upvotes - downvotes) AS "netScore" FROM comments WHERE id = ${id}::uuid
  `);

  const currentVote = await db.execute(sql`
    SELECT vote FROM comment_votes WHERE comment_id = ${id} AND user_id = ${userId} LIMIT 1
  `);

  const row = (updated.rows[0] ?? {}) as Record<string, unknown>;
  const userVote = currentVote.rows.length > 0 ? (currentVote.rows[0] as Record<string, unknown>).vote : null;

  res.json({
    upvotes: Number(row.upvotes ?? 0),
    downvotes: Number(row.downvotes ?? 0),
    netScore: Number(row.netScore ?? 0),
    userVote,
  });
});

export default router;
