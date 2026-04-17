# Planner 51

Linked tasks and notes app with wikilink-based knowledge graph.

## Monorepo Layout

```
planner-51/
├── apps/
│   ├── api/          # Fastify + tRPC + Lucia auth (port 8080)
│   └── web/          # Vite + React + TanStack Router + TipTap
├── packages/
│   ├── db/           # Drizzle ORM schema + migrations (Neon Postgres)
│   └── shared/       # Zod validation schemas
├── Dockerfile        # Multi-stage build
├── fly.toml          # Fly.io config (iad region)
└── turbo.json        # Turborepo task config
```

## Stack

- **Runtime:** Node 22, pnpm 10, Turborepo
- **API:** Fastify 5, tRPC 11, Lucia 3 (session auth), bcrypt
- **Web:** React 19, Vite 5, TanStack Router, TanStack Query, TipTap, Tailwind CSS 4, Zustand
- **DB:** Drizzle ORM, Neon Postgres (US East), pooled + direct connections
- **Deploy:** Fly.io (iad), Dockerfile, release_command runs migrations

## Key Conventions

- No `any` in TypeScript — strict mode everywhere
- Commit per feature: `feat(scope): description`
- All packages compile to `dist/` via `tsc` — `main` in package.json points to `./dist/index.js`
- Wikilinks: `[[Title]]` and `[[Title|alias]]` parsed from item content, stored as `item_links`

## Adding a New tRPC Router

1. Create `apps/api/src/routers/myRouter.ts`
2. Define procedures using `publicProcedure`, `protectedProcedure`, or `workspaceProcedure`
3. Add to `apps/api/src/routers/index.ts` appRouter
4. Types auto-propagate to the web app via the relative type import

## Adding a New Drizzle Table

1. Add table definition to `packages/db/src/schema.ts`
2. Add relations if needed
3. Export from schema
4. Run `pnpm db:generate` then `pnpm db:migrate`
5. Migration runs automatically on Fly deploy via release_command

## Wikilink Parser

`apps/api/src/lib/wikilinks.ts` — regex parses `[[Title]]` and `[[Title|alias]]` from item content. On item create/update, the item router calls `upsertWikilinks()` which resolves titles to items in the same workspace and upserts into `item_links`.

## Environment

- `DATABASE_URL` — Neon pooled connection (has `-pooler` in host)
- `DIRECT_URL` — Neon direct connection (for migrations)
- `SESSION_SECRET` — 64-char hex for Lucia sessions
- `RESEND_API_KEY` — Optional, for magic-link emails
- `PORT` — 8080 in production

## Dev

```bash
pnpm install
pnpm dev          # runs api + web via Turbo
pnpm build        # builds all packages
pnpm typecheck    # typechecks all packages
pnpm db:generate  # generate migration from schema changes
pnpm db:migrate   # run migrations against DIRECT_URL
```
