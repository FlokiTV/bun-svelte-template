# Error handling

API errors use one envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "requestId": "..."
  }
}
```

Rules:

- `code` is stable and intended for client branching and logs.
- `message` is safe for clients; never expose stack traces or secrets.
- `requestId` correlates the client error with structured server logs.
- Add reusable codes to `apps/api/src/core/errors.ts` instead of inventing strings in routes.
- Validation errors return 422; auth failures 401/403; conflicts 409; unknown failures 500.
