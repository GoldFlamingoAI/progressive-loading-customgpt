# PROGRESSION_RULES.md — Overload Playbook (Source of Truth)

> This is the authoritative progression logic. It is embedded **verbatim** into the
> GPT system prompt (see [GPT_INSTRUCTIONS.md](./GPT_INSTRUCTIONS.md)). No code reads
> this — the GPT performs all math. If the rules change, change them here first, then
> re-emit the system prompt.

---

## Core rules

1. **Benchmark consistency.** Same exercise, same setup, same order in the workout.
2. **Rep range: 8–15.** Three working sets. Stop each set with **0–2 reps in reserve**.
3. **Each set has its own weight** (`w1`, `w2`, `w3`) — pyramid or straight. Weights are
   independent per set.
4. **Goal each workout:** add **1 full rep to at least one set** vs last session.
5. **Fill sets in order:** push `s1` to 15 first, then `s2`, then `s3`.

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

## Partials (optional)

- Last set only. After full reps, user may add **2–5 partial / micro reps**.
- **Do NOT count partials toward progression.** Track **full reps only** for all
  rep-target math.
- Record partials in the `partials` column for the record, then ignore them when
  computing the next target.

---

## Deterministic "next target" algorithm (GPT applies this)

Given last session `s1,s2,s3` (full reps) and `w1,w2,w3`:

```
if s1 < 15:                      t1 = s1 + 1; t2 = s2;     t3 = s3
elif s2 < 15:                    t1 = 15;     t2 = s2 + 1; t3 = s3
elif s3 < 15:                    t1 = 15;     t2 = 15;     t3 = s3 + 1
else:  # 15/15/15 -> deload to new weight
    w1 += 2.5; w2 += 2.5; w3 += 2.5
    t1 = t2 = t3 = 9            # ~8–10, coach to 8–10 range
```

Weights only change in the 15/15/15 branch. Targets are **full reps**; partials never
enter this calculation.

---

## Worked example (Bench Press, start 50/60/70 @ 12/12/12)

| Session | Reps (full) | Weights | Next target |
|---|---|---|---|
| 1 | 12/12/12 | 50/60/70 | 13/12/12 |
| 2 | 13/12/12 | 50/60/70 | 13/13/12 |
| 3 | 13/13/12 | 50/60/70 | 13/13/13 |
| … | … | … | … |
| k | 15/15/15 | 50/60/70 | **9/9/9 @ 52.5/62.5/72.5** |
| k+1 | 9/9/9 | 52.5/62.5/72.5 | 10/9/9 |
