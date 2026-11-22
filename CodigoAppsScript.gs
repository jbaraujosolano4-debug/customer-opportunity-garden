/**
 * CONECTOR CRM ↔ GOOGLE SHEETS CON SISTEMA DE AUTENTICACIÓN Y CRUD DE USUARIOS
 * Customer Opportunity Garden
 * 
 * Hojas administradas:
 * 1. OPORTUNIDADES (Pestaña principal de clientes y ventas)
 * 2. USUARIOS (Pestaña de cuentas, contraseñas y roles)
 */

// Deja vacío para tomar la primera pestaña para oportunidades, o escribe el nombre exacto
const SHEET_OPPORTUNITIES = '';
// Nombre de la pestaña para la gestión de usuarios
const SHEET_USERS = 'USUARIOS';

// Encabezados de Oportunidades
const FIELDS_OPPORTUNITY = [
  ['id', 'ID', ['ID', 'CODIGO']],
  ['cliente', 'CLIENTE', ['CLIENTE', 'NOMBRE CLIENTE', 'NOMBRE']],
  ['nit', 'NIT', ['NIT', 'RUT', 'IDENTIFICACION']],
  ['region', 'REGION', ['REGION', 'ZONA', 'ZONA COMERCIAL']],
  ['ciudad', 'CIUDAD', ['CIUDAD', 'MUNICIPIO']],
  ['canal', 'CANAL', ['CANAL', 'TIPO DE CLIENTE', 'TIPO CLIENTE']],
  ['asignado', 'ASIGNADO A', ['ASIGNADO A', 'ASIGNADO', 'ASESOR', 'RESPONSABLE']],
  ['monto', 'MONTO', ['MONTO', 'VALOR', 'VALOR OPORTUNIDAD']],
  ['pares', 'PARES', ['PARES', 'NUMERO DE PARES', 'CANTIDAD PARES', 'PARES PROYECTADOS', 'CANTIDAD']],
  ['estado', 'ESTADO', ['ESTADO', 'ETAPA', 'FASE']],
  ['fechaCreacion', 'FECHA DE CREACION', ['FECHA DE CREACION', 'FECHA CREACION', 'FECHA', 'REGISTRO']],
  ['fechaCierre', 'FECHA DE CIERRE', ['FECHA DE CIERRE', 'FECHA CIERRE']],
  ['categoria', 'CATEGORIA', ['CATEGORIA', 'LINEA']],
  ['producto', 'PRODUCTO', ['PRODUCTO', 'REFERENCIA', 'MODELO']],
  ['proximoContacto', 'PROXIMO CONTACTO', ['PROXIMO CONTACTO', 'PROXIMO SEGUIMIENTO', 'FECHA CONTACTO']],
  ['ultimaGestion', 'ULTIMA GESTION', ['ULTIMA GESTION', 'ULTIMA INTERACCION', 'GESTION']],
  ['notas', 'NOTAS', ['NOTAS', 'OBSERVACIONES', 'COMENTARIOS']],
];
const DATE_FIELDS = ['fechaCreacion', 'fechaCierre', 'proximoContacto', 'ultimaGestion'];

// Encabezados de Usuarios
const FIELDS_USER = [
  ['id', 'ID'],
  ['nombre', 'NOMBRE'],
  ['email', 'EMAIL'],
  ['password', 'PASSWORD'],
  ['rol', 'ROL'],
  ['estado', 'ESTADO'],
  ['fechaCreacion', 'FECHA DE CREACION']
];

/**
 * Peticiones GET: lectura de oportunidades y usuarios
 */
function doGet(e) {
  return run_(function () {
    const params = (e && e.parameter) || {};
    const action = params.action || 'list';

    // Usuarios
    if (action === 'listUsers') return { ok: true, users: listUsers_() };
    if (action === 'getUser') return { ok: true, user: getUserById_(params.id) };

    // Oportunidades
    if (action === 'list') return { ok: true, records: listRecords_() };
    if (action === 'read' || action === 'get') return { ok: true, record: readRecord_(String(params.id)) };
    if (action === 'delete') {
      deleteRecord_(String(params.id));
      return { ok: true, id: params.id };
    }

    return { ok: true, records: listRecords_() };
  });
}

/**
 * Peticiones POST: Login, CRUD de Oportunidades y CRUD de Usuarios
 */
function doPost(e) {
  return run_(function () {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try {
      const action = body.action || 'list';

      // --- MÓDULO DE AUTENTICACIÓN Y USUARIOS ---
      if (action === 'login') {
        return { ok: true, user: loginUser_(body.email, body.password) };
      }
      if (action === 'listUsers') {
        return { ok: true, users: listUsers_() };
      }
      if (action === 'createUser') {
        return { ok: true, user: createUser_(body.user || {}) };
      }
      if (action === 'updateUser') {
        return { ok: true, user: updateUser_(body.user || {}) };
      }
      if (action === 'deleteUser') {
        deleteUser_(String(body.id));
        return { ok: true, id: String(body.id) };
      }
      if (action === 'resetPassword') {
        return { ok: true, message: resetPassword_(body.email, body.newPassword) };
      }

      // --- MÓDULO DE OPORTUNIDADES ---
      if (action === 'list') {
        return { ok: true, records: listRecords_() };
      }
      if (action === 'read' || action === 'get') {
        return { ok: true, record: readRecord_(String(body.id)) };
      }
      if (action === 'create') {
        return { ok: true, record: createRecord_(body.record || {}) };
      }
      if (action === 'update') {
        return { ok: true, record: updateRecord_(body.record || {}) };
      }
      if (action === 'delete') {
        deleteRecord_(String(body.id));
        return { ok: true, id: String(body.id) };
      }

      throw new Error('Acción no reconocida: ' + action);
    } finally {
      lock.releaseLock();
    }
  });
}

function run_(fn) {
  let result;
  try {
    result = fn();
  } catch (err) {
    result = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function norm_(v) {
  return String(v == null ? '' : v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ==========================================
// SECCIÓN: GESTIÓN DE USUARIOS
// ==========================================

function usersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_USERS);
  if (!sh) {
    // Si la hoja USUARIOS no existe, se crea automáticamente
    sh = ss.insertSheet(SHEET_USERS);
    const headers = FIELDS_USER.map(function(f) { return f[1]; });
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');

    // Se crea el usuario administrador predeterminado
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Bogota', 'yyyy-MM-dd');
    const defaultAdmin = ['1', 'Administrador', 'admin@crm.com', 'admin123', 'ADMIN', 'ACTIVO', today];
    sh.getRange(2, 1, 1, defaultAdmin.length).setValues([defaultAdmin]);
  }
  return sh;
}

function userColumns_(sh) {
  const lastCol = sh.getLastColumn();
  const headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(norm_) : [];
  const map = {};
  FIELDS_USER.forEach(function (f) {
    const idx = headers.indexOf(norm_(f[1]));
    map[f[0]] = idx >= 0 ? idx + 1 : null;
  });
  return map;
}

function rowToUser_(row, cols, includePassword) {
  const u = {
    id: String(row[cols.id - 1] || ''),
    nombre: String(row[cols.nombre - 1] || ''),
    email: String(row[cols.email - 1] || '').trim().toLowerCase(),
    rol: String(row[cols.rol - 1] || 'ASESOR').toUpperCase(),
    estado: String(row[cols.estado - 1] || 'ACTIVO').toUpperCase(),
    fechaCreacion: row[cols.fechaCreacion - 1] instanceof Date 
      ? Utilities.formatDate(row[cols.fechaCreacion - 1], Session.getScriptTimeZone() || 'America/Bogota', 'yyyy-MM-dd')
      : String(row[cols.fechaCreacion - 1] || '')
  };
  if (includePassword) {
    u.password = String(row[cols.password - 1] || '');
  }
  return u;
}

function loginUser_(email, password) {
  if (!email || !password) throw new Error('Email y contraseña requeridos.');
  const sh = usersSheet_();
  const cols = userColumns_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('No hay usuarios registrados.');

  const values = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  const targetEmail = String(email).trim().toLowerCase();
  const targetPass = String(password).trim();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const uEmail = String(row[cols.email - 1] || '').trim().toLowerCase();
    const uPass = String(row[cols.password - 1] || '').trim();
    const uEstado = String(row[cols.estado - 1] || 'ACTIVO').toUpperCase();

    if (uEmail === targetEmail) {
      if (uPass !== targetPass) {
        throw new Error('Contraseña incorrecta.');
      }
      if (uEstado !== 'ACTIVO') {
        throw new Error('El usuario está inactivo. Contacta al administrador.');
      }
      return rowToUser_(row, cols, false);
    }
  }

  throw new Error('No existe una cuenta con el correo: ' + email);
}

function listUsers_() {
  const sh = usersSheet_();
  const cols = userColumns_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const values = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  return values
    .map(function (row) { return rowToUser_(row, cols, false); })
    .filter(function (u) { return u.id !== '' && u.email !== ''; });
}

function getUserById_(id) {
  const sh = usersSheet_();
  const cols = userColumns_(sh);
  const rowNum = findUserRow_(sh, cols, id);
  if (rowNum < 0) throw new Error('Usuario no encontrado.');
  const row = sh.getRange(rowNum, 1, 1, sh.getLastColumn()).getValues()[0];
  return rowToUser_(row, cols, false);
}

function findUserRow_(sh, cols, id) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sh.getRange(2, cols.id, lastRow - 1, 1).getValues();
  const searchId = String(id).trim();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === searchId) return i + 2;
  }
  return -1;
}

function createUser_(user) {
  const sh = usersSheet_();
  const cols = userColumns_(sh);
  const lastRow = sh.getLastRow();

  const email = String(user.email || '').trim().toLowerCase();
  if (!email) throw new Error('El correo electrónico es obligatorio.');
  if (!user.nombre) throw new Error('El nombre es obligatorio.');
  if (!user.password) throw new Error('La contraseña es obligatoria.');

  // Verificar si el correo ya existe
  if (lastRow >= 2) {
    const emails = sh.getRange(2, cols.email, lastRow - 1, 1).getValues();
    for (let i = 0; i < emails.length; i++) {
      if (String(emails[i][0]).trim().toLowerCase() === email) {
        throw new Error('Ya existe un usuario con este correo electrónico.');
      }
    }
  }

  // Generar ID
  let maxId = 0;
  if (lastRow >= 2) {
    const ids = sh.getRange(2, cols.id, lastRow - 1, 1).getValues();
    ids.forEach(function (r) {
      const n = parseInt(String(r[0]).trim(), 10);
      if (!isNaN(n) && n > maxId) maxId = n;
    });
  }
  const newId = String(maxId + 1);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Bogota', 'yyyy-MM-dd');

  const width = sh.getLastColumn();
  const newRow = new Array(width).fill('');
  newRow[cols.id - 1] = newId;
  newRow[cols.nombre - 1] = String(user.nombre).trim();
  newRow[cols.email - 1] = email;
  newRow[cols.password - 1] = String(user.password).trim();
  newRow[cols.rol - 1] = String(user.rol || 'ASESOR').toUpperCase();
  newRow[cols.estado - 1] = String(user.estado || 'ACTIVO').toUpperCase();
  newRow[cols.fechaCreacion - 1] = today;

  if (lastRow >= sh.getMaxRows()) sh.insertRowAfter(lastRow);
  sh.getRange(lastRow + 1, 1, 1, width).setValues([newRow]);

  return {
    id: newId,
    nombre: user.nombre,
    email: email,
    rol: newRow[cols.rol - 1],
    estado: newRow[cols.estado - 1],
    fechaCreacion: today
  };
}

function updateUser_(user) {
  if (!user || !user.id) throw new Error('Se requiere el ID de usuario.');
  const sh = usersSheet_();
  const cols = userColumns_(sh);
  const rowNum = findUserRow_(sh, cols, user.id);
  if (rowNum < 0) throw new Error('Usuario con ID ' + user.id + ' no encontrado.');

  const range = sh.getRange(rowNum, 1, 1, sh.getLastColumn());
  const row = range.getValues()[0];

  if (user.nombre) row[cols.nombre - 1] = String(user.nombre).trim();
  if (user.email) row[cols.email - 1] = String(user.email).trim().toLowerCase();
  if (user.password && String(user.password).trim()) row[cols.password - 1] = String(user.password).trim();
  if (user.rol) row[cols.rol - 1] = String(user.rol).toUpperCase();
  if (user.estado) row[cols.estado - 1] = String(user.estado).toUpperCase();

  range.setValues([row]);
  return rowToUser_(row, cols, false);
}

function deleteUser_(id) {
  const sh = usersSheet_();
  const cols = userColumns_(sh);
  const rowNum = findUserRow_(sh, cols, id);
  if (rowNum < 0) throw new Error('Usuario no encontrado.');

  // Prevenir borrar si solo queda 1 usuario
  if (sh.getLastRow() <= 2) {
    throw new Error('No puedes eliminar el único usuario registrado.');
  }

  sh.deleteRow(rowNum);
}

function resetPassword_(email, newPassword) {
  if (!email || !newPassword) throw new Error('Email y nueva contraseña requeridos.');
  const sh = usersSheet_();
  const cols = userColumns_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('No hay usuarios registrados.');
  const emails = sh.getRange(2, cols.email, lastRow - 1, 1).getValues();
  const target = String(email).trim().toLowerCase();
  let rowIdx = -1;
  for (let i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === target) {
      rowIdx = i + 2;
      break;
    }
  }
  if (rowIdx === -1) throw new Error('No existe una cuenta con el correo: ' + email);
  sh.getRange(rowIdx, cols.password).setValue(String(newPassword).trim());
  return 'Contraseña actualizada correctamente.';
}

// ==========================================
// SECCIÓN: GESTIÓN DE OPORTUNIDADES
// ==========================================

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = SHEET_OPPORTUNITIES ? ss.getSheetByName(SHEET_OPPORTUNITIES) : ss.getSheets()[0];
  if (!sh) throw new Error('No se encontró la pestaña de oportunidades.');
  return sh;
}

function columns_(sh) {
  const lastCol = sh.getLastColumn();
  const headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(norm_) : [];
  const map = {};
  let next = lastCol + 1;

  FIELDS_OPPORTUNITY.forEach(function (f) {
    const key = f[0];
    const defaultHeader = f[1];
    const aliases = f[2];
    let idx = -1;

    for (let i = 0; i < aliases.length && idx < 0; i++) {
      idx = headers.indexOf(norm_(aliases[i]));
    }

    if (idx < 0) {
      sh.getRange(1, next).setValue(defaultHeader);
      map[key] = next++;
    } else {
      map[key] = idx + 1;
    }
  });

  return map;
}

function toOut_(field, v) {
  if (v instanceof Date) {
    const tz = Session.getScriptTimeZone() || 'America/Bogota';
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  if (field === 'monto' || field === 'pares') {
    if (typeof v === 'number') return v;
    const n = Number(String(v).replace(/[^0-9.-]+/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return v == null ? '' : String(v);
}

function rowToRecord_(row, cols) {
  const rec = {};
  FIELDS_OPPORTUNITY.forEach(function (f) {
    const colIdx = cols[f[0]];
    rec[f[0]] = colIdx ? toOut_(f[0], row[colIdx - 1]) : '';
  });
  return rec;
}

function listRecords_() {
  const sh = sheet_();
  const cols = columns_(sh);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return values
    .map(function (row) { return rowToRecord_(row, cols); })
    .filter(function (r) { return r.id !== '' || r.cliente !== ''; });
}

function readRecord_(id) {
  const sh = sheet_();
  const cols = columns_(sh);
  const rowNum = findRow_(sh, cols, id);
  if (rowNum < 0) throw new Error('No se encontró el registro con ID ' + id);

  const values = sh.getRange(rowNum, 1, 1, sh.getLastColumn()).getValues()[0];
  return rowToRecord_(values, cols);
}

function findRow_(sh, cols, id) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sh.getRange(2, cols.id, lastRow - 1, 1).getValues();
  const searchId = String(id).trim();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === searchId) return i + 2;
  }
  return -1;
}

function writeRow_(sh, cols, rowNumber, rec) {
  const width = sh.getLastColumn();
  const range = sh.getRange(rowNumber, 1, 1, width);
  const row = range.getValues()[0];

  FIELDS_OPPORTUNITY.forEach(function (f) {
    const key = f[0];
    if (!(key in rec)) return;
    let v = rec[key];

    if (key === 'monto') {
      v = Number(v) || 0;
    } else if (DATE_FIELDS.indexOf(key) >= 0 && v) {
      if (typeof v === 'string') {
        const parts = v.split('-');
        if (parts.length === 3) {
          v = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
      }
    } else if (v == null) {
      v = '';
    }

    const colIdx = cols[key];
    if (colIdx && colIdx <= width) {
      row[colIdx - 1] = v;
    }
  });

  range.setValues([row]);
  return rowToRecord_(range.getValues()[0], cols);
}

function createRecord_(rec) {
  const sh = sheet_();
  const cols = columns_(sh);
  const lastRow = sh.getLastRow();

  if (!rec.id) {
    let maxId = 0;
    if (lastRow >= 2) {
      const ids = sh.getRange(2, cols.id, lastRow - 1, 1).getValues();
      ids.forEach(function (r) {
        const n = parseInt(String(r[0]).trim(), 10);
        if (!isNaN(n) && n > maxId) maxId = n;
      });
    }
    rec.id = String(maxId + 1);
  }

  if (lastRow >= sh.getMaxRows()) sh.insertRowAfter(lastRow);
  return writeRow_(sh, cols, lastRow + 1, rec);
}

function updateRecord_(rec) {
  if (!rec || !rec.id) throw new Error('Se requiere el campo "id" para actualizar.');
  const sh = sheet_();
  const cols = columns_(sh);
  const row = findRow_(sh, cols, String(rec.id));
  if (row < 0) throw new Error('No existe ningún registro con ID ' + rec.id);

  return writeRow_(sh, cols, row, rec);
}

function deleteRecord_(id) {
  const sh = sheet_();
  const cols = columns_(sh);
  const row = findRow_(sh, cols, String(id));
  if (row < 0) throw new Error('No existe ningún registro con ID ' + id);

  sh.deleteRow(row);
}
