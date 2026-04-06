import { db, listingsTable, listingHashtagsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

const SIMPLYRETS_BASE = "https://api.simplyrets.com";
const SIMPLYRETS_USER = process.env.SIMPLYRETS_USER ?? "simplyrets";
const SIMPLYRETS_PASS = process.env.SIMPLYRETS_PASS ?? "simplyrets";
const basicAuth = Buffer.from(`${SIMPLYRETS_USER}:${SIMPLYRETS_PASS}`).toString("base64");
const demoAuth = Buffer.from("simplyrets:simplyrets").toString("base64");

function mapStatus(srStatus: string): string {
  const s = srStatus?.toLowerCase() ?? "";
  if (s === "active") return "active";
  if (s === "closed") return "sold";
  if (s === "pending" || s === "activeundercontract") return "pending";
  return "active";
}

function generateHashtags(listing: {
  propertyType: string;
  price: number;
  amenities: string[];
  description: string | null;
}): string[] {
  const tags: string[] = [];
  const type = (listing.propertyType ?? "").toLowerCase();
  const desc = (listing.description ?? "").toLowerCase();
  const amenities = listing.amenities.map((a) => a.toLowerCase());

  if (type.includes("condo")) tags.push("Condo");
  else if (type.includes("townhouse") || type.includes("townhome")) tags.push("Townhouse");
  else if (type.includes("ranch")) tags.push("Ranch");
  else if (type.includes("colonial")) tags.push("Colonial");
  else if (type.includes("craftsman")) tags.push("Craftsman");
  else if (type.includes("mid") && type.includes("century")) tags.push("MidCenturyModern");
  else if (type.includes("residential") || type.includes("single")) tags.push("SingleFamily");

  const allText = desc + " " + amenities.join(" ");
  if (allText.includes("pool")) tags.push("PoolHome");
  if (allText.includes("view") || allText.includes("mountain") || allText.includes("ocean")) tags.push("ViewProperty");
  if (allText.includes("new build") || allText.includes("new construction")) tags.push("NewBuild");
  if (allText.includes("fixer") || allText.includes("as-is") || allText.includes("as is")) tags.push("Fixer");

  if (listing.price >= 1_000_000) tags.push("MillionDollarListing");
  else if (listing.price < 500_000) tags.push("UnderHalfMil");

  return tags;
}

async function fetchPage(lastId = 0, limit = 500, auth = basicAuth): Promise<{ properties: unknown[]; nextLastId: number | null }> {
  const url = `${SIMPLYRETS_BASE}/properties?limit=${limit}&lastId=${lastId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`SimplyRETS fetch failed: ${res.status} ${res.statusText}`);
  }

  const properties = (await res.json()) as unknown[];

  const linkHeader = res.headers.get("Link") ?? "";
  let nextLastId: number | null = null;
  const match = linkHeader.match(/lastId=(\d+)/);
  if (match && properties.length === limit) {
    nextLastId = parseInt(match[1], 10);
  }

  return { properties, nextLastId };
}

export async function syncSimplyRETS(): Promise<{ inserted: number; updated: number; total: number; duration: number }> {
  const start = Date.now();
  let inserted = 0;
  let updated = 0;
  let page = 0;
  let lastId = 0;
  const allProperties: unknown[] = [];

  logger.info("Starting SimplyRETS sync");

  // Determine which auth to use — fall back to demo if real creds return 401
  let activeAuth = basicAuth;
  try {
    await fetchPage(0, 1, basicAuth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("401")) {
      logger.warn("Real SimplyRETS credentials not yet active, falling back to demo data");
      activeAuth = demoAuth;
    } else {
      throw e;
    }
  }

  while (true) {
    const { properties, nextLastId } = await fetchPage(lastId, 500, activeAuth);
    allProperties.push(...properties);
    page++;
    logger.info({ page, count: properties.length, total: allProperties.length }, "Fetched SimplyRETS page");

    if (!nextLastId || properties.length < 500) break;
    lastId = nextLastId;

    if (page >= 20) break;
  }

  const cityPricesPerSqft: Record<string, number[]> = {};

  for (const raw of allProperties) {
    const p = raw as Record<string, unknown>;
    const prop = (p.property ?? {}) as Record<string, unknown>;
    const addr = (p.address ?? {}) as Record<string, unknown>;

    const sqft = Number(prop.area ?? 0);
    const price = Number(p.listPrice ?? 0);
    const city = String(addr.city ?? "");
    const ppsqft = sqft > 0 ? price / sqft : null;

    if (ppsqft && city) {
      if (!cityPricesPerSqft[city]) cityPricesPerSqft[city] = [];
      cityPricesPerSqft[city].push(ppsqft);
    }
  }

  const cityAvgPricePerSqft: Record<string, number> = {};
  for (const [city, prices] of Object.entries(cityPricesPerSqft)) {
    cityAvgPricePerSqft[city] = prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  function computeValueBadge(ppsqft: number | null, avg: number | null): string | null {
    if (!ppsqft || !avg || avg === 0) return null;
    const ratio = (ppsqft - avg) / avg;
    if (ratio < -0.15) return "gem";
    if (ratio > 0.30) return "delusional";
    if (ratio > 0.15) return "sus";
    return "fair";
  }

  for (const raw of allProperties) {
    const p = raw as Record<string, unknown>;
    const prop = (p.property ?? {}) as Record<string, unknown>;
    const addr = (p.address ?? {}) as Record<string, unknown>;
    const geo = (p.geo ?? {}) as Record<string, unknown>;

    const mlsId = String(p.mlsId ?? p.listingId ?? "");
    if (!mlsId) continue;

    const city = String(addr.city ?? "");
    const price = Number(p.listPrice ?? 0);
    const sqft = Number(prop.area ?? 0);
    const ppsqft = sqft > 0 ? price / sqft : null;
    const avgPpsqft = cityAvgPricePerSqft[city] ?? null;
    const valueBadge = computeValueBadge(ppsqft, avgPpsqft);

    const rawPhotos = p.photos as string[] | undefined;
    const photos = Array.isArray(rawPhotos) ? rawPhotos : [];

    const rawAmenities = prop.amenities as string[] | undefined;
    const amenities = Array.isArray(rawAmenities) ? rawAmenities : [];

    const statusStr = (p.mls as Record<string, unknown>)?.status as string ?? "Active";
    const status = mapStatus(statusStr);

    const closePrice = Number((p.mls as Record<string, unknown>)?.closePrice ?? 0);
    const closeDate = (p.mls as Record<string, unknown>)?.closeDate as string | undefined;

    const listingData = {
      mlsId,
      address: String(addr.full ?? `${addr.streetNumber ?? ""} ${addr.streetName ?? ""}`.trim()),
      city,
      neighborhood: String(addr.neighborhood ?? ""),
      state: String(addr.state ?? ""),
      zip: String(addr.postalCode ?? ""),
      price,
      status,
      beds: Number(prop.beds ?? 0),
      bathsFull: Number(prop.bathsFull ?? 0),
      bathsHalf: Number(prop.bathsHalf ?? 0),
      sqft,
      lotSize: Number(prop.lotSize ?? 0) || null,
      yearBuilt: Number(prop.yearBuilt ?? 0) || null,
      stories: Number(prop.stories ?? 0) || null,
      propertyType: String(prop.type ?? prop.subType ?? "Residential"),
      description: String(prop.description ?? ""),
      photos,
      latitude: Number(geo.lat ?? 0) || null,
      longitude: Number(geo.lng ?? 0) || null,
      pricePerSqft: ppsqft,
      areaAvgPricePerSqft: avgPpsqft,
      valueBadge,
      soldPrice: closePrice || null,
      soldAt: closeDate ? new Date(closeDate) : null,
      listedAt: p.listDate ? new Date(String(p.listDate)) : null,
      garage: String(prop.garageSpaces ?? ""),
      heating: String(prop.heating ?? ""),
      cooling: String(prop.cooling ?? ""),
      amenities,
      rawData: raw,
    };

    const existing = await db
      .select({ id: listingsTable.id })
      .from(listingsTable)
      .where(eq(listingsTable.mlsId, mlsId))
      .limit(1);

    if (existing.length > 0) {
      await db.update(listingsTable).set(listingData).where(eq(listingsTable.mlsId, mlsId));
      updated++;
    } else {
      const [inserted_row] = await db.insert(listingsTable).values(listingData).returning({ id: listingsTable.id });
      inserted++;

      const hashtags = generateHashtags({
        propertyType: listingData.propertyType,
        price: listingData.price,
        amenities: listingData.amenities,
        description: listingData.description,
      });

      if (hashtags.length > 0) {
        await db.insert(listingHashtagsTable).values(
          hashtags.map((tag) => ({
            listingId: inserted_row.id,
            hashtag: tag.toLowerCase(),
            source: "auto",
          }))
        ).onConflictDoNothing();
      }
    }
  }

  await db.execute(sql`
    UPDATE listings l
    SET area_avg_price_per_sqft = subq.avg_ppsqft
    FROM (
      SELECT city, AVG(price_per_sqft) as avg_ppsqft
      FROM listings
      WHERE price_per_sqft IS NOT NULL AND city != ''
      GROUP BY city
    ) subq
    WHERE l.city = subq.city
  `);

  await db.execute(sql`
    UPDATE listings
    SET value_badge = CASE
      WHEN price_per_sqft IS NULL OR area_avg_price_per_sqft IS NULL OR area_avg_price_per_sqft = 0 THEN NULL
      WHEN (price_per_sqft - area_avg_price_per_sqft) / area_avg_price_per_sqft < -0.15 THEN 'gem'
      WHEN (price_per_sqft - area_avg_price_per_sqft) / area_avg_price_per_sqft > 0.30 THEN 'delusional'
      WHEN (price_per_sqft - area_avg_price_per_sqft) / area_avg_price_per_sqft > 0.15 THEN 'sus'
      ELSE 'fair'
    END
  `);

  const duration = (Date.now() - start) / 1000;
  logger.info({ inserted, updated, total: allProperties.length, duration }, "SimplyRETS sync complete");

  return { inserted, updated, total: allProperties.length, duration };
}
