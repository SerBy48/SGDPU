import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.rol, name: `${user.nombre} ${user.apellido}` },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '20m', algorithm: 'HS256' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
}

export function refreshDays() {
  const d = Number(process.env.REFRESH_DAYS);
  return Number.isInteger(d) && d > 0 && d <= 90 ? d : 7;
}

// Tokens opacos (refresh, verificación de correo, recuperación de contraseña):
// 384 bits aleatorios. Al tener entropía alta no necesitan un hash lento como
// bcrypt; SHA-256 basta y, al ser determinista, permite buscar el token por
// igualdad (WHERE token_hash=$1, con índice) en lugar de comparar con bcrypt
// contra TODOS los tokens vigentes en cada petición, lo que crecía sin límite
// y permitía saturar el servidor con peticiones a /auth/refresh.
export function randomToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
