# Migrating Elysia/Eden Treaty to oRPC

**Session ID:** ses_49bfb3e65ffermpE9RSTrOgS82
**Created:** 12/28/2025, 3:13:11 PM
**Updated:** 12/28/2025, 4:15:39 PM

---

## User

i want to migrate from plain elysia with eden treaty to use orpc for communication between client and server. i already set some baseline code. plan carefully

---

## Assistant

I'll help you plan a migration from Elysia + Eden Treaty to oRPC. Let me first understand your current setup and the baseline code you've already written.

```
Tool: task
```

```
Tool: context7_resolve-library-id
```

---

## Assistant

Excellent! I found the oRPC library and have a comprehensive understanding of your current setup. Let me fetch the oRPC documentation for best practices, then I'll synthesize a migration plan.

```
Tool: context7_get-library-docs
```

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Now let me look at the current Elysia modules to understand what needs to be migrated, and how auth currently works:

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Now let me fetch more oRPC docs on authentication middleware patterns:

```
Tool: context7_get-library-docs
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Let me also check the native app features to understand mutations and how import works:

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Now let me check the import controller to understand the full endpoint:

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Excellent! Now I have a comprehensive understanding of your codebase. Let me check one more thing - how auth headers are handled with oRPC:

```
Tool: context7_get-library-docs
```

---

## Assistant

Now I have all the information I need. Let me synthesize a comprehensive migration plan for you.

---

## Migration Plan: Elysia + Eden Treaty → oRPC

### Current State Summary

**What you have:**
1. **Server (`apps/server`)**: Elysia as HTTP framework with oRPC already mounted at `/rpc` 
2. **Elysia modules** (`src/modules/{auth,recordings,import}`): Fully implemented but **NOT mounted** to the main app
3. **Native client**: Both oRPC and Eden Treaty clients exist in `lib/api.ts`
4. **Working oRPC example**: `todo` router is functional end-to-end
5. **Broken state**: Native app imports `App` type from server that doesn't exist; Eden calls go to unmounted routes

**Key observation**: The migration is half-done. The oRPC infrastructure exists, but the actual business logic (recordings, import, auth) still lives in Elysia controllers.

---

### Migration Strategy

I recommend a **service-first approach** - your services are already well-structured with no Elysia dependencies, so we can directly wire them to oRPC procedures.

#### Phase 1: Auth Middleware for oRPC
Port the auth logic to an oRPC middleware that validates Bearer tokens and derives `user` context.

**Files to create/modify:**
- `packages/api/src/middleware/auth.ts` - oRPC auth middleware
- `packages/api/src/index.ts` - Add `protectedProcedure`

**Pattern:**
```typescript
// packages/api/src/middleware/auth.ts
import { ORPCError, os } from "@orpc/server";

export const authMiddleware = os
  .$context<{ headers: Headers }>()
  .middleware(async ({ context, next }) => {
    const token = context.headers.get("Authorization")?.split(" ")[1];
    if (!token) throw new ORPCError("UNAUTHORIZED");
    
    const user = await validateToken(token); // Your Supabase logic
    if (!user) throw new ORPCError("UNAUTHORIZED");
    
    return next({ context: { user } });
  });
```

---

#### Phase 2: Recordings Router
Convert the recordings Elysia controller to oRPC procedures. Services are ready - just wire them.

**Files to create/modify:**
- `packages/api/src/routers/recordings.ts` - oRPC recordings router
- `packages/api/src/models/recordings.ts` - Zod schemas (replace Elysia `t.*`)

**Procedures to implement:**

| Elysia Route | oRPC Procedure | Auth |
|--------------|----------------|------|
| `GET /recordings` | `recordings.list` | Protected |
| `GET /recordings/:id` | `recordings.get` | Protected |
| `POST /recordings` | `recordings.create` | Protected |
| `DELETE /recordings/:id` | `recordings.delete` | Protected |
| `PATCH /recordings/:id` | `recordings.update` | Protected |
| `POST /recordings/process-pending` | `recordings.processPending` | Protected |

---

#### Phase 3: Import Router
Port the WhatsApp import endpoint.

**Files to create:**
- `packages/api/src/routers/import.ts` - oRPC import router

| Elysia Route | oRPC Procedure | Auth |
|--------------|----------------|------|
| `POST /import/whatsapp` | `import.whatsapp` | Protected |

---

#### Phase 4: Context + Server Integration
Update context creation to extract headers for auth middleware.

**Files to modify:**
- `packages/api/src/context.ts` - Include headers in context
- `apps/server/src/index.ts` - Pass headers to context

---

#### Phase 5: Native Client Migration
Update all client code to use oRPC instead of Eden Treaty.

**Files to modify:**
- `apps/native/lib/api.ts` - Add auth headers to RPCLink, remove Eden Treaty
- `apps/native/queries/recordings.ts` - Use `orpc.recordings.list.queryOptions()`
- `apps/native/features/recordings.ts` - Use `orpc.recordings.delete.mutationOptions()`
- `apps/native/features/upload.ts` - Use `orpc.recordings.create`
- `apps/native/features/import.ts` - Use `orpc.import.whatsapp`

**Pattern change:**
```typescript
// Before (Eden Treaty)
const { data, error } = await api.recordings.get({ query: params });

// After (oRPC)
const data = await client.recordings.list(params);
// or with React Query:
useQuery(orpc.recordings.list.queryOptions({ input: params }))
```

---

#### Phase 6: Cleanup
Remove Elysia modules and Eden Treaty dependency.

**Files to delete:**
- `apps/server/src/modules/` (entire directory)
- `apps/server/src/shared/errors.ts` (Elysia-specific errors)

**Dependencies to remove:**
- `@elysiajs/eden` from `apps/native/package.json`
- Elysia-specific imports from server

---

### Questions Before Proceeding

1. **Auth validation**: Your current auth uses Supabase. Should I:
   - (a) Move the Supabase token validation logic into `packages/api/src/middleware/auth.ts`, or
   - (b) Keep it in `apps/server/` and pass the validated user to oRPC context from Elysia?

2. **Error handling**: oRPC uses `ORPCError` with codes like `"UNAUTHORIZED"`, `"NOT_FOUND"`, `"FORBIDDEN"`. Your current services return discriminated unions like `{ error: "not_found" }`. Do you want to:
   - (a) Throw `ORPCError` directly in services (cleaner, but couples services to oRPC), or
   - (b) Keep services returning discriminated unions and translate to `ORPCError` in procedures (more separation)?

3. **File uploads**: The recordings `POST` endpoint accepts base64-encoded files. oRPC handles this fine, but I want to confirm - is this the pattern you want to keep, or should we explore `FormData`/multipart for potentially smaller payloads?

4. **API package location**: Currently `packages/api/` is a shared package. The services (with DB calls) are in `apps/server/src/modules/*/service.ts`. Do you want to:
   - (a) Move service functions into `packages/api/` (monorepo-clean, types in one place), or
   - (b) Keep services in `apps/server/` and import them into `packages/api/` routers?

5. **Timeline preference**: Do you want the plan broken into smaller PRs (one per phase), or a single comprehensive migration?

---

## User

1. move it to use orpc context/middleware
2. lets utilize ORPC error handling pattern
3. keep it
4. yes move it. /apps/server just for elysia entrypoint
5. single one

dont forget to document it well

---

## Assistant

Let me load the planning skill to create a comprehensive, well-documented migration plan.

```
Tool: use_skill
```

---

## User

---

## Assistant

I'm using the writing-plans skill to create the implementation plan.

Let me create a comprehensive, well-documented migration plan.

```
Tool: list
```

---

## Assistant

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Now let me check a few more files that will be needed for the migration plan:

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Now I have all the context needed. Let me write the comprehensive migration plan:

---

## User

continue

---

## Assistant

```
Tool: write
```

---

## Assistant

Plan saved successfully. The diagnostics shown are for existing code issues, not the plan itself.

---

**Plan complete and saved to `docs/plans/2025-12-28-orpc-migration.md`.**

## Summary

This is a comprehensive 16-task migration plan that:

1. **Moves all shared utilities** (storage, audio-converter, supabase) to `packages/api/src/services/`
2. **Creates oRPC auth middleware** with Supabase token validation
3. **Migrates business logic** (recordings service, import service) with oRPC error handling
4. **Adds Zod schemas** for all inputs/outputs
5. **Creates oRPC routers** for recordings and import
6. **Updates server** to be a thin Elysia wrapper
7. **Migrates native app** to use oRPC client with TanStack Query integration
8. **Removes Eden Treaty** and unused Elysia modules
9. **Documents everything** in a comprehensive README

### Key Decisions Implemented

| Decision | Implementation |
|----------|---------------|
| Auth in oRPC middleware | `packages/api/src/middleware/auth.ts` |
| oRPC error handling | Services throw `ORPCError` directly |
| Keep base64 uploads | Same pattern, just via oRPC |
| Move services to api package | All services in `packages/api/src/services/` |
| Single comprehensive PR | One plan with sequential tasks |

---

**Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch a fresh subagent per task, we review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session in a worktree, use executing-plans skill for batch execution with checkpoints

**Which approach?**

---

## User

option 1

---

## Assistant

```
Tool: use_skill
```

---

## User

---

## Assistant

I'm using Subagent-Driven Development to execute this plan.

Let me first read the plan and extract all tasks to create the TodoWrite:

```
Tool: read
```

---

## Assistant

I've read the full plan. Now let me create the TodoWrite with all 16 tasks:

```
Tool: todowrite
```

---

## Assistant

Now let me start with Task 1. First, I need to read the implementer prompt template:

```
Tool: read
```

---

## Assistant

Now let me mark Task 1 as in_progress and dispatch the implementer subagent:

```
Tool: todowrite
```

---

## Assistant

```
Tool: task
```

---

## Assistant

Good questions from the implementer. Let me check the current env and provide clear guidance:

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Now I have the answers. Let me also check the shared.ts to see the env var name:

```
Tool: read
```

---

## Assistant

Now I have all the answers. Let me continue the subagent with clear answers:

```
Tool: task
```

---

## Assistant

Task 1 implementation complete. Now let me read the reviewer prompts and dispatch the spec compliance reviewer:

```
Tool: read
```

---

## Assistant

```
Tool: task
```

---

## Assistant

Spec compliance ✅. Now let me read the code quality reviewer prompt and dispatch it:

```
Tool: read
```

---

## Assistant

Let me get the git SHAs for the code review:

```
Tool: bash
```

---

## Assistant

```
Tool: task
```

---

## Assistant

Code review found issues. Let me dispatch the implementer to fix them:

```
Tool: task
```

---

## Assistant

Fixes applied. Let me verify with a quick re-review and then mark Task 1 complete:

```
Tool: bash
```

---

## Assistant

Good, commit was amended. Task 1 is complete. Let me mark it and move to Task 2:

```
Tool: todowrite
```

---

## Assistant

Now dispatching Task 2 - Auth Middleware:

```
Tool: task
```

---

## Assistant

Now dispatch spec compliance review for Task 2:

```
Tool: task
```

---

## Assistant

The spec deviation is very minor and intentional (Biome's barrel file warning). Since the middleware already imports `validateToken` directly and works correctly, this is acceptable. Let me proceed with the code quality review:

```
Tool: bash
```

---

## Assistant

```
Tool: task
```

---

## Assistant

Good catches. Let me dispatch the implementer to fix these issues:

```
Tool: task
```

---

## Assistant

Task 2 complete. Let me mark it and move to Task 3:

```
Tool: todowrite
```

---

## Assistant

Given the length of Task 3 (recordings service is ~500 lines), let me dispatch this task:

```
Tool: task
```

---

## Assistant

---

## User

we are out of token hehe. task 3 is done. its already commited. mark it as done. update the docs

---

## Assistant

---

