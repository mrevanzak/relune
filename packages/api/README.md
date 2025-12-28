# @relune/api

Type-safe API layer using oRPC with Zod validation.

## Architecture

```
packages/api/
├── src/
│   ├── index.ts          # Base + protected procedures
│   ├── context.ts        # Request context (headers, user)
│   ├── middleware/
│   │   └── auth.ts       # Supabase auth middleware
│   ├── models/           # Zod schemas
│   │   ├── recordings.ts
│   │   └── import.ts
│   ├── routers/          # oRPC routers
│   │   ├── index.ts      # Root router (appRouter)
│   │   ├── recordings.ts
│   │   └── import.ts
│   └── services/         # Business logic
│       ├── recordings.ts
│       ├── import.ts
│       ├── storage.ts
│       ├── audio-converter.ts
│       └── supabase.ts
```

## Usage

### Server (apps/server)

```typescript
import { createContext } from "@relune/api/context";
import { appRouter } from "@relune/api/routers";
import { RPCHandler } from "@orpc/server/fetch";

const handler = new RPCHandler(appRouter);

// In your HTTP handler:
const { response } = await handler.handle(request, {
  prefix: "/rpc",
  context: createContext(request.headers),
});
```

### Client (apps/native)

```typescript
import type { AppRouterClient } from "@relune/api/routers";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

const link = new RPCLink({
  url: "http://localhost:3000/rpc",
  headers: async () => ({
    Authorization: `Bearer ${token}`,
  }),
});

const client: AppRouterClient = createORPCClient(link);
const orpc = createTanstackQueryUtils(client);

// Direct call
const recordings = await client.recordings.list({ limit: 20 });

// With React Query
const { data } = useQuery(orpc.recordings.list.queryOptions({
  input: { limit: 20 }
}));
```

## Endpoints

### Public

- `healthCheck` - Returns "OK"

### Protected (requires auth)

#### Recordings

- `recordings.list` - List recordings with search/pagination
- `recordings.get` - Get single recording by ID
- `recordings.create` - Upload new recording (base64)
- `recordings.update` - Update metadata/keywords
- `recordings.delete` - Delete recording + audio file
- `recordings.processPending` - Trigger transcription

#### Import

- `import.whatsapp` - Import WhatsApp chat export ZIP

## Error Handling

All errors are thrown as `ORPCError` with standard codes:

- `UNAUTHORIZED` - Missing or invalid auth token
- `FORBIDDEN` - Valid token but not allowed
- `NOT_FOUND` - Resource doesn't exist
- `BAD_REQUEST` - Invalid input or operation failed

```typescript
import { ORPCError } from "@orpc/server";

throw new ORPCError("NOT_FOUND", {
  message: "Recording not found",
  data: { code: "RECORDING_NOT_FOUND", id },
});
```

## Adding New Endpoints

1. **Create model** (`models/<feature>.ts`):
   ```typescript
   export const myInput = z.object({ ... });
   export type MyInput = z.infer<typeof myInput>;
   ```

2. **Create service** (`services/<feature>.ts`):
   ```typescript
   export async function myFunction(input: MyInput) {
     // Business logic, throw ORPCError for errors
   }
   ```

3. **Create router** (`routers/<feature>.ts`):
   ```typescript
   export const myRouter = {
     myProcedure: protectedProcedure
       .input(myInput)
       .handler(async ({ input, context }) => {
         return myFunction(input);
       }),
   };
   ```

4. **Add to appRouter** (`routers/index.ts`):
   ```typescript
   export const appRouter = {
     // ...existing
     myFeature: myRouter,
   };
   ```


