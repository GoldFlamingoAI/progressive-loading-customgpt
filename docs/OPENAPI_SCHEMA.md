# OPENAPI_SCHEMA.md — Custom GPT Actions Schema

> Paste destination: **Custom GPT → Configure → Actions → Create new action → Schema**.
> Must mirror the API contract in [ARCHITECTURE.md](./ARCHITECTURE.md) §6 exactly.
> operationIds are referenced by name in the system prompt: `readSheet`, `writeSheet`.

---

## Placeholders to fill before saving

| Placeholder | Replace with |
|---|---|
| `{{WEBAPP_DEPLOYMENT_ID}}` | The ID segment of the GAS Web App URL (between `/s/` and `/exec`). |

The server URL is everything **before** `/exec`; the single path is `/exec`.
Final base looks like: `https://script.google.com/macros/s/AKfycb.../`.

---

## Authentication setup (in the same Action panel)

GAS can't read custom headers, so the token rides in the query (GET) and body (POST).
Set Action auth to **None** here and rely on the `token` parameter the schema declares
— the GPT supplies it from the system prompt. (Do **not** configure API-Key header
auth; it won't reach the script.)

> Trade-off: the secret lives in the GPT instructions, not a header vault. Acceptable
> for a private, single-user GPT. Rotate `GPT_SECRET` if the GPT is ever shared.

---

## `openapi.json`

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Workout Sheets Bridge",
    "description": "Read and append workout rows in a single Google Sheets tab (Log) via Apps Script.",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://script.google.com/macros/s/{{WEBAPP_DEPLOYMENT_ID}}"
    }
  ],
  "paths": {
    "/exec": {
      "get": {
        "operationId": "readSheet",
        "summary": "Read all rows from a named sheet tab.",
        "parameters": [
          {
            "name": "sheetName",
            "in": "query",
            "required": true,
            "description": "Exact tab name: 'Log'.",
            "schema": { "type": "string" }
          },
          {
            "name": "token",
            "in": "query",
            "required": true,
            "description": "Shared secret authentication token.",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Array of row objects keyed by header names.",
            "content": {
              "application/json": {
                "schema": { "type": "array", "items": { "type": "object" } }
              }
            }
          }
        }
      },
      "post": {
        "operationId": "writeSheet",
        "summary": "Append a workout row to Log (or, optionally, update a row by key).",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["token", "sheetName", "action"],
                "properties": {
                  "token": {
                    "type": "string",
                    "description": "Shared secret authentication token."
                  },
                  "sheetName": {
                    "type": "string",
                    "description": "Exact tab name: 'Log'."
                  },
                  "action": {
                    "type": "string",
                    "enum": ["append", "update"],
                    "description": "append = add a workout row to Log (normal use); update = optionally correct an existing row by key."
                  },
                  "rowData": {
                    "description": "append: ordered array [Date, Workout, Order, Exercise, Set 1, Set 2, Set 3] — set cells are '<weight> lb x <reps>'. update: object of {header: value} for fields to change.",
                    "oneOf": [
                      { "type": "array", "items": {} },
                      { "type": "object" }
                    ]
                  },
                  "keyColumn": {
                    "type": "string",
                    "description": "update only: header name to match on (e.g. 'Exercise')."
                  },
                  "keyValue": {
                    "type": "string",
                    "description": "update only: value in keyColumn identifying the target row."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Result of the write.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string" },
                    "action": { "type": "string" },
                    "row": { "type": "integer" },
                    "error": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Privacy Policy field (required by OpenAI to save the Action)

OpenAI requires a Privacy Policy URL before a GPT with Actions can be saved/published.
Provide any reachable URL you control (a one-line policy page, a GitHub Gist, etc.).
For a private GPT, a minimal statement that the GPT writes the user's own workout data
to the user's own Google Sheet is sufficient.

---

## Validation after pasting

- [ ] GPT Action editor shows two operations: `readSheet`, `writeSheet`.
- [ ] "Test" on `readSheet` with `sheetName=Log` and the real token returns your rows.
- [ ] "Test" on `writeSheet` append to `Log` returns `{"status":"ok","action":"appended"}`.
