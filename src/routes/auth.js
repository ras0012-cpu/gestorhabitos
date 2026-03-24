// routes/auth.js — Registro y login de usuarios.
//
// POST /api/auth/register  → crea cuenta nueva
// POST /api/auth/login     → devuelve JWT + frase motivacional

const express  = require('express');
const bcrypt   = require('bcrypt');
const { getDb, persist }    = require('../db/connection');
const { sign }              = require('../utils/jwt');
const { getFraseAleatoria } = require('../utils/frases');
const { dbGet, dbRun }      = require('../utils/db');

const router      = express.Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });

  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Formato de email inválido.' });

  const db     = getDb();
  const existe = dbGet(db, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existe)
    return res.status(409).json({ error: 'Email ya registrado.' });

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const id   = dbRun(db,
      'INSERT INTO users (nombre, email, password) VALUES (?, ?, ?)',
      [nombre.trim(), email.toLowerCase().trim(), hash]
    );
    persist();

    const token = sign({ id, email: email.toLowerCase().trim(), nombre: nombre.trim() });
    return res.status(201).json({ token, nombre: nombre.trim(), email: email.toLowerCase().trim() });
  } catch (err) {
    console.error('[register]', err.message);
    return res.status(500).json({ error: 'Error interno.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });

  const db   = getDb();
  const user = dbGet(db, 'SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

  // Mismo mensaje para email no encontrado y contraseña incorrecta (evita enumeración)
  if (!user)
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

  try {
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    const token = sign({ id: user.id, email: user.email, nombre: user.nombre });
    return res.json({ token, nombre: user.nombre, email: user.email, frase: getFraseAleatoria() });
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ error: 'Error interno.' });
  }
});

module.exports = router;