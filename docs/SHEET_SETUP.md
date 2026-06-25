# SHEET_SETUP.md — Spreadsheet Layout & Seed Data

> One Google Spreadsheet with a **single tab named `Log`** — an append-only workout
> history. Each session is a block of rows (one row per exercise). An exercise's most
> recent row is its current state; there is no separate "current" tab.
>
> The Apps Script project must be **bound** to this spreadsheet (Extensions → Apps
> Script from within the sheet) so `getActiveSpreadsheet()` resolves. This is a manual
> human paste step — the docs emit headers/rows as text; they do not create the sheet.

---

## Tab: `Log` (append-only — never overwrite past rows)

**Row 1 headers (exact, in order):**
```
Date	Workout	Order	Exercise	Set 1	Set 2	Set 3
```

Each `Set` cell combines weight and reps in one string: **`<weight> lb x <reps>`**
(e.g. `50 lb x 12`). Weights may be decimals (`52.5 lb x 9`). Reps are **full** reps.

**Seed block — one baseline session per routine (paste starting row 2).** These are
just starting numbers; the GPT appends every session after this. Replace the date with
your real first-session date.

| Date | Workout | Order | Exercise | Set 1 | Set 2 | Set 3 |
|---|---|---|---|---|---|---|
| 2026-06-14 | Workout A | 1 | Bench Press | 50 lb x 12 | 60 lb x 12 | 70 lb x 12 |
| 2026-06-14 | Workout A | 2 | Seated Row | 50 lb x 12 | 60 lb x 12 | 70 lb x 12 |
| 2026-06-14 | Workout A | 3 | Standing Chest Fly | 40 lb x 12 | 50 lb x 12 | 60 lb x 12 |
| 2026-06-14 | Workout A | 4 | Hammer Curl | 30 lb x 10 | 30 lb x 10 | 30 lb x 10 |
| 2026-06-14 | Workout A | 5 | Shoulder Shrug | 70 lb x 12 | 70 lb x 12 | 70 lb x 12 |
| 2026-06-14 | Workout A | 6 | Regular Bicep Curl | 50 lb x 12 | 50 lb x 12 | 50 lb x 12 |
| 2026-06-16 | Workout B | 1 | Shoulder Press | 40 lb x 10 | 50 lb x 10 | 60 lb x 10 |
| 2026-06-16 | Workout B | 2 | Lat Pulldown | 40 lb x 10 | 50 lb x 10 | 60 lb x 12 |
| 2026-06-16 | Workout B | 3 | Double-Arm Tricep Kickback | 40 lb x 10 | 50 lb x 10 | 60 lb x 10 |
| 2026-06-16 | Workout B | 4 | Standing Face Pull | 50 lb x 10 | 60 lb x 10 | 70 lb x 10 |
| 2026-06-16 | Workout B | 5 | Lateral Raise | 20 lb x 10 | 20 lb x 10 | 20 lb x 10 |

**Tab-separated seed block (for direct paste into `A1`):**
```
Date	Workout	Order	Exercise	Set 1	Set 2	Set 3
2026-06-14	Workout A	1	Bench Press	50 lb x 12	60 lb x 12	70 lb x 12
2026-06-14	Workout A	2	Seated Row	50 lb x 12	60 lb x 12	70 lb x 12
2026-06-14	Workout A	3	Standing Chest Fly	40 lb x 12	50 lb x 12	60 lb x 12
2026-06-14	Workout A	4	Hammer Curl	30 lb x 10	30 lb x 10	30 lb x 10
2026-06-14	Workout A	5	Shoulder Shrug	70 lb x 12	70 lb x 12	70 lb x 12
2026-06-14	Workout A	6	Regular Bicep Curl	50 lb x 12	50 lb x 12	50 lb x 12
2026-06-16	Workout B	1	Shoulder Press	40 lb x 10	50 lb x 10	60 lb x 10
2026-06-16	Workout B	2	Lat Pulldown	40 lb x 10	50 lb x 10	60 lb x 12
2026-06-16	Workout B	3	Double-Arm Tricep Kickback	40 lb x 10	50 lb x 10	60 lb x 10
2026-06-16	Workout B	4	Standing Face Pull	50 lb x 10	60 lb x 10	70 lb x 10
2026-06-16	Workout B	5	Lateral Raise	20 lb x 10	20 lb x 10	20 lb x 10
```

> Already have data in this layout? You don't need the seed — just make sure your tab
> is named exactly `Log` and the header row matches above.

---

## Column semantics

| Column | Meaning |
|---|---|
| `Date` | Session date. The GPT writes `YYYY-MM-DD`; the sheet may display it in its own date format (e.g. `6/14/26`). |
| `Workout` | Routine label, e.g. `Workout A` / `Workout B`. Keep labels consistent so the GPT can return a whole workout. |
| `Order` | The exercise's position within that workout (1, 2, 3, …). |
| `Exercise` | Exact name. The GPT matches an exercise across sessions by this string. |
| `Set 1` / `Set 2` / `Set 3` | `"<weight> lb x <reps>"` for sets 1/2/3. Three independent weights; reps are **full** reps. |

---

## Notes

- **Append-only.** Every session is new rows. Never overwrite past rows — the history
  is the whole point. To fix a mistake, edit the sheet by hand.
- **Keep names identical.** Use the exact same `Exercise` and `Workout` strings every
  time. The GPT finds an exercise's latest row by matching the name.
- **Consistent set format.** The GPT always writes `"<weight> lb x <reps>"`. It can
  read older variants like `40 x 10`, but keeping one format avoids confusion.
- **Partials are not tracked** in this layout. If you want them later, add a column or
  note them in the `Set 3` cell — and tell the assistant so it ignores them in the math.
- **New exercise?** Just log it with a `Workout` label and `Order`; no code change —
  the backend is schema-agnostic.
