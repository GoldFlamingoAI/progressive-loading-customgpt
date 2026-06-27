# GAS_BACKEND.md — Apps Script Web App Spec

> Implements the API contract in [ARCHITECTURE.md](./ARCHITECTURE.md) §6.
> The backend is a **generic** sheet read/write bridge. It must contain **zero**
> workout knowledge. Two files: `SheetsAPI.gs`, `KeepWarm.gs`.

---

## 1. Responsibilities

- Authenticate every request against a shared secret in Script Properties.
- `doGet`: return a named tab as an array of row-objects keyed by the header row.
- `doPost`: `prepend` a workout to the top (newest-first, with a blank separator row;
  rowData may be one row or a batch), `append` a row to the bottom, or `update` a row
  (match key column, set named fields). Writes are serialized with `LockService` and
  update rewrites the matched row in a single `setValues` call (other columns preserved).
- `Archive.gs` (separate, trigger-driven): keep only the newest N workout dates in `Log`,
  move older rows to an `Archive` tab so reads stay fast.
- Normalize Date cells to `yyyy-MM-dd` strings on read, so the GPT never receives ISO
  timestamps for the `Date` column.
- Always respond with `ContentService` JSON. Never throw to an HTML error page.

## 2. Non-Responsibilities

- No rep math, no weight increments, no "next target" logic. That is the GPT's job.
- No schema assumptions beyond "row 1 is the header row."

---

## 3. Script Properties (required)

| Key | Value | Set where |
|---|---|---|
| `GPT_SECRET` | strong random string, e.g. `pb-7Kq2x9m4Tz` | Project Settings → Script Properties |

The code reads it once via `PropertiesService.getScriptProperties()`.

---

## 4. `SheetsAPI.gs` — full implementation

> Codex: produce this file verbatim in structure. Keep helper names with the
> leading underscore convention. Do not add libraries.

```javascript
// SheetsAPI.gs
// Generic Google Sheets read/write bridge for the Workout Tracker Custom GPT.
// Deploy: Web App, "Execute as: Me", "Who has access: Anyone".
// Auth: shared secret in Script Property GPT_SECRET. Token travels in the query
// string (GET) and JSON body (POST) — NOT in headers (GAS can't read them reliably).

const PROPS = PropertiesService.getScriptProperties();

/** READ: GET {url}?token=...&sheetName=... -> array of row objects keyed by headers. */
function doGet(e) {
  if (!_authCheck(e && e.parameter && e.parameter.token)) return _forbidden();

  const sheetName = e.parameter.sheetName;
  if (!sheetName) return _error('sheetName parameter is required');

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return _error('Sheet not found: ' + sheetName);

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return _json([]);   // header only or empty -> no rows

    const tz = ss.getSpreadsheetTimeZone();
    const headers = data[0];
    const rows = data.slice(1)
      .filter(row => row.some(cell => cell !== '' && cell !== null))  // skip blank rows
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = _cellValue(row[i], tz); });
        return obj;
      });

    return _json(rows);
  } catch (err) {
    return _error(err.message);
  }
}

/** WRITE: POST JSON body. action = "prepend" | "append" | "update". */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return _error('Invalid JSON body');
  }

  if (!_authCheck(body.token)) return _forbidden();

  const sheetName = body.sheetName;
  const action = body.action || 'append';
  if (!sheetName) return _error('sheetName is required');

  // Serialize writes so a near-simultaneous update + append (e.g. logging from two
  // devices) can never interleave and corrupt the sheet.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return _error('Busy: could not acquire write lock, try again');
  }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return _error('Sheet not found: ' + sheetName);

    if (action === 'prepend') return _doPrepend(sheet, body);
    if (action === 'append') return _doAppend(sheet, body);
    if (action === 'update') return _doUpdate(sheet, body);
    return _error('Unknown action: ' + action);
  } catch (err) {
    return _error(err.message);
  } finally {
    lock.releaseLock();
  }
}

/** Append an ordered array of values as a new row (bottom of the tab). */
function _doAppend(sheet, body) {
  if (!Array.isArray(body.rowData)) return _error('rowData array is required for append');
  sheet.appendRow(body.rowData);
  return _json({ status: 'ok', action: 'appended' });
}

/** Prepend a workout to the TOP (row 2, under the header), newest-first, with a
 *  blank separator row beneath the block so each workout stays visually grouped.
 *  rowData may be a single row (array of scalars) or a batch (array of arrays). */
function _doPrepend(sheet, body) {
  let rows = body.rowData;
  if (!Array.isArray(rows)) return _error('rowData array is required for prepend');
  if (rows.length === 0) return _error('rowData is empty');
  if (!Array.isArray(rows[0])) rows = [rows];           // wrap a single row

  const width = sheet.getLastColumn() || rows[0].length;
  const block = rows.map(r => {
    const row = r.slice();
    while (row.length < width) row.push('');             // pad short rows
    return row;
  });
  block.push(new Array(width).fill(''));                 // blank separator between workouts

  sheet.insertRowsAfter(1, block.length);
  sheet.getRange(2, 1, block.length, width).setValues(block);
  return _json({ status: 'ok', action: 'prepended', rows: rows.length });
}

/** Update named fields of the row whose keyColumn cell == keyValue. */
function _doUpdate(sheet, body) {
  const { keyColumn, keyValue, rowData } = body;
  if (!keyColumn || keyValue === undefined || keyValue === null) {
    return _error('keyColumn and keyValue are required for update');
  }
  if (!rowData || typeof rowData !== 'object' || Array.isArray(rowData)) {
    return _error('rowData object (header:value) is required for update');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIdx = headers.indexOf(keyColumn);
  if (keyIdx === -1) return _error('keyColumn not found in headers: ' + keyColumn);

  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyIdx]) === String(keyValue)) {
      targetRow = i + 1;            // 1-indexed for getRange
      break;
    }
  }
  if (targetRow === -1) {
    return _error('No row found where ' + keyColumn + ' = ' + keyValue);
  }

  // Patch named fields in memory (unknown headers ignored — no new columns created),
  // then write the whole row in ONE setValues call instead of one call per field.
  const rowValues = data[targetRow - 1].slice();
  Object.keys(rowData).forEach(col => {
    const ci = headers.indexOf(col);
    if (ci !== -1) rowValues[ci] = rowData[col];
  });
  sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);

  return _json({ status: 'ok', action: 'updated', row: targetRow });
}

// ── Helpers ────────────────────────────────────────────────

function _authCheck(token) {
  const secret = PROPS.getProperty('GPT_SECRET');
  return !!secret && token === secret;
}

/** Normalize a cell for JSON. Dates -> 'yyyy-MM-dd' so the GPT never sees ISO
 *  timestamps (Sheets auto-parses date strings into Date objects on write). */
function _cellValue(value, tz) {
  if (value instanceof Date) return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  return value;
}

function _json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function _error(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function _forbidden() {
  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Forbidden: invalid token' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 5. Edge cases the code must handle (all covered above)

| Case | Behavior |
|---|---|
| Missing/empty token | `Forbidden: invalid token` |
| `GPT_SECRET` not set | treated as auth fail (never allow open access) |
| Missing `sheetName` | explicit error |
| Unknown tab | `Sheet not found: X` |
| Empty tab / header-only | `[]` |
| Blank trailing rows | filtered out of GET results |
| Malformed POST JSON | `Invalid JSON body` |
| `update` with no match | error, no write |
| `update` field not in headers | silently skipped (no new columns created) |
| `update` other columns | preserved untouched (whole row rewritten in one `setValues`) |
| `append` rowData not array | error |
| Date cells on read | normalized to `yyyy-MM-dd` strings (never ISO timestamps) |
| Concurrent writes | serialized via `LockService` (10s wait, else `Busy` error) |

---

## 6. `KeepWarm.gs` — cold-start eliminator

```javascript
// KeepWarm.gs
// A no-op invoked by a time trigger to keep the V8 runtime warm during workout
// hours, so GET/POST avoid multi-second cold starts.
function keepWarm() {
  Logger.log('warm ' + new Date().toISOString());
}
```

**Trigger setup (manual, document for the human):**
Apps Script → Triggers (clock icon) → Add Trigger →
- Function: `keepWarm`
- Event source: Time-driven
- Type: Minutes timer → Every 10 minutes
- (Optional) restrict to workout hours to conserve quota.

---

## 7. Test stubs (run inside Apps Script editor)

> These are developer tests Codex should include in the project as `Tests.gs`.
> They simulate `e` objects since GET/POST can't be invoked directly in the editor.

```javascript
// Tests.gs — run testAll() from the editor; check the Logs.
function testAll() {
  _assert(_authCheck(PROPS.getProperty('GPT_SECRET')) === true, 'valid token passes');
  _assert(_authCheck('nope') === false, 'bad token fails');

  // GET empty-arg guard
  const r1 = doGet({ parameter: { token: PROPS.getProperty('GPT_SECRET') } });
  _assert(/sheetName parameter is required/.test(r1.getContent()), 'GET requires sheetName');

  // GET unknown sheet
  const r2 = doGet({ parameter: { token: PROPS.getProperty('GPT_SECRET'), sheetName: 'Nope' } });
  _assert(/Sheet not found/.test(r2.getContent()), 'GET unknown sheet errors');

  // POST malformed JSON
  const r3 = doPost({ postData: { contents: '{bad json' } });
  _assert(/Invalid JSON body/.test(r3.getContent()), 'POST bad JSON errors');

  // POST append round-trip to a scratch tab
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let t = ss.getSheetByName('__test'); if (t) ss.deleteSheet(t);
  t = ss.insertSheet('__test'); t.appendRow(['a', 'b', 'c']);
  const tok = PROPS.getProperty('GPT_SECRET');
  doPost({ postData: { contents: JSON.stringify(
    { token: tok, sheetName: '__test', action: 'append', rowData: ['x', 'y', 'keep'] }) } });
  _assert(t.getLastRow() === 2, 'append added a row');

  // POST update — changes only the named field, leaves the rest intact
  doPost({ postData: { contents: JSON.stringify(
    { token: tok, sheetName: '__test', action: 'update',
      keyColumn: 'a', keyValue: 'x', rowData: { b: 'z' } }) } });
  _assert(t.getRange(2, 2).getValue() === 'z', 'update changed matched field');
  _assert(t.getRange(2, 1).getValue() === 'x', 'update preserved key column');
  _assert(t.getRange(2, 3).getValue() === 'keep', 'update preserved untouched field');

  ss.deleteSheet(t);
  Logger.log('ALL TESTS DONE');
}

function _assert(cond, label) {
  Logger.log((cond ? 'PASS  ' : 'FAIL  ') + label);
  if (!cond) throw new Error('Assertion failed: ' + label);
}
```

---

## 8. Deployment checklist (human step, document it)

1. Paste `SheetsAPI.gs`, `KeepWarm.gs`, `Tests.gs` into the Apps Script project bound
   to the workout spreadsheet (Extensions → Apps Script).
2. Set Script Property `GPT_SECRET`.
3. Run `testAll()` once; authorize scopes; confirm all PASS in Logs.
4. Add the `keepWarm` time trigger.
5. Deploy → New deployment → Web App → Execute as Me, Access Anyone → copy
   `…/macros/s/{{WEBAPP_DEPLOYMENT_ID}}/exec`.
6. Hand the deployment ID to [OPENAPI_SCHEMA.md](./OPENAPI_SCHEMA.md) and the secret to
   [GPT_INSTRUCTIONS.md](./GPT_INSTRUCTIONS.md).
