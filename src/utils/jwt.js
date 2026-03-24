// utils/jwt.js — Firma y verifica tokens JWT.
// El SECRET viene siempre del .env — nunca hardcodeado.

const jwt = require('jsonwebtoken');

const SECRET     = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Fail-fast: si no hay SECRET el servidor no arranca
if (!SECRET) {
  console.error('✗ JWT_SECRET no está definido en .env. Configura el archivo .env y reinicia.');
  process.exit(1);
}

const sign   = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
const verify = (token)   => jwt.verify(token, SECRET);

module.exports = { sign, verify };