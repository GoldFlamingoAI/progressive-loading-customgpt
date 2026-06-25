# Progressive Loading Custom GPT

Personal Custom GPT workout tracker for progressive overload training.

## What this repo contains

- `docs/` — source documentation and architecture specs.
- `apps-script/` — Google Apps Script files to paste into the spreadsheet-bound Apps Script project.
- `custom-gpt/` — Custom GPT Action schema and system prompt artifacts.

## Build/deploy order

1. Create the Google Sheet using `docs/SHEET_SETUP.md`.
2. Paste `apps-script/SheetsAPI.gs`, `apps-script/KeepWarm.gs`, and `apps-script/Tests.gs` into the bound Apps Script project.
3. Set the `GPT_SECRET` Script Property.
4. Run `testAll()` in Apps Script.
5. Deploy the Apps Script Web App.
6. Replace placeholders in `custom-gpt/openapi.json` and `custom-gpt/system_prompt.txt`.
7. Paste the OpenAPI schema and system prompt into the Custom GPT builder.

## Start here

Read `docs/ARCHITECTURE.md` first. It explains the full system, data model, API contract, and acceptance criteria.
