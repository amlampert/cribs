import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { GetUserByUsernameParams, UpdateMeBody, SyncUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatUser(u: Record<string, unknown>) {
  return {
    id: u.id,
    username: u.username,
    avatarUrl: u.avatar_url ?? u.avatarUrl ?? null,
    bio: u.bio ?? null,
    flair: u.flair ?? "just_looking",
    createdAt: u.created_at ?? u.createdAt,
  };
}

router.get("/users/me", async (req, res): Promise<void> => {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(users[0] as unknown as Record<string, unknown>));
});

router.put("/users/me", async (req, res): Promise<void> => {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = UpdateMeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.data.username) updates.username = body.data.username;
  if (body.data.bio !== undefined) updates.bio = body.data.bio;
  if (body.data.flair) updates.flair = body.data.flair;
  if (body.data.avatarUrl !== undefined) updates.avatarUrl = body.data.avatarUrl;

  const updated = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(updated[0] as unknown as Record<string, unknown>));
});

router.post("/users/me/sync", async (req, res): Promise<void> => {
  const body = SyncUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { supabaseId, email, avatarUrl, username: reqUsername } = body.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.id, supabaseId)).limit(1);

  if (existing[0]) {
    const updates: Record<string, unknown> = {};
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    const updated = await db.update(usersTable).set(updates).where(eq(usersTable.id, supabaseId)).returning();
    res.json(formatUser(updated[0] as unknown as Record<string, unknown>));
    return;
  }

  let username = reqUsername;
  if (!username) {
    const base = email ? email.split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 20) : "user";
    username = base + Math.floor(Math.random() * 9999);
  }

  const existingUsername = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existingUsername[0]) {
    username = username + Math.floor(Math.random() * 9999);
  }

  const [created] = await db.insert(usersTable).values({
    id: supabaseId,
    username,
    avatarUrl: avatarUrl ?? null,
    flair: "just_looking",
  }).returning();

  res.json(formatUser(created as unknown as Record<string, unknown>));
});

router.get("/users/:username", async (req, res): Promise<void> => {
  const params = GetUserByUsernameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.username, params.data.username)).limit(1);
  if (!users[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const userId = users[0].id;

  const stats = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM reactions WHERE user_id = ${userId})::int AS reactions_given,
      (SELECT COUNT(*) FROM comments WHERE user_id = ${userId})::int AS total_comments,
      (SELECT COUNT(*) FROM saves WHERE user_id = ${userId})::int AS total_saves
  `);

  const row = (stats.rows[0] ?? {}) as Record<string, unknown>;

  res.json({
    ...formatUser(users[0] as unknown as Record<string, unknown>),
    totalReactionsGiven: Number(row.reactions_given ?? 0),
    totalComments: Number(row.total_comments ?? 0),
    totalSaves: Number(row.total_saves ?? 0),
    tasteProfile: null,
  });
});

export default router;
