// Archive.gs
// Keeps the Log tab lean so reads stay fast. Retains the newest
// ARCHIVE_KEEP_SESSIONS distinct workout dates in Log and moves everything older
// to an "Archive" tab. Run manually from the editor, or on a weekly time trigger.
// (Apps Script → Triggers → archiveOldWorkouts → Time-driven → Week timer.)

const ARCHIVE_KEEP_SESSIONS = 8;   // ~4 weeks at 2 sessions/week

function archiveOldWorkouts() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    Logger.log('archive skipped: could not acquire lock');
    return;
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const log = ss.getSheetByName('Log');
    if (!log) throw new Error('Sheet not found: Log');

    const data = log.getDataRange().getValues();
    if (data.length < 2) return;

    const headers = data[0];
    const tz = ss.getSpreadsheetTimeZone();
    const key = v => (v instanceof Date) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v);

    // Drop blank separator rows; Date is column 0.
    const body = data.slice(1).filter(r => r.some(c => c !== '' && c !== null));

    // Distinct dates in sheet order (newest-first, since writes prepend).
    const order = [];
    body.forEach(r => { const k = key(r[0]); if (order.indexOf(k) === -1) order.push(k); });
    const keepSet = order.slice(0, ARCHIVE_KEEP_SESSIONS);

    const keep = body.filter(r => keepSet.indexOf(key(r[0])) !== -1);
    const move = body.filter(r => keepSet.indexOf(key(r[0])) === -1);
    if (move.length === 0) { Logger.log('nothing to archive'); return; }

    // Append moved rows to Archive (create tab with headers if missing).
    let arch = ss.getSheetByName('Archive');
    if (!arch) { arch = ss.insertSheet('Archive'); arch.appendRow(headers); }
    arch.getRange(arch.getLastRow() + 1, 1, move.length, headers.length).setValues(move);

    // Rewrite Log: header + kept rows, blank separator between distinct dates.
    const width = log.getLastColumn();
    log.getRange(2, 1, log.getLastRow() - 1, width).clearContent();
    const out = [];
    let prev = null;
    keep.forEach(r => {
      const k = key(r[0]);
      if (prev !== null && k !== prev) out.push(new Array(width).fill(''));  // separator
      const row = r.slice();
      while (row.length < width) row.push('');
      out.push(row);
      prev = k;
    });
    if (out.length) log.getRange(2, 1, out.length, width).setValues(out);

    Logger.log('archived ' + move.length + ' rows, kept ' + keep.length);
  } finally {
    lock.releaseLock();
  }
}
