# ARCHITECTURE.md — Progressive Overload Workout Tracker

> **Read this first.** This is the master spec. It tells you (Codex) what to build,
> in what order, and how to know when each piece is correct. Detailed specs live in
> the modular files referenced below. Build strictly to these docs — do not invent
> behavior that isn't specified here.

---

## 1. What This Project Is

A personal **progressive bulking workout tracker** driven by a **Custom GPT** (voice or
text) talking to a **Google Apps Script (GAS) Web App**, which reads and writes a
**Google Sheet**.

Two user flows:

1. **Coach flow ("What should I do today?")** — GPT reads the last session for an
   exercise and tells the user the exact target reps/weight for each set, using the
   progressive overload rules.
2. **Log flow ("I just did X")** — GPT parses the user's spoken/typed results, updates
   the `Current` sheet (overwrite latest), appends an immutable row to the `Log` sheet,
   then states next session's target.

**Design principle:** All progression *math* lives in the GPT system prompt. The GAS
backend is a dumb, generic read/write bridge — it knows nothing about workouts. This
keeps the backend trivial to test and lets the playbook evolve without redeploying code.

---

## 2. System Diagram

```
┌──────────────┐   voice/text    ┌──────────────────┐
│  User (phone)│ ───────────────▶│   Custom GPT     │
│              │◀─────────────── │ (Whisper + GPT)  │
└──────────────┘   spoken reply  └────────┬─────────┘
                                          │ HTTPS (OpenAPI Action)
                                          │ GET  ?token&sheetName
                                          │ POST {token,action,...}
                                          ▼
                                 ┌──────────────────┐
                                 │  GAS Web App     │
                                 │  SheetsAPI.gs    │
                                 │  doGet / doPost  │
                                 └────────┬─────────┘
                                          │ SpreadsheetApp
                                          ▼
                                 ┌──────────────────┐
                                 │  Google Sheet    │
                                 │  Current │ Log   │
                                 └──────────────────┘
```

---

## 3. Tech Stack & Constraints

| Layer | Choice | Notes |
|---|---|---|
| Frontend / NLU | OpenAI Custom GPT | Native voice (Whisper) on mobile app |
| Bridge / backend | Google Apps Script Web App | V8 runtime, free, no servers |
| Storage | Google Sheets (one spreadsheet, 2 tabs) | `Current` + `Log` |
| Auth | Shared secret token | Query param (GET) / body field (POST) |
| Keep-alive | GAS time trigger | Eliminates cold starts during workout hours |

**Hard constraints:**
- GAS Web Apps cannot reliably read custom HTTP headers → token travels in the
  query string (GET) and JSON body (POST), **never** in a header.
- `doPost` receives the raw body as `e.postData.contents` (a string) → must
  `JSON.parse` it.
- Responses must be `ContentService` JSON with `MimeType.JSON`.
- No external npm/libraries — pure GAS standard services only.

---

## 4. Deliverables (File Manifest)

Codex produces exactly these artifacts. Each has a dedicated spec doc.

| Artifact | Where it ends up | Spec doc |
|---|---|---|
| `SheetsAPI.gs` | Apps Script project | [GAS_BACKEND.md](./GAS_BACKEND.md) |
| `KeepWarm.gs` | Apps Script project | [GAS_BACKEND.md](./GAS_BACKEND.md) §6 |
| `openapi.json` | Custom GPT → Actions → Schema | [OPENAPI_SCHEMA.md](./OPENAPI_SCHEMA.md) |
| `system_prompt.txt` | Custom GPT → Instructions | [GPT_INSTRUCTIONS.md](./GPT_INSTRUCTIONS.md) |
| Sheet headers + seed rows | Google Sheet (manual paste) | [SHEET_SETUP.md](./SHEET_SETUP.md) |
| Progression logic (source of truth) | referenced by GPT prompt | [PROGRESSION_RULES.md](./PROGRESSION_RULES.md) |

> Only `SheetsAPI.gs` and `KeepWarm.gs` are *code*. The rest are config artifacts
> Codex generates as text files for copy-paste.

---

## 5. Data Model (authoritative)

Full column definitions and seed data are in [SHEET_SETUP.md](./SHEET_SETUP.md). Summary:

**`Current` tab** — one row per exercise, overwritten each session.
```
exercise | day | w1 | s1 | w2 | s2 | w3 | s3 | partials | last_date
```

**`Log` tab** — append-only, never modified.
```
date | exercise | day | w1 | s1 | w2 | s2 | w3 | s3 | partials | hit_target
```

- `wN` = weight (lb) for set N. `sN` = full reps completed for set N.
- Three independent working sets, each its own weight (pyramid or straight).
- `partials` = optional last-set partial reps; tracked, **never** counted toward
  progression.
- Dates are `YYYY-MM-DD`.

---

## 6. API Contract (authoritative)

Generic key/value sheet bridge. Backend validates the token, never workout logic.

### GET — read a tab
```
GET {WEBAPP_URL}?token={SECRET}&sheetName=Current
→ 200 application/json
  [ { "exercise":"Bench Press","day":1,"w1":50,"s1":12, ... }, ... ]
```
Returns an array of row objects keyed by header names (row 1). Empty tab → `[]`.

### POST — write
Body is JSON. `action` selects behavior.

**Append (Log):**
```json
{ "token":"SECRET", "sheetName":"Log", "action":"append",
  "rowData":["2026-06-23","Bench Press",1,50,13,60,12,70,12,0,"yes"] }
→ { "status":"ok", "action":"appended" }
```

**Update (Current):** match a row by key column, set named fields.
```json
{ "token":"SECRET", "sheetName":"Current", "action":"update",
  "keyColumn":"exercise", "keyValue":"Bench Press",
  "rowData":{ "w1":50,"s1":13,"w2":60,"s2":12,"w3":70,"s3":12,
              "partials":0,"last_date":"2026-06-23" } }
→ { "status":"ok", "action":"updated", "row":3 }
```

**Error shape (always 200 + JSON, never an HTML error page):**
```json
{ "error": "human-readable reason" }
```
Bad/missing token → `{ "error":"Forbidden: invalid token" }`.

Full handler logic and edge cases: [GAS_BACKEND.md](./GAS_BACKEND.md).

---

## 7. Build Sequence (do in this order)

1. **Backend** — write `SheetsAPI.gs` per [GAS_BACKEND.md](./GAS_BACKEND.md). This is
   the only real code. Get it passing the test cases in §8 before anything else.
2. **Keep-warm** — add `KeepWarm.gs` (§6 of GAS_BACKEND.md).
3. **OpenAPI schema** — generate `openapi.json` per [OPENAPI_SCHEMA.md](./OPENAPI_SCHEMA.md).
   Must match the API contract above 1:1 (operationIds `readSheet`, `writeSheet`).
4. **System prompt** — generate `system_prompt.txt` per
   [GPT_INSTRUCTIONS.md](./GPT_INSTRUCTIONS.md), embedding the rules from
   [PROGRESSION_RULES.md](./PROGRESSION_RULES.md) verbatim.
5. **Sheet setup doc** — emit the headers + seed rows from
   [SHEET_SETUP.md](./SHEET_SETUP.md) (no code; this is a human paste step).

Placeholders Codex must leave clearly marked for the human to fill:
`{{WEBAPP_DEPLOYMENT_ID}}`, `{{GPT_SECRET}}`.

---

## 8. Acceptance Criteria

Backend is correct when **all** of these hold (see GAS_BACKEND.md §7 for runnable
test stubs):

- [ ] GET with valid token + `sheetName=Current` returns an array of objects whose
      keys equal the header row.
- [ ] GET with wrong/missing token returns `{"error":"Forbidden: invalid token"}`.
- [ ] GET for a nonexistent sheet returns `{"error":"Sheet not found: X"}`.
- [ ] GET on an empty tab returns `[]`.
- [ ] POST append adds exactly one row in column order and returns `appended`.
- [ ] POST update changes only the named fields of the matched row, leaves others
      untouched, returns the 1-indexed `row`.
- [ ] POST update with no matching `keyValue` returns an error (no silent write).
- [ ] POST with malformed JSON returns `{"error":"Invalid JSON body"}`, not a crash.
- [ ] Every response is `application/json` via `ContentService`.

End-to-end is correct when:

- [ ] "What's Day 1?" returns all 6 Day-1 exercises with per-set targets matching
      [PROGRESSION_RULES.md](./PROGRESSION_RULES.md).
- [ ] Logging a session updates `Current`, appends to `Log`, and the GPT states the
      next target.
- [ ] A 15/15/15 session triggers +2.5 lb on every set and a reset to ~8–10 reps.

---

## 9. Out of Scope (do NOT build)

- No workout logic in GAS. No progression math server-side.
- No user accounts / multi-user. Single user, single spreadsheet.
- No deletion endpoint. `Log` is append-only forever.
- No Telegram, no web UI, no charts (the `Log` tab is the raw history; analysis is a
  future GPT-side feature only).
- No header-based auth.

---

## 10. Module Index

- [GAS_BACKEND.md](./GAS_BACKEND.md) — full `SheetsAPI.gs` + `KeepWarm.gs` spec & code
- [OPENAPI_SCHEMA.md](./OPENAPI_SCHEMA.md) — Custom GPT Actions schema
- [GPT_INSTRUCTIONS.md](./GPT_INSTRUCTIONS.md) — Custom GPT system prompt
- [PROGRESSION_RULES.md](./PROGRESSION_RULES.md) — overload playbook (source of truth)
- [SHEET_SETUP.md](./SHEET_SETUP.md) — tab headers + seed data + deploy steps
