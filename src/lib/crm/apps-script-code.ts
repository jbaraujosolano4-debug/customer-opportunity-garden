// Source the user pastes into Extensiones → Apps Script of their Google Sheet.
export const APPS_SCRIPT_CODE = String.raw`/**
 * Conector CRM ↔ Google Sheets
 * Pega este código en Extensiones → Apps Script y publícalo como Aplicación web.
 */
const SHEET_NAME = ''; // Déjalo vacío para usar la primera hoja, o escribe el nombre exacto.

// [campo, encabezado que se crea si falta, encabezados aceptados]
const FIELDS = [
  ['id', 'ID', ['ID']],
  ['cliente', 'CLIENTE', ['CLIENTE', 'NOMBRE CLIENTE']],
  ['nit', 'NIT', ['NIT']],
  ['region', 'REGION', ['REGION', 'ZONA', 'ZONA COMERCIAL']],
  ['ciudad', 'CIUDAD', ['CIUDAD']],
  ['canal', 'CANAL', ['CANAL', 'TIPO DE CLIENTE']],
  ['asignado', 'ASIGNADO A', ['ASIGNADO A', 'ASESOR']],
  ['monto', 'MONTO', ['MONTO', 'VALOR']],
  ['estado', 'ESTADO', ['ESTADO', 'ETAPA']],
  ['fechaCreacion', 'FECHA DE CREACION', ['FECHA DE CREACION', 'FECHA CREACION', 'FECHA']],
  ['fechaCierre', 'FECHA DE CIERRE', ['FECHA DE CIERRE', 'FECHA CIERRE']],
  ['categoria', 'CATEGORIA', ['CATEGORIA']],
  ['producto', 'PRODUCTO', ['PRODUCTO', 'REFERENCIA', 'MODELO']],
  ['proximoContacto', 'PROXIMO CONTACTO', ['PROXIMO CONTACTO']],
  ['ultimaGestion', 'ULTIMA GESTION', ['ULTIMA GESTION', 'ULTIMA INTERACCION']],
  ['notas', 'NOTAS', ['NOTAS', 'OBSERVACIONES']],
];
const DATE_FIELDS = ['fechaCreacion', 'fechaCierre', 'proximoContacto', 'ultimaGestion'];

function doGet() {
  return run_(function () {
    return { ok: true, records: listRecords_() };
  });
}

function doPost(e) {
  return run_(function () {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      if (body.action === 'create') return { ok: true, record: createRecord_(body.record || {}) };
      if (body.action === 'update') return { ok: true, record: updateRecord_(body.record || {}) };
      if (body.action === 'delete') { deleteRecord_(String(body.id)); return { ok: true, id: body.id }; }
      throw new Error('Acción no reconocida: ' + body.action);
    } finally {
      lock.releaseLock();
    }
  });
}

function run_(fn) {
  let result;
  try { result = fn(); } catch (err) { result = { ok: false, error: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
  if (!sh) throw new Error('No se encontró la hoja "' + SHEET_NAME + '"');
  return sh;
}

function norm_(v) {
  return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

// Devuelve { campo: númeroDeColumna } y crea los encabezados que falten.
function columns_(sh) {
  const lastCol = sh.getLastColumn();
  const headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(norm_) : [];
  const map = {};
  let next = lastCol + 1;
  FIELDS.forEach(function (f) {
    let idx = -1;
    for (let i = 0; i < f[2].length && idx < 0; i++) idx = headers.indexOf(f[2][i]);
    if (idx < 0) {
      sh.getRange(1, next).setValue(f[1]);
      map[f[0]] = next++;
    } else {
      map[f[0]] = idx + 1;
    }
  });
  return map;
}

function toOut_(field, v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (field === 'monto') return typeof v === 'number' ? v : String(v);
  return v == null ? '' : String(v);
}

function rowToRecord_(row, cols) {
  const rec = {};
  FIELDS.forEach(function (f) { rec[f[0]] = toOut_(f[0], row[cols[f[0]] - 1]); });
  return rec;
}

function listRecords_() {
  const sh = sheet_();
  const cols = columns_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  return values
    .map(function (row) { return rowToRecord_(row, cols); })
    .filter(function (r) { return r.id !== '' || r.cliente !== ''; });
}

function findRow_(sh, cols, id) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sh.getRange(2, cols.id, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

function writeRow_(sh, cols, rowNumber, rec) {
  const width = sh.getLastColumn();
  const range = sh.getRange(rowNumber, 1, 1, width);
  const row = range.getValues()[0];
  FIELDS.forEach(function (f) {
    const key = f[0];
    if (!(key in rec)) return;
    let v = rec[key];
    if (key === 'monto') v = Number(v) || 0;
    else if (DATE_FIELDS.indexOf(key) >= 0 && v) {
      const p = String(v).split('-');
      v = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    } else if (v == null) v = '';
    row[cols[key] - 1] = v;
  });
  range.setValues([row]);
  return rowToRecord_(range.getValues()[0], cols);
}

function createRecord_(rec) {
  const sh = sheet_();
  const cols = columns_(sh);
  let maxId = 0;
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    sh.getRange(2, cols.id, lastRow - 1, 1).getValues().forEach(function (r) {
      const n = Number(r[0]);
      if (!isNaN(n) && n > maxId) maxId = n;
    });
  }
  rec.id = String(maxId + 1);
  if (lastRow >= sh.getMaxRows()) sh.insertRowAfter(lastRow);
  return writeRow_(sh, cols, lastRow + 1, rec);
}

function updateRecord_(rec) {
  const sh = sheet_();
  const cols = columns_(sh);
  const row = findRow_(sh, cols, String(rec.id));
  if (row < 0) throw new Error('No existe la oportunidad con ID ' + rec.id);
  return writeRow_(sh, cols, row, rec);
}

function deleteRecord_(id) {
  const sh = sheet_();
  const cols = columns_(sh);
  const row = findRow_(sh, cols, id);
  if (row < 0) throw new Error('No existe la oportunidad con ID ' + id);
  sh.deleteRow(row);
}
`;
