import { verifyAccessToken } from '../utils/auth.js';
import { pool } from '../db.js';

// Además de validar la firma del token, se confirma contra la base de datos
// que la cuenta sigue activa y se toma de allí el rol vigente. Sin esto, un
// usuario desactivado (o eliminado) seguía operando hasta que venciera su
// access token (20 min), incluso registrando entradas y salidas.
export async function requireAuth(req,res,next) {
  let claims;
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return res.status(401).json({message:'Token requerido'});
    claims = verifyAccessToken(h.slice(7));
  } catch {
    return res.status(401).json({message:'Token inválido o expirado'});
  }
  try {
    const {rows} = await pool.query('SELECT rol,estado FROM usuarios WHERE id=$1',[claims.sub]);
    if (!rows.length || rows[0].estado !== 'ACTIVO') return res.status(401).json({message:'La cuenta no está activa'});
    req.auth = {...claims, role: rows[0].rol};
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(...roles) {
  return (req,res,next) => {
    if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({message:'No autorizado'});
    next();
  };
}
