# GOTCHA.md — Known Limitations & Upgrade Paths

## 1. Single-tab scaling — handled by `Archive.gs`

The GPT reads the entire `Log` on every request and scans in memory for the most
recent row per exercise. Left unbounded, ~2,000 rows/year would eventually slow that
read.

**This is now actively managed.** `apps-script/Archive.gs` keeps only the newest
`ARCHIVE_KEEP_SESSIONS` (default **8** ≈ 4 weeks) distinct workout dates in `Log` and
moves older rows to an `Archive` tab. Run it manually from the editor, or attach a
weekly time trigger (`archiveOldWorkouts` → Time-driven → Week timer). The `Log` tab
stays small and fast forever; full history is preserved in `Archive`.

Tune retention by editing `ARCHIVE_KEEP_SESSIONS` at the top of `Archive.gs`. If you
later want the GPT to read history, point a query at the `Archive` tab — the backend
is schema-agnostic and needs no changes.

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
