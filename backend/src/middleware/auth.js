import { verifyAccessToken } from '../utils/auth.js';

export function requireAuth(req,res,next) {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return res.status(401).json({message:'Token requerido'});
    req.auth = verifyAccessToken(h.slice(7));
    next();
  } catch {
    res.status(401).json({message:'Token inválido o expirado'});
  }
}

export function requireRole(...roles) {
  return (req,res,next) => {
    if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({message:'No autorizado'});
    next();
  };
}
