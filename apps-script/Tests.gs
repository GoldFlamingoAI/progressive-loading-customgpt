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
