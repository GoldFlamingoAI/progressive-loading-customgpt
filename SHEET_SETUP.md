# SHEET_SETUP.md — Spreadsheet Layout & Seed Data

> One Google Spreadsheet ("Workout Logs Spreadsheet") with two tabs: `Current`
> and `Log`. The Apps Script project must be **bound** to this spreadsheet
> (Extensions → Apps Script from within the sheet) so `getActiveSpreadsheet()` resolves.
> This is a manual human paste step — Codex emits the headers/rows as text, it does
> not (and cannot) create the sheet.

---

## Tab 1: `Current` (one row per exercise, overwritten each session)

**Row 1 headers (exact, in order):**
```
exercise	day	w1	s1	w2	s2	w3	s3	partials	last_date
```

**Seed rows (paste starting row 2). `last_date` left blank until first logged session.**

| exercise | day | w1 | s1 | w2 | s2 | w3 | s3 | partials | last_date |
|---|---|---|---|---|---|---|---|---|---|
| Bench Press | 1 | 50 | 12 | 60 | 12 | 70 | 12 | 0 | |
| Seated Row | 1 | 50 | 12 | 60 | 12 | 70 | 12 | 0 | |
| Standing Chest Fly | 1 | 40 | 12 | 50 | 12 | 60 | 12 | 0 | |
| Hammer Curl | 1 | 30 | 10 | 30 | 10 | 30 | 10 | 0 | |
| Shoulder Shrug | 1 | 70 | 12 | 70 | 12 | 70 | 12 | 0 | |
| Regular Bicep Curl | 1 | 50 | 12 | 50 | 12 | 50 | 12 | 0 | |
| Shoulder Press | 2 | 40 | 10 | 50 | 10 | 60 | 10 | 0 | |
| Lat Pulldown | 2 | 40 | 10 | 50 | 10 | 60 | 12 | 0 | |
| Double-Arm Tricep Kickback | 2 | 40 | 10 | 50 | 10 | 60 | 10 | 0 | |
| Standing Face Pull | 2 | 50 | 10 | 60 | 10 | 70 | 10 | 0 | |
| Lateral Raise | 2 | 20 | 10 | 20 | 10 | 20 | 10 | 0 | |

**Tab-separated seed block (for direct paste):**
```
exercise	day	w1	s1	w2	s2	w3	s3	partials	last_date
Bench Press	1	50	12	60	12	70	12	0	
Seated Row	1	50	12	60	12	70	12	0	
Standing Chest Fly	1	40	12	50	12	60	12	0	
Hammer Curl	1	30	10	30	10	30	10	0	
Shoulder Shrug	1	70	12	70	12	70	12	0	
Regular Bicep Curl	1	50	12	50	12	50	12	0	
Shoulder Press	2	40	10	50	10	60	10	0	
Lat Pulldown	2	40	10	50	10	60	12	0	
Double-Arm Tricep Kickback	2	40	10	50	10	60	10	0	
Standing Face Pull	2	50	10	60	10	70	10	0	
Lateral Raise	2	20	10	20	10	20	10	0	
```

---

## Tab 2: `Log` (append-only history, never edited)

**Row 1 headers (exact, in order):**
```
date	exercise	day	w1	s1	w2	s2	w3	s3	partials	hit_target
```

No seed rows — populated by the GPT via `append` after each session.

`hit_target` = `"yes"` if any set gained a rep vs the prior `Current` row, else `"no"`.

---

## Column semantics

| Column | Meaning |
|---|---|
| `exercise` | Exact name; the `keyColumn` for updates. Must match between GPT and sheet. |
| `day` | Workout day grouping (1 or 2). Lets the GPT return a full day's plan. |
| `w1/w2/w3` | Weight (lb total) for sets 1/2/3. |
| `s1/s2/s3` | **Full** reps completed for sets 1/2/3 (partials excluded). |
| `partials` | Optional last-set partial reps. Recorded, never used in progression math. |
| `last_date` | `YYYY-MM-DD` of the most recent logged session. |
| `hit_target` | (`Log` only) did this session beat the previous? `yes`/`no`. |

---

## Notes

- Keep exercise names **identical** across both tabs and in anything the GPT says back.
  The update path matches on the exact `exercise` string.
- If you add an exercise later: add a row to `Current` with starting weights/reps and a
  `day`. No code change needed — the backend is schema-agnostic.
- Weights can be decimals (e.g. `52.5`). The sheet stores them fine; the GPT computes
  them.
