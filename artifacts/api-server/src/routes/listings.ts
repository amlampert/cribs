import { Router, type IRouter } from "express";
import { eq, and, sql, ne } from "drizzle-orm";
import { db, listingsTable, reactionsTable, commentsTable, commentVotesTable } from "@workspace/db";
import {
  GetListingsQueryParams,
  GetListingParams,
  GetListingCompsQueryParams,
  GetListingCompsParams,
  GetListingReactionsParams,
  ToggleReactionParams,
  ToggleReactionBody,
  GetListingCommentsParams,
  GetListingCommentsQueryParams,
  CreateCommentParams,
  CreateCommentBody,
} from "@workspace/api-zod";
import { getListingFeed, getListingDetail } from "../lib/feedQuery";

const router: IRouter = Router();

router.get("/listings", async (req, res): Promise<void> => {
  const params = GetListingsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.headers["x-user-id"] as string | undefined;
  const { tab, limit, offset, hashtag, lat, lng, radius } = params.data;

  const result = await getListingFeed({
    tab: tab ?? undefined,
    limit: limit ?? 10,
    offset: offset ?? 0,
    hashtag: hashtag ?? undefined,
    userId,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    radius: radius ?? undefined,
  });

  res.json({
    listings: result.listings,
    total: result.total,
    hasMore: (offset ?? 0) + (limit ?? 10) < result.total,
  });
});

router.get("/listings/trending", async (req, res): Promise<void> => {
  const params = GetListingCompsQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 10) : 10;

  const result = await getListingFeed({ limit, offset: 0 });
  res.json(result.listings.slice(0, limit));
});

router.get("/listings/stats", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE status = 'sold') AS sold,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE value_badge = 'gem') AS gem,
      COUNT(*) FILTER (WHERE value_badge = 'delusional') AS delusional,
      AVG(price)::float AS avg_price,
      AVG(price_per_sqft)::float AS avg_ppsqft
    FROM listings
  `);

  const row = (rows.rows[0] ?? {}) as Record<string, unknown>;
  res.json({
    totalListings: Number(row.total ?? 0),
    activeListings: Number(row.active ?? 0),
    soldListings: Number(row.sold ?? 0),
    pendingListings: Number(row.pending ?? 0),
    gemCount: Number(row.gem ?? 0),
    delusionalCount: Number(row.delusional ?? 0),
    avgPrice: Number(row.avg_price ?? 0),
    avgPricePerSqft: Number(row.avg_ppsqft ?? 0),
    lastSyncedAt: null,
  });
});

router.get("/listings/:id", async (req, res): Promise<void> => {
  const params = GetListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.headers["x-user-id"] as string | undefined;
  const listing = await getListingDetail(params.data.id, userId);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json(listing);
});

router.get("/listings/:id/comps", async (req, res): Promise<void> => {
  const params = GetListingCompsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const query = GetListingCompsQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 5) : 5;

  const listing = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.id, params.data.id as unknown as string))
    .limit(1);

  if (!listing[0]) {
    res.json([]);
    return;
  }

  const target = listing[0];
  const compRows = await db.execute(sql`
    SELECT id, address, price, sqft, price_per_sqft AS "pricePerSqft", status, sold_at AS "soldAt", beds, photos
    FROM listings
    WHERE city = ${target.city}
      AND id != ${target.id}::uuid
      AND sqft > 0
    ORDER BY ABS(price - ${target.price}) ASC
    LIMIT ${limit}
  `);

  res.json(compRows.rows);
});

router.get("/listings/:id/reactions", async (req, res): Promise<void> => {
  const params = GetListingReactionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.headers["x-user-id"] as string | undefined;

  const rows = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE reaction_type = 'fire')::int AS "fireCount",
      COUNT(*) FILTER (WHERE reaction_type = 'gross')::int AS "grossCount",
      COUNT(*) FILTER (WHERE reaction_type = 'wtf')::int AS "wtfCount",
      COUNT(*) FILTER (WHERE reaction_type = 'flex')::int AS "flexCount",
      COUNT(*) FILTER (WHERE reaction_type = 'gem')::int AS "gemCount"
    FROM reactions WHERE listing_id = ${params.data.id}
  `);

  let userReactions: string[] = [];
  if (userId) {
    const ur = await db.execute(sql`
      SELECT array_agg(reaction_type) AS types FROM reactions WHERE listing_id = ${params.data.id} AND user_id = ${userId}
    `);
    userReactions = ((ur.rows[0] as Record<string, unknown>)?.types as string[]) ?? [];
  }

  const row = (rows.rows[0] ?? {}) as Record<string, unknown>;
  res.json({
    fireCount: Number(row.fireCount ?? 0),
    grossCount: Number(row.grossCount ?? 0),
    wtfCount: Number(row.wtfCount ?? 0),
    flexCount: Number(row.flexCount ?? 0),
    gemCount: Number(row.gemCount ?? 0),
    userReactions,
  });
});

router.post("/listings/:id/reactions", async (req, res): Promise<void> => {
  const params = ToggleReactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ToggleReactionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { id } = params.data;
  const { reactionType, userId } = body.data;

  const existing = await db.execute(sql`
    SELECT id FROM reactions WHERE listing_id = ${id} AND user_id = ${userId} AND reaction_type = ${reactionType} LIMIT 1
  `);

  if (existing.rows.length > 0) {
    await db.execute(sql`
      DELETE FROM reactions WHERE listing_id = ${id} AND user_id = ${userId} AND reaction_type = ${reactionType}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO reactions (listing_id, user_id, reaction_type) VALUES (${id}, ${userId}, ${reactionType})
      ON CONFLICT DO NOTHING
    `);
  }

  const rows = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE reaction_type = 'fire')::int AS "fireCount",
      COUNT(*) FILTER (WHERE reaction_type = 'gross')::int AS "grossCount",
      COUNT(*) FILTER (WHERE reaction_type = 'wtf')::int AS "wtfCount",
      COUNT(*) FILTER (WHERE reaction_type = 'flex')::int AS "flexCount",
      COUNT(*) FILTER (WHERE reaction_type = 'gem')::int AS "gemCount"
    FROM reactions WHERE listing_id = ${id}
  `);

  const ur = await db.execute(sql`
    SELECT array_agg(reaction_type) AS types FROM reactions WHERE listing_id = ${id} AND user_id = ${userId}
  `);
  const userReactions = ((ur.rows[0] as Record<string, unknown>)?.types as string[]) ?? [];

  const row = (rows.rows[0] ?? {}) as Record<string, unknown>;
  res.json({
    fireCount: Number(row.fireCount ?? 0),
    grossCount: Number(row.grossCount ?? 0),
    wtfCount: Number(row.wtfCount ?? 0),
    flexCount: Number(row.flexCount ?? 0),
    gemCount: Number(row.gemCount ?? 0),
    userReactions,
  });
});

router.get("/listings/:id/comments", async (req, res): Promise<void> => {
  const params = GetListingCommentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const queryParams = GetListingCommentsQueryParams.safeParse(req.query);
  const sort = queryParams.success ? (queryParams.data.sort ?? "top") : "top";
  const userId = req.headers["x-user-id"] as string | undefined;

  const orderBy = sort === "new" ? sql`c.created_at DESC` : sql`(c.upvotes - c.downvotes) DESC, c.created_at DESC`;

  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.listing_id AS "listingId",
      c.user_id AS "userId",
      c.parent_comment_id AS "parentCommentId",
      c.body,
      c.upvotes,
      c.downvotes,
      (c.upvotes - c.downvotes) AS "netScore",
      c.created_at AS "createdAt",
      json_build_object('id', u.id, 'username', COALESCE(u.username, 'user'), 'avatarUrl', u.avatar_url, 'flair', COALESCE(u.flair, 'just_looking')) AS user,
      COALESCE(cv.vote, NULL) AS "userVote"
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN comment_votes cv ON cv.comment_id = c.id::text AND cv.user_id = ${userId ?? ""}
    WHERE c.listing_id = ${params.data.id} AND c.parent_comment_id IS NULL
    ORDER BY ${orderBy}
    LIMIT 50
  `);

  const topComments = rows.rows as Record<string, unknown>[];

  const replies = await db.execute(sql`
    SELECT
      c.id,
      c.listing_id AS "listingId",
      c.user_id AS "userId",
      c.parent_comment_id AS "parentCommentId",
      c.body,
      c.upvotes,
      c.downvotes,
      (c.upvotes - c.downvotes) AS "netScore",
      c.created_at AS "createdAt",
      json_build_object('id', u.id, 'username', COALESCE(u.username, 'user'), 'avatarUrl', u.avatar_url, 'flair', COALESCE(u.flair, 'just_looking')) AS user
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.listing_id = ${params.data.id} AND c.parent_comment_id IS NOT NULL
    ORDER BY c.created_at ASC
  `);

  const replyMap: Record<string, unknown[]> = {};
  for (const reply of replies.rows as Record<string, unknown>[]) {
    const pid = String(reply.parentCommentId);
    if (!replyMap[pid]) replyMap[pid] = [];
    replyMap[pid].push({ ...reply, userVote: null, replies: [] });
  }

  const result = topComments.map((c) => ({
    ...c,
    replies: replyMap[String(c.id)] ?? [],
  }));

  res.json(result);
});

router.post("/listings/:id/comments", async (req, res): Promise<void> => {
  const params = CreateCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateCommentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { id } = params.data;
  const { body: commentBody, userId, parentCommentId } = body.data;

  const rows = await db.execute(sql`
    INSERT INTO comments (listing_id, user_id, body, parent_comment_id)
    VALUES (${id}, ${userId}, ${commentBody}, ${parentCommentId ?? null})
    RETURNING id, listing_id AS "listingId", user_id AS "userId", parent_comment_id AS "parentCommentId", body, upvotes, downvotes, created_at AS "createdAt"
  `);

  const comment = rows.rows[0] as Record<string, unknown>;

  const user = await db.execute(sql`
    SELECT id, username, avatar_url AS "avatarUrl", flair FROM users WHERE id = ${userId}
  `);

  const userRow = (user.rows[0] ?? { id: userId, username: "user", avatarUrl: null, flair: "just_looking" }) as Record<string, unknown>;

  res.status(201).json({
    ...comment,
    netScore: 0,
    userVote: null,
    replies: [],
    user: userRow,
  });
});

export default router;
