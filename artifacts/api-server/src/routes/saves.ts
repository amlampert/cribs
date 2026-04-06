import { Router, type IRouter } from "express";
import { db, savesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { SaveListingBody, UnsaveListingParams, GetSavesQueryParams } from "@workspace/api-zod";
import { getListingDetail } from "../lib/feedQuery";

const router: IRouter = Router();

router.get("/saves/collections", async (req, res): Promise<void> => {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rows = await db.execute(sql`
    SELECT DISTINCT collection_name FROM saves WHERE user_id = ${userId} ORDER BY collection_name
  `);

  const collections = rows.rows.map((r) => (r as Record<string, unknown>).collection_name as string);
  res.json(collections);
});

router.get("/saves", async (req, res): Promise<void> => {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetSavesQueryParams.safeParse(req.query);
  const collection = params.success ? params.data.collection : undefined;

  const rows = await db.execute(sql`
    SELECT s.id, s.listing_id AS "listingId", s.collection_name AS "collectionName", s.created_at AS "createdAt"
    FROM saves s
    WHERE s.user_id = ${userId}
    ${collection ? sql`AND s.collection_name = ${collection}` : sql``}
    ORDER BY s.created_at DESC
  `);

  const saves = rows.rows as Record<string, unknown>[];

  const result = await Promise.all(
    saves.map(async (s) => {
      const listing = await getListingDetail(String(s.listingId), userId);
      return { ...s, listing };
    })
  );

  res.json(result.filter((s) => s.listing != null));
});

router.post("/saves", async (req, res): Promise<void> => {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = SaveListingBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { listingId, collectionName } = body.data;

  const existing = await db.execute(sql`
    SELECT id FROM saves WHERE listing_id = ${listingId} AND user_id = ${userId} AND collection_name = ${collectionName ?? "All saved"} LIMIT 1
  `);

  if (existing.rows.length > 0) {
    const existingRow = existing.rows[0] as Record<string, unknown>;
    const listing = await getListingDetail(listingId, userId);
    res.status(201).json({
      id: existingRow.id,
      listingId,
      collectionName: collectionName ?? "All saved",
      createdAt: new Date().toISOString(),
      listing,
    });
    return;
  }

  const rows = await db.execute(sql`
    INSERT INTO saves (listing_id, user_id, collection_name) VALUES (${listingId}, ${userId}, ${collectionName ?? "All saved"})
    ON CONFLICT DO NOTHING
    RETURNING id, listing_id AS "listingId", collection_name AS "collectionName", created_at AS "createdAt"
  `);

  const saved = rows.rows[0] as Record<string, unknown>;
  const listing = await getListingDetail(listingId, userId);

  res.status(201).json({ ...saved, listing });
});

router.delete("/saves/:listingId", async (req, res): Promise<void> => {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UnsaveListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.execute(sql`
    DELETE FROM saves WHERE listing_id = ${params.data.listingId} AND user_id = ${userId}
  `);

  res.sendStatus(204);
});

export default router;
