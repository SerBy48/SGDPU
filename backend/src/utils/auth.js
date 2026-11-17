import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.rol, name: `${user.nombre} ${user.apellido}` },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '20m' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function randomRefreshToken() {
  return randomToken();
}

export async function hashRefreshToken(token) {
  return hashToken(token);
}

export async function compareRefreshToken(token, hash) {
  return compareToken(token, hash);
}

// Genérico: mismo esquema de token aleatorio + hash bcrypt usado por
// refresh tokens, verificación de correo y recuperación de contraseña.
export function randomToken() {
  return crypto.randomBytes(48).toString('hex');
}

export async function hashToken(token) {
  return bcrypt.hash(token, 10);
}

export async function compareToken(token, hash) {
  return bcrypt.compare(token, hash);
}
