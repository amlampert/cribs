import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { GetMapListingsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/map/listings", async (req, res): Promise<void> => {
  const params = GetMapListingsQueryParams.safeParse(req.query);
  const filter = params.success ? (params.data.filter ?? "all") : "all";
  const bounds = params.success ? (params.data.bounds ?? null) : null;

  let whereClause = sql`l.latitude IS NOT NULL AND l.longitude IS NOT NULL`;

  if (filter === "gems") {
    whereClause = sql`${whereClause} AND l.value_badge = 'gem'`;
  } else if (filter === "active") {
    whereClause = sql`${whereClause} AND l.status = 'active'`;
  } else if (filter === "sold") {
    whereClause = sql`${whereClause} AND l.status = 'sold'`;
  }

  if (bounds) {
    const parts = bounds.split(",").map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      const [swLat, swLng, neLat, neLng] = parts;
      whereClause = sql`${whereClause} AND l.latitude BETWEEN ${swLat} AND ${neLat} AND l.longitude BETWEEN ${swLng} AND ${neLng}`;
    }
  }

  const rows = await db.execute(sql`
    SELECT
      l.id,
      l.latitude,
      l.longitude,
      l.price,
      l.address,
      l.value_badge AS "valueBadge",
      l.status,
      l.price_per_sqft AS "pricePerSqft",
      l.photos,
      COALESCE((SELECT COUNT(*) FROM reactions r WHERE r.listing_id = l.id::text AND r.reaction_type = 'fire')::int, 0) AS "fireCount"
    FROM listings l
    WHERE ${whereClause}
    LIMIT 1000
  `);

  res.json(rows.rows);
});

export default router;
