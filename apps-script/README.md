# Apps Script Files — Copy These Separately

Copy each `.gs` file into Google Apps Script as its own separate script file.
Do **not** paste all of the GAS code into one file.

## Copy order

1. `SheetsAPI.gs`
   - Main Web App API.
   - Contains `doGet(e)` and `doPost(e)`.
   - Handles reads, appends, updates, JSON responses, and token checks.

2. `KeepWarm.gs`
   - Optional keep-warm trigger function.
   - Contains `keepWarm()`.
   - Use this only when setting up the time-driven trigger.

3. `Tests.gs`
   - Manual Apps Script test harness.
   - Contains `testAll()`.
   - Run this inside the Apps Script editor after setting `GPT_SECRET`.

## Apps Script file names

When creating files in Apps Script, name them exactly:

```text
SheetsAPI
KeepWarm
Tests
```

Apps Script will display them as:

```text
SheetsAPI.gs
KeepWarm.gs
Tests.gs
```

## Important

The repo keeps these as separate files already:

```text
apps-script/SheetsAPI.gs
apps-script/KeepWarm.gs
apps-script/Tests.gs
```

That is the intended copy/paste structure.
