import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface FeedListing {
  id: string;
  mlsId: string;
  address: string;
  city: string;
  neighborhood: string | null;
  state: string;
  zip: string;
  price: number;
  originalPrice: number | null;
  status: string;
  beds: number;
  bathsFull: number;
  bathsHalf: number;
  sqft: number;
  yearBuilt: number | null;
  propertyType: string;
  photos: string[];
  latitude: number | null;
  longitude: number | null;
  pricePerSqft: number | null;
  areaAvgPricePerSqft: number | null;
  valueBadge: string | null;
  soldPrice: number | null;
  listedAt: string | null;
  soldAt: string | null;
  fireCount: number;
  grossCount: number;
  wtfCount: number;
  flexCount: number;
  gemCount: number;
  commentCount: number;
  topComment: unknown;
  hashtags: string[];
  userReactions: string[];
  isSaved: boolean;
}

interface FeedDetailListing extends FeedListing {
  description: string | null;
  lotSize: number | null;
  stories: number | null;
  garage: string | null;
  heating: string | null;
  cooling: string | null;
  amenities: string[];
  rawData: unknown;
}

export async function getListingFeed(opts: {
  tab?: string;
  limit?: number;
  offset?: number;
  hashtag?: string;
  userId?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}): Promise<{ listings: FeedListing[]; total: number }> {
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const userId = opts.userId ?? null;

  let whereClause = sql`TRUE`;
  let orderClause = sql`(fire_count + gross_count + wtf_count + flex_count + gem_count + comment_count) DESC, l.created_at DESC`;

  const tab = opts.tab ?? "for_you";

  if (tab === "gone_wild") {
    whereClause = sql`TRUE`;
    orderClause = sql`(gross_count + wtf_count) DESC, l.created_at DESC`;
  } else if (tab === "just_dropped") {
    whereClause = sql`l.status = 'active'`;
    orderClause = sql`l.listed_at DESC NULLS LAST, l.created_at DESC`;
  } else if (tab === "gone") {
    whereClause = sql`l.status = 'sold'`;
    orderClause = sql`(fire_count + gross_count + wtf_count + flex_count + gem_count + comment_count) DESC, l.created_at DESC`;
  } else if (tab === "slashed") {
    whereClause = sql`l.original_price IS NOT NULL AND l.original_price > l.price`;
    orderClause = sql`(l.original_price - l.price) DESC`;
  } else if (tab === "dream_homes") {
    whereClause = sql`TRUE`;
    orderClause = sql`fire_count DESC, l.created_at DESC`;
  } else if (tab === "nightmares") {
    whereClause = sql`TRUE`;
    orderClause = sql`gross_count DESC, l.created_at DESC`;
  } else if (tab === "near_me" && opts.lat && opts.lng) {
    const lat = opts.lat;
    const lng = opts.lng;
    const radius = opts.radius ?? 50;
    whereClause = sql`(
      6371 * acos(cos(radians(${lat})) * cos(radians(l.latitude)) * cos(radians(l.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(l.latitude)))
    ) < ${radius}`;
    orderClause = sql`(fire_count + comment_count) DESC`;
  }

  if (opts.hashtag) {
    const tag = opts.hashtag.toLowerCase().replace("#", "");
    whereClause = sql`${whereClause} AND l.id IN (
      SELECT lh.listing_id::uuid FROM listing_hashtags lh WHERE lh.hashtag = ${tag}
    )`;
  }

  const query = sql`
    WITH reaction_counts AS (
      SELECT
        listing_id::uuid AS listing_id,
        COUNT(*) FILTER (WHERE reaction_type = 'fire') AS fire_count,
        COUNT(*) FILTER (WHERE reaction_type = 'gross') AS gross_count,
        COUNT(*) FILTER (WHERE reaction_type = 'wtf') AS wtf_count,
        COUNT(*) FILTER (WHERE reaction_type = 'flex') AS flex_count,
        COUNT(*) FILTER (WHERE reaction_type = 'gem') AS gem_count
      FROM reactions
      GROUP BY listing_id
    ),
    comment_counts AS (
      SELECT listing_id::uuid AS listing_id, COUNT(*) AS comment_count
      FROM comments
      GROUP BY listing_id
    ),
    hashtag_agg AS (
      SELECT listing_id::uuid AS listing_id, array_agg(hashtag) AS hashtags
      FROM listing_hashtags
      GROUP BY listing_id
    ),
    top_comments AS (
      SELECT DISTINCT ON (c.listing_id)
        c.listing_id::uuid AS listing_id,
        c.id,
        c.body,
        c.upvotes,
        c.downvotes,
        u.username,
        u.avatar_url,
        u.flair
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.parent_comment_id IS NULL
      ORDER BY c.listing_id, (c.upvotes - c.downvotes) DESC, c.created_at DESC
    ),
    user_reactions AS (
      SELECT listing_id::uuid AS listing_id, array_agg(reaction_type) AS reaction_types
      FROM reactions
      WHERE ${userId !== null ? sql`user_id = ${userId}` : sql`FALSE`}
      GROUP BY listing_id
    ),
    user_saves AS (
      SELECT listing_id::uuid AS listing_id
      FROM saves
      WHERE ${userId !== null ? sql`user_id = ${userId}` : sql`FALSE`}
    )
    SELECT
      l.id,
      l.mls_id AS "mlsId",
      l.address,
      l.city,
      l.neighborhood,
      l.state,
      l.zip,
      l.price,
      l.original_price AS "originalPrice",
      l.status,
      l.beds,
      l.baths_full AS "bathsFull",
      l.baths_half AS "bathsHalf",
      l.sqft,
      l.year_built AS "yearBuilt",
      l.property_type AS "propertyType",
      l.photos,
      l.latitude,
      l.longitude,
      l.price_per_sqft AS "pricePerSqft",
      l.area_avg_price_per_sqft AS "areaAvgPricePerSqft",
      l.value_badge AS "valueBadge",
      l.sold_price AS "soldPrice",
      l.listed_at AS "listedAt",
      l.sold_at AS "soldAt",
      COALESCE(rc.fire_count, 0)::int AS "fireCount",
      COALESCE(rc.gross_count, 0)::int AS "grossCount",
      COALESCE(rc.wtf_count, 0)::int AS "wtfCount",
      COALESCE(rc.flex_count, 0)::int AS "flexCount",
      COALESCE(rc.gem_count, 0)::int AS "gemCount",
      COALESCE(cc.comment_count, 0)::int AS "commentCount",
      CASE WHEN tc.id IS NOT NULL THEN json_build_object(
        'id', tc.id,
        'listingId', l.id,
        'userId', tc.listing_id,
        'body', tc.body,
        'upvotes', tc.upvotes,
        'downvotes', tc.downvotes,
        'netScore', (tc.upvotes - tc.downvotes),
        'userVote', NULL,
        'createdAt', NOW(),
        'replies', '[]'::json,
        'user', json_build_object('id', tc.listing_id, 'username', COALESCE(tc.username, 'user'), 'avatarUrl', tc.avatar_url, 'flair', COALESCE(tc.flair, 'just_looking'))
      ) ELSE NULL END AS "topComment",
      COALESCE(ha.hashtags, '{}') AS hashtags,
      COALESCE(ur.reaction_types, '{}') AS "userReactions",
      (us.listing_id IS NOT NULL) AS "isSaved"
    FROM listings l
    LEFT JOIN reaction_counts rc ON rc.listing_id = l.id
    LEFT JOIN comment_counts cc ON cc.listing_id = l.id
    LEFT JOIN hashtag_agg ha ON ha.listing_id = l.id
    LEFT JOIN top_comments tc ON tc.listing_id = l.id
    LEFT JOIN user_reactions ur ON ur.listing_id = l.id
    LEFT JOIN user_saves us ON us.listing_id = l.id
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countQuery = sql`
    SELECT COUNT(*) as total FROM listings l WHERE ${whereClause}
  `;

  const [rows, countRows] = await Promise.all([
    db.execute(query),
    db.execute(countQuery),
  ]);

  const total = Number((countRows.rows[0] as Record<string, unknown>)?.total ?? 0);

  return {
    listings: rows.rows as FeedListing[],
    total,
  };
}

export async function getListingDetail(id: string, userId?: string | null): Promise<FeedDetailListing | null> {
  const query = sql`
    WITH reaction_counts AS (
      SELECT
        listing_id::uuid AS listing_id,
        COUNT(*) FILTER (WHERE reaction_type = 'fire') AS fire_count,
        COUNT(*) FILTER (WHERE reaction_type = 'gross') AS gross_count,
        COUNT(*) FILTER (WHERE reaction_type = 'wtf') AS wtf_count,
        COUNT(*) FILTER (WHERE reaction_type = 'flex') AS flex_count,
        COUNT(*) FILTER (WHERE reaction_type = 'gem') AS gem_count
      FROM reactions WHERE listing_id = ${id}
      GROUP BY listing_id
    ),
    hashtag_agg AS (
      SELECT listing_id::uuid AS listing_id, array_agg(hashtag) AS hashtags
      FROM listing_hashtags WHERE listing_id = ${id}
      GROUP BY listing_id
    ),
    user_reactions AS (
      SELECT array_agg(reaction_type) AS reaction_types
      FROM reactions WHERE listing_id = ${id} AND ${userId ? sql`user_id = ${userId}` : sql`FALSE`}
    ),
    user_saves AS (
      SELECT 1 as saved FROM saves WHERE listing_id = ${id} AND ${userId ? sql`user_id = ${userId}` : sql`FALSE`} LIMIT 1
    )
    SELECT
      l.*,
      l.mls_id AS "mlsId",
      l.original_price AS "originalPrice",
      l.baths_full AS "bathsFull",
      l.baths_half AS "bathsHalf",
      l.year_built AS "yearBuilt",
      l.property_type AS "propertyType",
      l.price_per_sqft AS "pricePerSqft",
      l.area_avg_price_per_sqft AS "areaAvgPricePerSqft",
      l.value_badge AS "valueBadge",
      l.sold_price AS "soldPrice",
      l.listed_at AS "listedAt",
      l.sold_at AS "soldAt",
      l.lot_size AS "lotSize",
      l.raw_data AS "rawData",
      COALESCE(rc.fire_count, 0)::int AS "fireCount",
      COALESCE(rc.gross_count, 0)::int AS "grossCount",
      COALESCE(rc.wtf_count, 0)::int AS "wtfCount",
      COALESCE(rc.flex_count, 0)::int AS "flexCount",
      COALESCE(rc.gem_count, 0)::int AS "gemCount",
      0::int AS "commentCount",
      NULL AS "topComment",
      COALESCE(ha.hashtags, '{}') AS hashtags,
      COALESCE(ur.reaction_types, '{}') AS "userReactions",
      (us.saved IS NOT NULL) AS "isSaved"
    FROM listings l
    LEFT JOIN reaction_counts rc ON rc.listing_id = l.id
    LEFT JOIN hashtag_agg ha ON ha.listing_id = l.id
    LEFT JOIN user_reactions ur ON TRUE
    LEFT JOIN user_saves us ON TRUE
    WHERE l.id = ${id}::uuid
    LIMIT 1
  `;

  const rows = await db.execute(query);
  if (rows.rows.length === 0) return null;
  return rows.rows[0] as FeedDetailListing;
}
