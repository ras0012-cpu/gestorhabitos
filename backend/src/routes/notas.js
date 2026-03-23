// ─────────────────────────────────────────────
// routes/notas.js
// Gestiona el diario personal del usuario.
// Una nota por día: texto libre + puntuación 1-5.
//
// GET    /api/notas          → lista todas las notas del usuario
// GET    /api/notas/hoy      → nota de hoy (o null si no existe)
// GET    /api/notas/:fecha   → nota de una fecha concreta (YYYY-MM-DD)
// POST   /api/notas          → crea o actualiza la nota de hoy (upsert)
// DELETE /api/notas/:fecha   → elimina la nota de esa fecha
// ─────────────────────────────────────────────

const express        = require('express');
const { getDb, persist } = require('../db/connection');
const auth           = require('../middleware/auth');

const router = express.Router();

// Todas las rutas de notas requieren estar autenticado
router.use(auth);

// ── Helpers sql.js ───────────────────────────

/**
 * Devuelve la primera fila de una SELECT, o null.
 */
const dbGet = (db, sql, params = []) => {
  const stmt   = db.prepare(sql);
  stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
};

/**
 * Devuelve todas las filas de una SELECT como array.
 */
const dbAll = (db, sql, params = []) => {
  const rows = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

/**
 * Ejecuta INSERT/UPDATE/DELETE y devuelve el id del último registro insertado.
 */
const dbRun = (db, sql, params = []) => {
  db.run(sql, params);
  return db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
};

/**
 * Devuelve la fecha de hoy en formato ISO 'YYYY-MM-DD'.
 * Usamos UTC para consistencia entre servidor y cliente.
 */
const today = () => new Date().toISOString().split('T')[0];

/**
 * Valida que un string tenga formato de fecha ISO: YYYY-MM-DD
 * Evita inyecciones y errores silenciosos.
 */
const isValidDate = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str);

// ── GET /api/notas ───────────────────────────
// Devuelve todas las notas del usuario ordenadas
// de más reciente a más antigua (para el historial).
router.get('/', (req, res) => {
  const db    = getDb();
  const notas = dbAll(db,
    `SELECT id, fecha, texto, puntuacion, created_at, updated_at
     FROM notas_diarias
     WHERE usuario_id = ?
     ORDER BY fecha DESC`,
    [req.usuario.id]
  );

  return res.json(notas);
});

// ── GET /api/notas/hoy ───────────────────────
// Acceso rápido a la nota de hoy.
// El frontend lo usa al cargar la app para saber
// si el usuario ya ha escrito hoy.
router.get('/hoy', (req, res) => {
  const db   = getDb();
  const nota = dbGet(db,
    `SELECT id, fecha, texto, puntuacion, created_at, updated_at
     FROM notas_diarias
     WHERE usuario_id = ? AND fecha = ?`,
    [req.usuario.id, today()]
  );

  // Devolvemos null si no hay nota hoy — el frontend lo maneja
  return res.json(nota || null);
});

// ── GET /api/notas/:fecha ────────────────────
// Recupera la nota de una fecha específica.
// Útil para el historial o para editar días anteriores.
router.get('/:fecha', (req, res) => {
  const { fecha } = req.params;

  // Validamos el formato antes de hacer la query
  if (!isValidDate(fecha))
    return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });

  const db   = getDb();
  const nota = dbGet(db,
    `SELECT id, fecha, texto, puntuacion, created_at, updated_at
     FROM notas_diarias
     WHERE usuario_id = ? AND fecha = ?`,
    [req.usuario.id, fecha]
  );

  if (!nota)
    return res.status(404).json({ error: 'No hay nota para esa fecha.' });

  return res.json(nota);
});

// ── POST /api/notas ──────────────────────────
// Crea o actualiza (upsert) la nota del día indicado.
// Si no se pasa fecha, se usa hoy.
// Usamos INSERT OR REPLACE para manejar el upsert en SQLite.
router.post('/', (req, res) => {
  const { texto = '', puntuacion, fecha } = req.body;

  // Si no se pasa fecha, usamos hoy
  const fechaNota = fecha || today();

  // Validación del formato de fecha
  if (!isValidDate(fechaNota))
    return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });

  // Validación de puntuación: debe ser un entero entre 1 y 5
  const puntInt = parseInt(puntuacion, 10);
  if (isNaN(puntInt) || puntInt < 1 || puntInt > 5)
    return res.status(400).json({ error: 'La puntuación debe ser un número entre 1 y 5.' });

  // Limitamos la longitud del texto para evitar abusos
  if (texto.length > 2000)
    return res.status(400).json({ error: 'El texto no puede superar 2000 caracteres.' });

  const db = getDb();

  // Comprobamos si ya existe una nota para esa fecha y usuario
  const existente = dbGet(db,
    'SELECT id FROM notas_diarias WHERE usuario_id = ? AND fecha = ?',
    [req.usuario.id, fechaNota]
  );

  if (existente) {
    // UPDATE: actualizamos texto, puntuación y la fecha de modificación
    db.run(
      `UPDATE notas_diarias
       SET texto = ?, puntuacion = ?, updated_at = datetime('now')
       WHERE usuario_id = ? AND fecha = ?`,
      [texto.trim(), puntInt, req.usuario.id, fechaNota]
    );
  } else {
    // INSERT: creamos la nota nueva
    dbRun(db,
      `INSERT INTO notas_diarias (usuario_id, fecha, texto, puntuacion)
       VALUES (?, ?, ?, ?)`,
      [req.usuario.id, fechaNota, texto.trim(), puntInt]
    );
  }

  persist(); // guardamos cambios en disco

  // Devolvemos la nota actualizada para que el frontend refleje los cambios
  const nota = dbGet(db,
    `SELECT id, fecha, texto, puntuacion, created_at, updated_at
     FROM notas_diarias
     WHERE usuario_id = ? AND fecha = ?`,
    [req.usuario.id, fechaNota]
  );

  const status = existente ? 200 : 201;
  return res.status(status).json(nota);
});

// ── DELETE /api/notas/:fecha ─────────────────
// Elimina la nota de una fecha específica.
// Solo puede borrar el propio usuario su nota (verificado por usuario_id).
router.delete('/:fecha', (req, res) => {
  const { fecha } = req.params;

  if (!isValidDate(fecha))
    return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });

  const db   = getDb();
  const nota = dbGet(db,
    'SELECT id FROM notas_diarias WHERE usuario_id = ? AND fecha = ?',
    [req.usuario.id, fecha]
  );

  if (!nota)
    return res.status(404).json({ error: 'No hay nota para esa fecha.' });

  db.run('DELETE FROM notas_diarias WHERE id = ?', [nota.id]);
  persist();

  return res.json({ ok: true, fecha });
});

module.exports = router;