# PROGRESSION_RULES.md — Overload Playbook (Source of Truth)

> This is the authoritative progression logic. It is embedded **verbatim** into the
> GPT system prompt (see [GPT_INSTRUCTIONS.md](./GPT_INSTRUCTIONS.md)). No code reads
> this — the GPT performs all math. If the rules change, change them here first, then
> re-emit the system prompt.

---

## Data shape (what the GPT parses)

Each session row has three set cells — `Set 1`, `Set 2`, `Set 3` — and each cell is a
string `"<weight> lb x <reps>"` (e.g. `50 lb x 12`). The GPT parses each into a weight
`w` and full-rep count `r`. There are three independent working sets, each with its own
weight (pyramid or straight).

## Core rules

1. **Benchmark consistency.** Same exercise, same setup, same order in the workout.
2. **Rep range: 8–15.** Three working sets. Stop each set with **0–2 reps in reserve**.
3. **Each set has its own weight** — pyramid or straight. Weights are independent per set.
4. **Goal each workout:** add **1 full rep to at least one set** vs last session.
5. **Fill sets in order:** push Set 1 reps to 15 first, then Set 2, then Set 3.

   ```
   Session 1: 12 / 12 / 12
   Session 2: 13 / 12 / 12
   Session 3: 13 / 13 / 12
   Session 4: 13 / 13 / 13
   ...continue until 15 / 15 / 15
   ```

6. **When all three sets reach 15 reps (15/15/15):**
   - **Increase resistance:** add **1.25 lb per handle = +2.5 lb total to every set's
     weight** (or the next band increment). This preserves the pyramid gaps.
   - **Reset reps:** new target ~**8–10 reps** on every set.
   ```
   15/15/15 @ 50/60/70 lb
        ↓ add weight
   ~9/9/9 @ 52.5/62.5/72.5 lb
   ```

7. **Repeat forever:** build back to 15/15/15 → add weight → reset to 8–10.

## Partials

- Partials are **not tracked** in this layout. Coach to 0–2 reps in reserve on full reps
  and progress on full reps only.

---

## Deterministic "next target" algorithm (GPT applies this)

Parse the latest row's set cells into reps `r1,r2,r3` and weights `w1,w2,w3`:

```
if r1 < 15:                      t1 = r1 + 1; t2 = r2;     t3 = r3      # weights unchanged
elif r2 < 15:                    t1 = 15;     t2 = r2 + 1; t3 = r3      # weights unchanged
elif r3 < 15:                    t1 = 15;     t2 = 15;     t3 = r3 + 1  # weights unchanged
else:  # 15/15/15 -> deload to new weight
    w1 += 2.5; w2 += 2.5; w3 += 2.5
    t1 = t2 = t3 = 9            # ~8–10, coach to 8–10 range
```

Weights only change in the 15/15/15 branch. Targets are **full reps**.

---

## Worked example (Bench Press, start 50/60/70 lb @ 12/12/12)

| Session | Set cells (latest row) | Next target |
|---|---|---|
| 1 | `50 lb x 12` / `60 lb x 12` / `70 lb x 12` | 13/12/12 |
| 2 | `50 lb x 13` / `60 lb x 12` / `70 lb x 12` | 13/13/12 |
| 3 | `50 lb x 13` / `60 lb x 13` / `70 lb x 12` | 13/13/13 |
| … | … | … |
| k | `50 lb x 15` / `60 lb x 15` / `70 lb x 15` | **9/9/9 @ 52.5/62.5/72.5 lb** |
| k+1 | `52.5 lb x 9` / `62.5 lb x 9` / `72.5 lb x 9` | 10/9/9 |
