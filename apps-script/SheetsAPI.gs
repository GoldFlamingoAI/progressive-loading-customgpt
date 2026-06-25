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
 *  rowData may be a single row (array of scalars) or a batch (array of arrays) —
 *  send a whole session's exercises in one call to keep them ordered. */
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
