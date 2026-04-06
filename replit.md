# Cribs

A mobile-first social real estate web app — Instagram meets Zillow / r/ZillowGoneWild.

## Architecture

**Monorepo** (pnpm workspaces) with three artifacts:

| Artifact | Path | Purpose |
|---|---|---|
| `artifacts/cribs` | `/` | React + Vite frontend |
| `artifacts/api-server` | `/api` | Express + Drizzle backend |
| `artifacts/mockup-sandbox` | `/__mockup` | Design preview server |

Shared packages:
- `lib/db` — Drizzle ORM schema + client (Replit PostgreSQL)
- `lib/api-spec` — OpenAPI spec (`openapi.yaml`)
- `lib/api-client-react` — React Query hooks (orval codegen from OpenAPI)
- `lib/api-zod` — Zod validators (orval codegen from OpenAPI)

## Key Features

- **Feed** — Infinite scroll of real estate listings with tab filters: For You, Gone Wild, Just Dropped, Gone, Slashed, Dream Homes, Nightmares
- **Value Badges** — GEM (<-15% vs area avg $/sqft), SUS (+15-30%), DELUSIONAL (>+30%)
- **Reactions** — Fire, Gross, WTF, Flex, Gem emojis with optimistic UI
- **Map** — Mapbox GL heatmap with colored markers by value badge
- **Explore** — Trending hashtags + trending listings
- **Saved** — Saved listings collection (requires auth)
- **Auth** — Supabase Google OAuth (auth only; data in Replit PostgreSQL)
- **Auto-hashtags** — Generated from listing data (#milliondollarlisting, #pooltime, etc.)

## Data Sources

- **SimplyRETS** — Demo credentials (`simplyrets`/`simplyrets`), syncs on startup and every 6 hours
- 65 listings loaded from SimplyRETS demo API

## Database Schema

Tables in Replit PostgreSQL:
- `listings` — Main listing data with value badges, hashtags, area avg $/sqft
- `users` — Supabase auth users synced to local DB
- `reactions` — User emoji reactions per listing
- `comments` — User comments with nested replies
- `comment_votes` — Upvotes/downvotes on comments
- `saves` — User-saved listings
- `listing_hashtags` — Hashtag → listing mapping

## Frontend Tech

- React 18 + Vite + TypeScript
- Tailwind CSS v4 with custom theme (surface, gem, sus colors)
- shadcn/ui components
- wouter for routing
- @tanstack/react-query for data fetching
- mapbox-gl for interactive map
- embla-carousel via shadcn for photo carousels
- react-icons for Google icon on auth page

## Backend Tech

- Express.js + TypeScript
- Drizzle ORM + Replit PostgreSQL
- Supabase for Google OAuth (auth only)
- SimplyRETS for listing data

## Auth Pattern

- Supabase handles Google OAuth
- On login, frontend calls `POST /api/users/sync` to create/update user in local DB
- All API requests include `x-user-id: <supabase_uuid>` header (set via `setExtraHeadersGetter`)
- Backend uses `x-user-id` for personalized feed (userReactions) and mutations

## Environment Variables

| Secret | Used For |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (backend) |
| `MAPBOX_ACCESS_TOKEN` | Mapbox GL map tiles |
| `SESSION_SECRET` | Express session |
| `DATABASE_URL` | Replit PostgreSQL connection |

## Development

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/cribs run dev

# Push DB schema
pnpm --filter @workspace/db run push

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## User Preferences

- Mobile-first, max-width 480px centered layout
- No emoji in text labels (only in reaction buttons)
- Light mode only
- No comments section in listing detail page (reactions only)
