import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { GetTrendingHashtagsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/hashtags/trending", async (req, res): Promise<void> => {
  const params = GetTrendingHashtagsQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 20) : 20;

  const rows = await db.execute(sql`
    SELECT hashtag, COUNT(*) AS count
    FROM listing_hashtags
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY hashtag
    ORDER BY count DESC
    LIMIT ${limit}
  `);

  res.json(rows.rows.map((r) => ({
    hashtag: (r as Record<string, unknown>).hashtag,
    count: Number((r as Record<string, unknown>).count),
  })));
});

export default router;
