// ─────────────────────────────────────────────
// middleware/auth.js
// Protege las rutas que requieren autenticación.
//
// Flujo:
//   1. Lee la cabecera Authorization: Bearer <token>
//   2. Verifica la firma y expiración del JWT
//   3. Si es válido, inyecta req.usuario con los datos del token
//   4. Si no, responde 401 y corta la cadena de middlewares
// ─────────────────────────────────────────────

const { verify } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  const header = req.headers['authorization'];

  // La cabecera debe tener formato: "Bearer <token>"
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido.' });
  }

  const token = header.split(' ')[1];

  try {
    // verify() lanza excepción si el token es inválido o ha expirado
    // Inyectamos el payload decodificado en req.usuario
    // para que las rutas puedan acceder a { id, email, nombre }
    req.usuario = verify(token);
    next(); // token válido → continúa al siguiente handler
  } catch (err) {
    // Distinguimos token expirado de token manipulado
    const msg = err.name === 'TokenExpiredError'
      ? 'Token expirado.'
      : 'Token inválido.';
    return res.status(401).json({ error: msg });
  }
};

module.exports = authMiddleware;