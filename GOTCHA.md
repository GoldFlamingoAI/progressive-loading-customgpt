# GOTCHA.md — Known Limitations & Upgrade Paths

## 1. Single-tab scaling: the GPT reads the entire `Log` on every request

### What happens

Every coaching query ("What's Workout A today?") and every log write triggers a
`readSheet(sheetName="Log")` call that returns **all rows** in the sheet. The GPT
then scans in memory to find the most recent row per exercise.

This is fine for months. At one session every two days and 11 exercises per session,
you add roughly **2,000 rows per year**. After 1–2 years the GET response can grow
to tens of KB and the GPT's lookup slows noticeably.

### When to worry

You probably won't notice until year 2+. If coaching responses start feeling sluggish
or the GPT occasionally times out on the read, that's the signal.

### Upgrade path — optional `Current` tab

Add a second tab named **`Current`** with the same 7-column header as `Log`:

```
Date	Workout	Order	Exercise	Set 1	Set 2	Set 3
```

Keep it to one row per exercise (no blank rows). This tab holds only the **latest**
state of each exercise — overwritten every session, never growing beyond ~11 rows.

**Updated GPT behavior (no backend change needed):**

- **Coach flow:** `readSheet(sheetName="Current")` — instant, always tiny.
- **Log flow:** two calls in sequence:
  1. `writeSheet` → `action: "update"` on `Current` (match `keyColumn: "Exercise"`)
  2. `writeSheet` → `action: "append"` on `Log` (preserve the full history)

The GAS backend already supports both `append` and `update` with `LockService`
serialization — no code changes required. The only changes are:

1. Create the `Current` tab and paste seed data (same rows as `Log` seed, one per exercise).
2. Update the GPT system prompt: swap "Log" to "Current" in coaching reads, add the
   `Current` update step to the log flow.
3. Update `openapi.json` descriptions if you want to be explicit (optional).

> The backend is intentionally schema-agnostic — it just reads/writes by tab name.
> A new tab with the same headers requires zero backend changes.

---

## 2. Token in the query string

The `GPT_SECRET` token travels in the URL query string on GET requests (GAS can't
reliably read custom headers). This means the token appears in:

- GAS execution logs (Admin → Logs)
- Any proxy or network inspection tool watching the connection

**For a private, single-user GPT this is acceptable.** The token is never shown
to the end user and the GPT instructions explicitly forbid revealing it. If you
ever share the GPT or suspect the token is compromised:

1. Generate a new strong random string.
2. Update `GPT_SECRET` in Apps Script → Project Settings → Script Properties.
3. Re-paste the updated `system_prompt.txt` into the Custom GPT builder.

---

## 3. `doGet` returns all rows — no pagination

The backend has no `limit` or `offset` parameter. If you ever query a very large
`Log` and the response exceeds ~10 MB, Apps Script will silently truncate it.

The `Current`-tab upgrade above eliminates this concern for coaching queries.
For historical analysis (future feature), consider a `limit` query parameter on
`doGet` or export the sheet to a separate tool.
