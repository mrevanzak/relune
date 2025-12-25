# Elysia Server Best-Practice Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `apps/server` to follow Elysia “Best Practice” (feature-based modules + controller/service/model separation) without changing API behavior.

**Architecture:** Move HTTP routing to feature controllers (Elysia instances) under `src/modules/*`, extract DB/business logic into `service.ts` files (no Elysia `Context`), and keep runtime validation/type inference in `model.ts` using `t.*`. Configure request-dependent auth as an Elysia plugin with a stable `name` for plugin deduplication.

**Tech Stack:** Bun, Elysia, TypeBox (`t`), Drizzle ORM, Supabase.

---

### Task 1: Add module skeletons

**Files:**

- Create: `apps/server/src/shared/env.ts`
- Create: `apps/server/src/modules/auth/{index.ts,service.ts,model.ts}`
- Create: `apps/server/src/modules/me/{index.ts,model.ts}`
- Create: `apps/server/src/modules/recordings/{index.ts,service.ts,model.ts}`

**Step 1: Create `shared/env.ts`**

- Add tiny helpers to read required env vars and parse comma-separated lists.

**Step 2: Create `modules/auth/service.ts`**

- Move `createAuthPlugin` + types here.
- Ensure the plugin has a stable `name` (eg. `Auth.Service`) so `.use(...)` is deduped.

**Step 3: Create `modules/auth/index.ts`**

- Configure Supabase client + allowed emails from env.
- Export `auth` plugin instance.

**Step 4: Create `modules/me/index.ts`**

- Implement `/api/me` route behind `.use(auth)`.

**Step 5: Create `modules/recordings/service.ts`**

- Implement `listRecordingsForUser(...)` and `getRecordingById(...)` using Drizzle.

**Step 6: Create `modules/recordings/index.ts`**

- Implement `/recordings` routes behind `.use(auth)` and delegate DB work to the service.

---

### Task 2: Switch server entrypoint to module composition

**Files:**

- Modify: `apps/server/src/index.ts`
- Delete: `apps/server/src/middleware/auth.ts`
- Delete: `apps/server/src/middleware/auth-factory.ts`
- Delete: `apps/server/src/middleware/auth-factory.test.ts`
- Delete: `apps/server/src/routes/recordings.ts`

**Step 1: Update `apps/server/src/index.ts`**

- Keep `/` and `/health` public.
- Compose `modules/me` and `modules/recordings` controllers via `.use(...)`.

**Step 2: Remove old folders**

- Delete `src/middleware/*` and `src/routes/recordings.ts` once imports are migrated.

---

### Task 3: Move/update tests

**Files:**

- Create: `apps/server/src/modules/auth/service.test.ts`

**Step 1: Move the existing auth plugin tests**

- Update imports to point at `./service`.
- Keep the same assertions (401/403/200 behavior).

---

### Task 4: Verification

**Step 1: Lint/format**

- Run: `bun check`
- Expected: no Biome errors

**Step 2: Typecheck**

- Run: `bun turbo check-types`
- Expected: no TypeScript errors

**Step 3: Unit tests**

- Run: `bun test apps/server/src/modules/auth/service.test.ts`
- Expected: all passing
