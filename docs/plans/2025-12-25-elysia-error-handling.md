# Elysia Error Handling Implementation

**Date:** 2025-12-25  
**Status:** ✅ Complete

## Overview

Implemented consistent error handling using Elysia's `onError` lifecycle event per [best practices](https://elysiajs.com/life-cycle/on-error).

## Architecture

### Custom Error Classes (`shared/errors.ts`)

```typescript
class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) { ... }
}

- UnauthorizedError (401)
- ForbiddenError (403)
- NotFoundError (404)
- BadRequestError (400)
- InternalServerError (500)
```

### Error Response Format

All errors return consistent JSON:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "MACHINE_READABLE_CODE",
    "status": 401
  }
}
```

### Global Error Handler (`shared/error-handler.ts`)

Applied at the app level to catch:

- `HttpError` instances (custom errors)
- Elysia validation errors (`VALIDATION`)
- Route not found (`NOT_FOUND`)
- Parse errors (`PARSE`)
- Cookie errors (`INVALID_COOKIE_SIGNATURE`)
- Unexpected errors (500, logged but not exposed)

### Plugin-Level Error Handling

Plugins handle their own domain-specific errors:

```typescript
// modules/auth/service.ts
new Elysia({ name: "Auth.Service" })
  .error({
    UNAUTHORIZED: UnauthorizedError,
    FORBIDDEN: ForbiddenError,
  })
  .onError({ as: "scoped" }, ({ error, set }) => {
    if (error instanceof UnauthorizedError) {
      set.status = 401;
      return {
        error: {
          message: error.message,
          code: error.code,
          status: 401,
        },
      };
    }
    // ... handle other errors
  });
```

**Why plugin-level handlers?**

- Errors thrown in `derive` need to be caught by the plugin's `onError`
- Allows domain-specific error formatting
- Type-safe error handling with custom error classes

## Usage Examples

### In Controllers

```typescript
// modules/recordings/index.ts
.get("/:id", async ({ user, params }) => {
  const result = await RecordingsService.getRecording({
    id: params.id,
    userId: user.id,
  });

  if (result.error === "not_found") {
    throw new NotFoundError("Recording not found", "RECORDING_NOT_FOUND");
  }

  if (result.error === "forbidden") {
    throw new ForbiddenError("Not authorized", "RECORDING_FORBIDDEN");
  }

  return { recording: result.recording };
})
```

### In Auth Plugin

```typescript
// modules/auth/service.ts (inside derive)
if (!token) {
  throw new UnauthorizedError(
    "No authorization header or invalid Bearer token format",
    "MISSING_TOKEN"
  );
}

if (whitelist.length > 0 && !whitelist.includes(userEmail)) {
  throw new ForbiddenError("Email not authorized", "EMAIL_NOT_ALLOWED");
}
```

## Error Code Conventions

Use consistent, machine-readable error codes:

- `MISSING_TOKEN` - No auth header or invalid format
- `INVALID_TOKEN` - Token verification failed
- `EMAIL_NOT_ALLOWED` - Email not in whitelist
- `RECORDING_NOT_FOUND` - Recording doesn't exist
- `RECORDING_FORBIDDEN` - User doesn't own recording
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Route not found
- `PARSE_ERROR` - Body parsing failed
- `INTERNAL_ERROR` - Unexpected server error

## Testing

All error responses are JSON and follow the standard format:

```typescript
const response = await app.handle(new Request("http://localhost/me"));
expect(response.status).toBe(401);

const body = await response.json();
expect(body).toEqual({
  error: {
    message: "No authorization header or invalid Bearer token format",
    code: "MISSING_TOKEN",
    status: 401,
  },
});
```

## Verification

```bash
✅ bun test              # 10/10 tests passing
✅ bun run check-types   # TypeScript clean
✅ No linter errors      # Biome clean
```

## Benefits

1. **Consistent API**: All errors follow the same JSON structure
2. **Type Safety**: Custom error classes provide type checking
3. **Machine Readable**: Error codes enable client-side error handling
4. **Debugging**: Status codes + codes + messages provide context
5. **Security**: Internal errors logged but not exposed to clients
6. **Elysia Native**: Uses Elysia's `onError` lifecycle (no middleware hacks)

## Migration Notes

**Before:**

```typescript
if (!recording) {
  set.status = 404;
  throw new Error("Recording not found");
}
```

**After:**

```typescript
if (!recording) {
  throw new NotFoundError("Recording not found", "RECORDING_NOT_FOUND");
}
// No need to set status - error handler does it
```

## See Also

- [Elysia Error Handling Docs](https://elysiajs.com/life-cycle/on-error)
- `AGENTS.md` for error handling conventions
- `shared/errors.ts` for available error classes
- `shared/error-handler.ts` for global error handler
