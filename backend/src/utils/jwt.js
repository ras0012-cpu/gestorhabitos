// ─────────────────────────────────────────────
// utils/jwt.js
// Firma y verifica tokens JWT.
//
// El SECRET viene de .env — nunca hardcodeado en el código.
// Si JWT_SECRET no está definido, el servidor fallará al
// arrancar (jsonwebtoken lanzará error en sign/verify).
// ─────────────────────────────────────────────

const jwt = require('jsonwebtoken');

const SECRET     = process.env.JWT_SECRET;     // clave secreta del .env
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // duración del token

/**
 * Genera un JWT firmado con el payload dado.
 * Se llama en login y register para devolver el token al cliente.
 * @param {Object} payload - datos a incluir: { id, email, nombre }
 * @returns {string} token JWT
 */
const sign = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });

/**
 * Verifica y decodifica un JWT.
 * Lanza JsonWebTokenError si la firma no es válida.
 * Lanza TokenExpiredError si el token ha expirado.
 * @param {string} token
 * @returns {Object} payload decodificado
 */
const verify = (token) =>
  jwt.verify(token, SECRET);

module.exports = { sign, verify };