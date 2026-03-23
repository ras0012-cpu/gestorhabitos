// ─────────────────────────────────────────────
// routes/auth.js
// Gestiona el registro y login de usuarios.
//
// POST /api/auth/register  → crea cuenta nueva
// POST /api/auth/login     → devuelve JWT + frase motivacional
// ─────────────────────────────────────────────

const express  = require('express');
const bcrypt   = require('bcrypt');
const { getDb, persist } = require('../db/connection');
const { sign }           = require('../utils/jwt');
const { getFraseAleatoria } = require('../utils/frases');

const router      = express.Router();
const SALT_ROUNDS = 12; // coste del hash bcrypt (cuanto más alto, más seguro pero más lento)

// ── Helpers sql.js ───────────────────────────
// sql.js no tiene API async ni métodos .get/.all,
// así que encapsulamos las operaciones más comunes.

/**
 * Ejecuta una SELECT y devuelve la primera fila, o null si no hay resultados.
 * @param {Database} db
 * @param {string} sql
 * @param {Array} params
 * @returns {Object|null}
 */
const dbGet = (db, sql, params = []) => {
  const stmt   = db.prepare(sql);
  stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free(); // liberamos memoria — sql.js requiere esto manualmente
  return result;
};

/**
 * Ejecuta un INSERT/UPDATE/DELETE y devuelve el id del último registro insertado.
 * @param {Database} db
 * @param {string} sql
 * @param {Array} params
 * @returns {number} id del registro insertado
 */
const dbRun = (db, sql, params = []) => {
  db.run(sql, params);
  return db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
};

// ── POST /api/auth/register ──────────────────
// Crea una cuenta nueva. Hashea la contraseña con bcrypt
// antes de guardarla — NUNCA guardamos texto plano.
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  // Validación básica de campos obligatorios
  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });

  // Mínimo de seguridad para la contraseña
  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  const db = getDb();

  // Comprobamos que el email no esté ya registrado
  // Normalizamos a minúsculas para evitar duplicados por capitalización
  const existe = dbGet(db, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existe)
    return res.status(409).json({ error: 'Email ya registrado.' });

  try {
    // bcrypt.hash es asíncrono — evita bloquear el event loop
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const id = dbRun(db,
      'INSERT INTO users (nombre, email, password) VALUES (?, ?, ?)',
      [nombre.trim(), email.toLowerCase().trim(), hash]
    );

    // Persistimos a disco inmediatamente después de cada escritura
    persist();

    // Devolvemos JWT para que el usuario pueda entrar sin hacer login manual
    const token = sign({ id, email: email.toLowerCase().trim(), nombre: nombre.trim() });
    return res.status(201).json({ token, nombre: nombre.trim(), email: email.toLowerCase().trim() });

  } catch (err) {
    console.error('[register] Error:', err.message);
    return res.status(500).json({ error: 'Error interno.' });
  }
});

// ── POST /api/auth/login ─────────────────────
// Verifica credenciales y devuelve un JWT.
// También incluye una frase motivacional aleatoria
// para mostrar al usuario en cada inicio de sesión.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });

  const db   = getDb();
  const user = dbGet(db, 'SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

  // Usamos el mismo mensaje para email no encontrado y contraseña incorrecta
  // para no revelar si el email existe en la BD (seguridad)
  if (!user)
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

  try {
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    const token = sign({ id: user.id, email: user.email, nombre: user.nombre });

    // Incluimos una frase aleatoria en la respuesta del login
    // El frontend la mostrará al usuario al entrar
    return res.json({
      token,
      nombre:  user.nombre,
      email:   user.email,
      frase:   getFraseAleatoria(),
    });

  } catch (err) {
    console.error('[login] Error:', err.message);
    return res.status(500).json({ error: 'Error interno.' });
  }
});

module.exports = router;