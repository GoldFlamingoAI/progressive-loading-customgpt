# Manual Deployment Guide — Personal Custom GPT Workout Tracker

This guide assumes you have never set up Google Sheets, Google Apps Script, or a Custom GPT Action before.

By the end, you will have a private Custom GPT that can:

1. Read your workout state from Google Sheets.
2. Tell you what to do next.
3. Log completed workouts back to the sheet.

Official links you may need:

- [Google Sheets](https://docs.google.com/spreadsheets/)
- [Create a new Google Sheet](https://docs.google.com/spreadsheets/create)
- [Google Apps Script](https://script.google.com/home)
- [Apps Script Web Apps guide](https://developers.google.com/apps-script/guides/web)
- [Apps Script deployments guide](https://developers.google.com/apps-script/concepts/deployments)
- [ChatGPT](https://chatgpt.com/)
- [OpenAI GPTs help article](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts)
- [GPT Actions documentation](https://developers.openai.com/api/docs/actions/introduction)

---

## Phase 0 — Understand the files in this repo

Before deploying anything, know what each folder is for.

```text
README.md
apps-script/
  README.md
  SheetsAPI.gs
  KeepWarm.gs
  Tests.gs
custom-gpt/
  openapi.json
  system_prompt.txt
docs/
  ARCHITECTURE.md
  GAS_BACKEND.md
  GPT_INSTRUCTIONS.md
  OPENAPI_SCHEMA.md
  PROGRESSION_RULES.md
  SHEET_SETUP.md
```

Use these files as follows:

| File | What you do with it |
|---|---|
| `README.md` | Quick repo overview. |
| `MANUAL_PHASES.md` | This one complete manual setup guide. |
| `docs/SHEET_SETUP.md` | Copy headers and starter rows into Google Sheets. |
| `apps-script/SheetsAPI.gs` | Paste into Google Apps Script. |
| `apps-script/KeepWarm.gs` | Paste into Google Apps Script. |
| `apps-script/Tests.gs` | Paste into Google Apps Script and run manually. |
| `apps-script/README.md` | File-by-file GAS copy checklist. |
| `custom-gpt/openapi.json` | Paste into the Custom GPT Action schema after replacing the deployment ID. |
| `custom-gpt/system_prompt.txt` | Paste into the Custom GPT Instructions after replacing the secret. |

---

## Phase 1 — Create the Google Sheet

### 1.1 Open Google Sheets

1. Go to [Google Sheets](https://docs.google.com/spreadsheets/).
2. Sign in with the Google account you want to use for this project.
3. Create a blank spreadsheet.
   - Direct link: [Create a new Google Sheet](https://docs.google.com/spreadsheets/create)

### 1.2 Rename the spreadsheet

1. Click the spreadsheet title in the top-left corner.
2. Rename it to:

```text
Workout Logs Spreadsheet
```

The exact spreadsheet name is not critical, but this guide uses that name.

### 1.3 Name the tab `Log`

This project uses a **single tab** named `Log` — an append-only history where each
session is a block of rows (one row per exercise).

1. Look at the bottom-left of the spreadsheet.
2. You should see a tab, probably named `Sheet1`.
3. Click the small arrow on that tab.
4. Click **Rename**.
5. Rename it exactly:

```text
Log
```

Capitalization matters because the Custom GPT and Apps Script look for this exact tab
name. (If you already have a workout sheet, just rename its tab to `Log`.)

### 1.4 Paste the headers and starter rows

1. Open `docs/SHEET_SETUP.md` in this repo.
2. Find the section named **Tab-separated seed block (for direct paste)**.
3. Copy the entire block, including the header row.
4. Go back to Google Sheets.
5. Click cell `A1` in the `Log` tab.
6. Paste the copied block.

When done, row 1 should contain these headers:

```text
Date | Workout | Order | Exercise | Set 1 | Set 2 | Set 3
```

Each `Set` cell holds weight and reps together, like `50 lb x 12`.

> Already have your own data in this layout? Skip the seed rows — just make sure the tab
> is named exactly `Log` and row 1 matches the headers above. The seed rows are only a
> starting point if you're beginning from scratch.

---

## Phase 2 — Open the bound Apps Script project

The Apps Script project must be bound to the spreadsheet so it can access the active spreadsheet.

1. In the Google Sheet, click **Extensions** in the top menu.
2. Click **Apps Script**.
3. A new browser tab should open at [Google Apps Script](https://script.google.com/home).
4. If prompted, name the Apps Script project:

```text
Workout Tracker API
```

If you opened Apps Script from inside the sheet, it should already be connected to that spreadsheet.

---

## Phase 3 — Add the Apps Script code files

You will create three separate script files in Apps Script. Do not paste all GAS code into one document or one script file:

1. `SheetsAPI.gs`
2. `KeepWarm.gs`
3. `Tests.gs`

The repo also includes `apps-script/README.md` as a quick file-by-file copy checklist.

### 3.1 Add `SheetsAPI.gs`

1. In Apps Script, look for the file list on the left.
2. You may see a default file named `Code.gs`.
3. You can either delete `Code.gs` or leave it empty.
4. Click the **+** next to **Files**.
5. Choose **Script**.
6. Name the file exactly:

```text
SheetsAPI
```

Apps Script will display it as `SheetsAPI.gs`.

7. Open `apps-script/SheetsAPI.gs` in this repo.
8. Copy the entire file.
9. Paste it into the Apps Script `SheetsAPI.gs` file.
10. Click the save icon or press `Ctrl+S` / `Cmd+S`.

### 3.2 Add `KeepWarm.gs`

1. Click the **+** next to **Files**.
2. Choose **Script**.
3. Name it exactly:

```text
KeepWarm
```

4. Open `apps-script/KeepWarm.gs` in this repo.
5. Copy the entire file.
6. Paste it into Apps Script.
7. Save.

### 3.3 Add `Tests.gs`

1. Click the **+** next to **Files**.
2. Choose **Script**.
3. Name it exactly:

```text
Tests
```

4. Open `apps-script/Tests.gs` in this repo.
5. Copy the entire file.
6. Paste it into Apps Script.
7. Save.

---

## Phase 4 — Create your private secret token

The Custom GPT and Apps Script need to share a secret token.

### 4.1 Create a secret value

Create a long random secret. Example format:

```text
pb-CHANGE-ME-9xK4s7Q2mTz
```

Do not use that example. Make your own.

A good personal secret should be:

- Unique to this project.
- Hard to guess.
- Not reused from another account.
- Not shared with anyone.

You will use this same value in two places:

1. Apps Script Script Properties as `GPT_SECRET`.
2. `custom-gpt/system_prompt.txt` in place of `{{GPT_SECRET}}`.

### 4.2 Add the secret to Apps Script

1. In Apps Script, click **Project Settings** in the left sidebar.
   - It usually looks like a gear icon.
2. Scroll to **Script Properties**.
3. Click **Add script property**.
4. In **Property**, enter exactly:

```text
GPT_SECRET
```

5. In **Value**, paste your secret token.
6. Click **Save script properties**.

---

## Phase 5 — Run the Apps Script tests

Run the included test harness before deploying.

### 5.1 Select the test function

1. In Apps Script, look near the top toolbar.
2. Find the function dropdown.
3. Select:

```text
testAll
```

### 5.2 Run the test

1. Click **Run**.
2. Google will likely ask you to authorize the script.
3. Click through the authorization flow.
4. If Google shows a warning that the app is not verified, choose the advanced/details option and continue.
   - This is expected for your own private script.
5. After the run finishes, open **Executions** or **Logs** in Apps Script.

### 5.3 Confirm expected test behavior

The test should complete without throwing an error.

Expected tested behaviors include:

- Valid token passes.
- Bad token fails.
- Missing `sheetName` returns an error.
- Unknown sheet returns an error.
- Malformed JSON returns an error.
- Append adds a row to a scratch test tab.
- Update modifies the matched scratch row.

If the test fails, fix that before continuing.

Common causes:

| Problem | What to check |
|---|---|
| `valid token passes` fails | Confirm `GPT_SECRET` exists in Script Properties. |
| Sheet access fails | Confirm Apps Script was opened from the Google Sheet via **Extensions → Apps Script**. |
| Authorization fails | Confirm you are signed into the Google account that owns the sheet. |
| Syntax error | Re-copy the exact files from `apps-script/`. |

---

## Phase 6 — Deploy Apps Script as a Web App

Use the official Apps Script Web Apps guide if you want reference screenshots: [Apps Script Web Apps guide](https://developers.google.com/apps-script/guides/web).

### 6.1 Start a new deployment

1. In Apps Script, click **Deploy** in the top-right.
2. Click **New deployment**.
3. Click the gear icon or deployment type selector.
4. Choose **Web app**.

### 6.2 Configure the deployment

Fill in the deployment settings:

| Field | Value |
|---|---|
| Description | `Workout Tracker API` |
| Execute as | `Me` |
| Who has access | `Anyone` |

Important:

- **Execute as: Me** means the script can access your spreadsheet as you.
- **Who has access: Anyone** is needed so the Custom GPT Action can call the URL.
- The secret token still protects the endpoint.

### 6.3 Deploy

1. Click **Deploy**.
2. Approve any authorization prompts.
3. Copy the Web App URL.

The URL will look similar to this:

```text
https://script.google.com/macros/s/AKfycbXXXXXXXXXXXXXXXXXXXXXXXX/exec
```

### 6.4 Save the deployment ID

From the URL, copy only the deployment ID between `/s/` and `/exec`.

Example:

```text
https://script.google.com/macros/s/AKfycbXXXXXXXXXXXXXXXXXXXXXXXX/exec
```

Deployment ID:

```text
AKfycbXXXXXXXXXXXXXXXXXXXXXXXX
```

You will use this to replace `{{WEBAPP_DEPLOYMENT_ID}}` in `custom-gpt/openapi.json`.

---

## Phase 7 — Test the deployed Web App URL manually

Before creating the Custom GPT, confirm the Web App responds.

### 7.1 Test a valid read

Create a URL in this format:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?sheetName=Log&token=YOUR_SECRET
```

Replace:

- `YOUR_DEPLOYMENT_ID` with your Apps Script deployment ID.
- `YOUR_SECRET` with your `GPT_SECRET` value.

Paste the URL into your browser.

Expected result:

- You should see JSON text.
- It should contain your workout rows from the `Log` tab.

### 7.2 Test an invalid token

Now change the token to something wrong:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?sheetName=Log&token=wrong
```

Expected result:

```json
{"error":"Forbidden: invalid token"}
```

Do not continue until the valid token works and the invalid token fails.

---

## Phase 8 — Prepare the Custom GPT files

You need to replace placeholders in two files before pasting them into the GPT builder.

### 8.1 Prepare `custom-gpt/openapi.json`

1. Open `custom-gpt/openapi.json`.
2. Find:

```text
{{WEBAPP_DEPLOYMENT_ID}}
```

3. Replace it with your Apps Script deployment ID.
4. Do not include `/exec` in the server URL replacement.

Before:

```json
"url": "https://script.google.com/macros/s/{{WEBAPP_DEPLOYMENT_ID}}"
```

After example:

```json
"url": "https://script.google.com/macros/s/AKfycbXXXXXXXXXXXXXXXXXXXXXXXX"
```

### 8.2 Prepare `custom-gpt/system_prompt.txt`

1. Open `custom-gpt/system_prompt.txt`.
2. Find:

```text
{{GPT_SECRET}}
```

3. Replace every occurrence with your actual secret.
4. Save the edited text somewhere private.

Important: do not commit your real secret back to GitHub.

---

## Phase 9 — Create the Custom GPT

Use the OpenAI help article if you want the official reference: [Creating and editing GPTs](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts).

### 9.1 Open the GPT builder

1. Go to [ChatGPT](https://chatgpt.com/).
2. Sign in.
3. Open the GPT creation area.
   - The UI may say **Create a GPT**, **GPTs**, **Explore GPTs**, or similar.
4. Create a new GPT.

### 9.2 Name the GPT

Suggested name:

```text
Workout Tracker Coach
```

### 9.3 Add the instructions

1. Find the GPT configuration field named **Instructions**.
2. Open your prepared `custom-gpt/system_prompt.txt`.
3. Confirm `{{GPT_SECRET}}` has been replaced with your real secret.
4. Copy the full text.
5. Paste it into **Instructions**.

### 9.4 Configure capabilities

Turn on what you want for personal use.

Recommended:

| Capability | Recommendation |
|---|---|
| Web browsing | Off unless you want it. |
| Image generation | Off. |
| Code interpreter / data analysis | Off unless you want workout analysis uploads later. |
| Actions | On / configured in the next phase. |

The critical feature is **Actions**.

---

## Phase 10 — Add the Custom GPT Action

GPT Actions let the Custom GPT call your Apps Script Web App. Official reference: [GPT Actions documentation](https://developers.openai.com/api/docs/actions/introduction).

### 10.1 Create a new Action

1. In the GPT builder, find **Actions**.
2. Click **Create new action** or **Add action**.

### 10.2 Authentication setting

Set authentication to:

```text
None
```

Do not choose API key header authentication.

Reason: this project sends the token as a query parameter for GET requests and inside the JSON body for POST requests.

### 10.3 Paste the OpenAPI schema

1. Open your prepared `custom-gpt/openapi.json`.
2. Confirm `{{WEBAPP_DEPLOYMENT_ID}}` has been replaced.
3. Copy the full JSON.
4. Paste it into the Action schema field.
5. Save or validate the schema.

You should see two operations:

```text
readSheet
writeSheet
```

### 10.4 Add a privacy policy URL if required

The GPT builder may require a privacy policy URL before saving.

For a private personal GPT, you can use a simple page or gist that says something like:

```text
This private GPT stores my personal workout logs in my own Google Sheet. It is not intended for public use.
```

Options:

- A private/personal GitHub page.
- A GitHub Gist.
- Any simple webpage you control.

---

## Phase 11 — Test the Action inside the GPT builder

### 11.1 Test `readSheet`

1. In the Action test area, choose `readSheet`.
2. Use:

```json
{
  "sheetName": "Log",
  "token": "YOUR_SECRET"
}
```

3. Run the test.

Expected result:

- It returns rows from the `Log` tab.
- It does not return an auth error.

### 11.2 Test `writeSheet` append carefully

This test writes a harmless row to your `Log` tab.

```json
{
  "token": "YOUR_SECRET",
  "sheetName": "Log",
  "action": "append",
  "rowData": ["2026-01-01", "TEST", 0, "TEST", "0 lb x 0", "0 lb x 0", "0 lb x 0"]
}
```

Expected result:

```json
{
  "status": "ok",
  "action": "appended"
}
```

Then go to the `Log` tab in Google Sheets and delete the test row.

---

## Phase 12 — Test the Custom GPT conversationally

After the Action test works, test normal user flows.

### 12.1 Test a coaching request

Ask:

```text
What's my Workout A today?
```

Expected behavior:

- The GPT calls `readSheet`.
- It lists that workout's exercises.
- It gives set-by-set targets.

### 12.2 Test a single exercise request

Ask:

```text
What should I do for Bench Press today?
```

Expected behavior:

- The GPT reads `Log`.
- It finds the most recent `Bench Press` row.
- It gives three set targets.

### 12.3 Test a real log entry

Only do this when you are ready to write a real workout entry.

Example:

```text
I just did Bench Press: 50x13, 60x12, 70x12.
```

Expected behavior:

- The GPT appends a new `Bench Press` row to `Log` (set cells like `50 lb x 13`).
- The GPT tells you the next target.

### 12.4 Confirm the sheet changed

After logging, open the Google Sheet and check:

1. A new row exists in `Log` for the completed exercise, dated today.
2. Its set cells read like `50 lb x 13`, `60 lb x 12`, `70 lb x 12`.

---

## Phase 13 — Set up the keep-warm trigger

This is optional but recommended to reduce Apps Script cold starts.

### 13.1 Open triggers

1. In Apps Script, click **Triggers** in the left sidebar.
   - It usually looks like a clock icon.
2. Click **Add Trigger**.

### 13.2 Configure the trigger

Use these settings:

| Field | Value |
|---|---|
| Choose which function to run | `keepWarm` |
| Choose which deployment should run | `Head` |
| Select event source | `Time-driven` |
| Select type of time based trigger | `Minutes timer` |
| Select minute interval | `Every 10 minutes` |

3. Save the trigger.
4. Approve any authorization prompt.

---

## Phase 14 — Daily use

### Ask what to do

Examples:

```text
What's my Workout A today?
```

```text
What should I do for Shoulder Press today?
```

### Log a workout

Examples:

```text
I just did Bench Press: 50x13, 60x12, 70x12.
```

```text
I did Lat Pulldown: same weights, 11, 10, 12.
```

### Check progress

Example:

```text
Am I making progress on Seated Row?
```

---

## Phase 15 — Safety and maintenance

### Keep the GPT private

This project is designed for personal use. Do not publish or share the GPT unless you understand that the secret is in the GPT instructions.

### Rotate the secret if needed

If you think the secret leaked:

1. Create a new secret.
2. Update `GPT_SECRET` in Apps Script Script Properties.
3. Update the secret in the Custom GPT instructions.
4. Save the GPT.
5. Test `readSheet` again.

### Do not commit real secrets

Never commit your real `GPT_SECRET` to GitHub.

The repo files should keep placeholders like:

```text
{{GPT_SECRET}}
{{WEBAPP_DEPLOYMENT_ID}}
```

### If the GPT logs the wrong thing

1. Open the Google Sheet (the `Log` tab).
2. Fix or delete the incorrect row by hand. The most recent row for an exercise is what
   the GPT treats as current, so correcting that row is enough.
3. Ask the GPT for the exercise again to confirm the next target.

---

## Phase 16 — Troubleshooting

### Problem: `Forbidden: invalid token`

Check:

1. Did you set `GPT_SECRET` in Apps Script Script Properties?
2. Did you paste the same secret into the GPT instructions?
3. Did you accidentally include spaces before or after the secret?
4. Did you redeploy after changing Apps Script code?

### Problem: `Sheet not found: Log`

Check:

1. The tab is named exactly `Log`.
2. There is no extra space in the tab name.
3. Apps Script is bound to the correct spreadsheet.

### Problem: The GPT says the Action failed

Check:

1. The Web App URL still works in your browser.
2. The Action schema contains the correct deployment ID.
3. The Action auth setting is `None`.
4. The GPT instructions contain the correct secret.

### Problem: Apps Script asks for authorization again

That can happen after script changes. Approve it again if you are using your own Google account and your own spreadsheet.

### Problem: Changes to Apps Script do not appear in the deployed GPT

You may need to redeploy Apps Script:

1. Open Apps Script.
2. Click **Deploy**.
3. Click **Manage deployments**.
4. Edit the existing deployment or create a new one.
5. If the deployment ID changes, update `custom-gpt/openapi.json` and the Custom GPT Action schema.

---

## Final deployment checklist

Do not consider setup complete until every box is checked.

- [ ] Google Sheet exists.
- [ ] The tab is named exactly `Log`.
- [ ] `Log` headers are pasted (and starter rows, if beginning from scratch).
- [ ] Apps Script project was opened from the spreadsheet.
- [ ] `SheetsAPI.gs` was pasted into Apps Script.
- [ ] `KeepWarm.gs` was pasted into Apps Script.
- [ ] `Tests.gs` was pasted into Apps Script.
- [ ] `GPT_SECRET` Script Property was created.
- [ ] `testAll()` passed in Apps Script.
- [ ] Apps Script Web App was deployed.
- [ ] Browser test with valid token returned `Log` rows.
- [ ] Browser test with invalid token returned `Forbidden: invalid token`.
- [ ] `{{WEBAPP_DEPLOYMENT_ID}}` was replaced in the OpenAPI schema before pasting into GPT Actions.
- [ ] `{{GPT_SECRET}}` was replaced in the GPT instructions before pasting into the GPT builder.
- [ ] Custom GPT Action auth is set to `None`.
- [ ] Custom GPT Action shows `readSheet` and `writeSheet`.
- [ ] `readSheet` Action test returns rows.
- [ ] A conversational "What's my Workout A?" test returns workout targets.
- [ ] A real workout log appends a new row to `Log`.
- [ ] Keep-warm trigger is configured, if desired.
