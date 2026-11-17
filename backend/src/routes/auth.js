import { Router } from '../utils/router.js';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool, withTransaction } from '../db.js';
import { signAccessToken, randomToken, hashToken, refreshDays } from '../utils/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/mailer.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
// /refresh lo llama el frontend automáticamente (cada ~20 min por sesión), así
// que el límite es más holgado que el de login, pero evita abuso del endpoint.
const refreshLimiter = rateLimit({ windowMs: 15 * 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

const INSTITUTIONAL_EMAIL = /^[^\s@]+@usco\.edu\.co$/i;
const VERIFICATION_TOKEN_HOURS = 24;
const RESET_TOKEN_MINUTES = 15;

function publicUser(u) {
  return {id:u.id,nombre:u.nombre,apellido:u.apellido,correo:u.correo,rol:u.rol,estado:u.estado,id_parqueadero_asignado:u.id_parqueadero_asignado};
}

async function insertRefreshToken(db, userId) {
  const token = randomToken();
  await db.query(
    `INSERT INTO refresh_tokens(id_usuario,token_hash,fecha_expiracion) VALUES($1,$2,now()+make_interval(days => $3))`,
    [userId, hashToken(token), refreshDays()]
  );
  return token;
}

router.post('/register', authLimiter, async (req,res) => {
  const nombre = String(req.body.nombre||'').trim();
  const apellido = String(req.body.apellido||'').trim();
  const contrasena = typeof req.body.contrasena === 'string' ? req.body.contrasena : '';
  if (!nombre || !apellido || !req.body.correo || contrasena.length < 8)
    return res.status(400).json({message:'Nombre, apellido, correo y contraseña de mínimo 8 caracteres son obligatorios'});
  if (nombre.length > 80 || apellido.length > 80 || contrasena.length > 72)
    return res.status(400).json({message:'Alguno de los datos excede la longitud permitida'});
  const correoNorm = String(req.body.correo).toLowerCase().trim();
  if (!INSTITUTIONAL_EMAIL.test(correoNorm) || correoNorm.length > 180)
    return res.status(400).json({message:'Debe registrarse con un correo institucional @usco.edu.co'});
  try {
    const hash = await bcrypt.hash(contrasena, 10);
    const rawToken = randomToken();
    await withTransaction(async client => {
      const {rows} = await client.query(
        `INSERT INTO usuarios(nombre,apellido,correo,contrasena_hash,rol,estado,email_verificado)
         VALUES($1,$2,$3,$4,'CONSULTOR','ACTIVO',false) RETURNING id`,
        [nombre,apellido,correoNorm,hash]
      );
      await client.query(
        `INSERT INTO email_verification_tokens(id_usuario,token_hash,fecha_expiracion)
         VALUES($1,$2,now()+interval '${VERIFICATION_TOKEN_HOURS} hours')`,
        [rows[0].id, hashToken(rawToken)]
      );
    });
    const link = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    await sendVerificationEmail(correoNorm, link);
    res.status(201).json({message:'Cuenta creada. Revise su correo institucional para verificar la cuenta antes de iniciar sesión.'});
  } catch(e) {
    if (e.code==='23505') return res.status(409).json({message:'El correo ya está registrado'});
    console.error('Error en registro:', e);
    res.status(500).json({message:'No fue posible registrar la cuenta'});
  }
});

router.post('/login', authLimiter, async (req,res) => {
  const {correo,contrasena} = req.body;
  const client = await pool.connect();
  try {
    const q = await client.query('SELECT * FROM usuarios WHERE correo=$1',[String(correo||'').toLowerCase().trim()]);
    if (!q.rowCount) return res.status(401).json({message:'Credenciales inválidas'});
    const u=q.rows[0];
    if (u.estado!=='ACTIVO') return res.status(403).json({message:'La cuenta está inactiva'});
    if (u.locked_until && new Date(u.locked_until)>new Date()) return res.status(423).json({message:'Cuenta bloqueada temporalmente'});
    const ok=await bcrypt.compare(String(contrasena||''),u.contrasena_hash);
    if (!ok) {
      const attempts=u.failed_login_attempts+1;
      const locked=attempts>=5 ? new Date(Date.now()+15*60*1000) : null;
      await client.query('UPDATE usuarios SET failed_login_attempts=$1,locked_until=$2 WHERE id=$3',[locked?0:attempts,locked,u.id]);
      return res.status(401).json({message:locked?'Cuenta bloqueada por 15 minutos tras varios intentos fallidos':'Credenciales inválidas'});
    }
    // Se verifica después de la contraseña para no revelar a terceros qué
    // correos están registrados pero sin verificar.
    if (!u.email_verificado) return res.status(403).json({message:'Debe verificar su correo antes de iniciar sesión. Revise su bandeja de entrada.'});
    await client.query('UPDATE usuarios SET failed_login_attempts=0,locked_until=NULL WHERE id=$1',[u.id]);
    const access=signAccessToken(u);
    const refresh=await insertRefreshToken(client,u.id);
    if(u.rol!=='CONSULTOR') await audit(client,u,'LOGIN','AUTENTICACIÓN','Inicio de sesión',req.ip);
    res.json({accessToken:access,refreshToken:refresh,user:publicUser(u)});
  } finally { client.release(); }
});

router.post('/verify-email', authLimiter, async (req,res) => {
  const {token} = req.body;
  if (!token || typeof token !== 'string') return res.status(400).json({message:'Token requerido'});
  const ok = await withTransaction(async client => {
    // UPDATE ... RETURNING marca el token como usado de forma atómica: dos
    // peticiones simultáneas con el mismo token no pueden consumirlo ambas.
    const {rows} = await client.query(
      `UPDATE email_verification_tokens SET usado=true,fecha_uso=now()
       WHERE token_hash=$1 AND usado=false AND fecha_expiracion>now() RETURNING id_usuario`,
      [hashToken(token)]
    );
    if (!rows.length) return false;
    const u = (await client.query('UPDATE usuarios SET email_verificado=true WHERE id=$1 RETURNING id,rol',[rows[0].id_usuario])).rows[0];
    await audit(client,u,'VERIFICAR_EMAIL','AUTENTICACIÓN','Correo verificado',req.ip);
    return true;
  });
  if (!ok) return res.status(400).json({message:'Token inválido o expirado'});
  res.json({ok:true});
});

router.post('/forgot-password', authLimiter, async (req,res) => {
  const {correo} = req.body;
  const generic = {message:'Si el correo existe y está verificado, se envió un enlace de recuperación.'};
  const correoNorm = String(correo||'').toLowerCase().trim();
  if (!correoNorm) return res.json(generic);
  const {rows} = await pool.query('SELECT * FROM usuarios WHERE correo=$1',[correoNorm]);
  const u = rows[0];
  if (u && u.email_verificado && u.estado==='ACTIVO') {
    const rawToken = randomToken();
    await pool.query(
      `INSERT INTO password_reset_tokens(id_usuario,token_hash,fecha_expiracion)
       VALUES($1,$2,now()+interval '${RESET_TOKEN_MINUTES} minutes')`,
      [u.id, hashToken(rawToken)]
    );
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(correoNorm, link);
  }
  res.json(generic);
});

router.post('/reset-password', authLimiter, async (req,res) => {
  const {token,contrasena} = req.body;
  if (!token || typeof token !== 'string' || typeof contrasena !== 'string' || contrasena.length < 8)
    return res.status(400).json({message:'Token y contraseña de mínimo 8 caracteres son obligatorios'});
  if (contrasena.length > 72) return res.status(400).json({message:'La contraseña no puede superar 72 caracteres'});
  const hash = await bcrypt.hash(contrasena, 10);
  const ok = await withTransaction(async client => {
    const {rows} = await client.query(
      `UPDATE password_reset_tokens SET usado=true,fecha_uso=now()
       WHERE token_hash=$1 AND usado=false AND fecha_expiracion>now() RETURNING id_usuario`,
      [hashToken(token)]
    );
    if (!rows.length) return false;
    const userId = rows[0].id_usuario;
    const u = (await client.query(
      'UPDATE usuarios SET contrasena_hash=$1,failed_login_attempts=0,locked_until=NULL WHERE id=$2 RETURNING id,rol',
      [hash,userId])).rows[0];
    // Un enlace de recuperación invalida los demás pendientes y cierra todas las sesiones.
    await client.query('UPDATE password_reset_tokens SET usado=true,fecha_uso=now() WHERE id_usuario=$1 AND usado=false',[userId]);
    await client.query('UPDATE refresh_tokens SET revocado=true,fecha_revocacion=now() WHERE id_usuario=$1 AND revocado=false',[userId]);
    await audit(client,u,'RESET_PASSWORD','AUTENTICACIÓN','Restablecimiento de contraseña',req.ip);
    return true;
  });
  if (!ok) return res.status(400).json({message:'Token inválido o expirado'});
  res.json({ok:true});
});

router.post('/refresh', refreshLimiter, async (req,res) => {
  const {refreshToken}=req.body;
  if(!refreshToken || typeof refreshToken !== 'string') return res.status(401).json({message:'Refresh token requerido'});
  const tokenHash = hashToken(refreshToken);
  const result = await withTransaction(async client => {
    // Revocación atómica: si dos peticiones usan el mismo token a la vez, solo
    // una obtiene la fila; la otra cae en la detección de reutilización.
    const {rows} = await client.query(
      `UPDATE refresh_tokens SET revocado=true,fecha_revocacion=now()
       WHERE token_hash=$1 AND revocado=false AND fecha_expiracion>now() RETURNING id_usuario`,
      [tokenHash]
    );
    if (rows.length) {
      const u = (await client.query('SELECT * FROM usuarios WHERE id=$1',[rows[0].id_usuario])).rows[0];
      // Una cuenta desactivada no debe poder renovar su sesión.
      if (!u || u.estado!=='ACTIVO') return null;
      return {accessToken:signAccessToken(u),refreshToken:await insertRefreshToken(client,u.id)};
    }
    // Ningún token activo coincide: si es uno ya revocado siendo reutilizado
    // (posible robo de sesión) se cierran todas las sesiones del usuario.
    const reused = (await client.query(
      `SELECT rt.id_usuario,u.rol FROM refresh_tokens rt JOIN usuarios u ON u.id=rt.id_usuario
       WHERE rt.token_hash=$1 AND rt.revocado=true LIMIT 1`,[tokenHash])).rows[0];
    if (reused) {
      await client.query('UPDATE refresh_tokens SET revocado=true,fecha_revocacion=now() WHERE id_usuario=$1 AND revocado=false',[reused.id_usuario]);
      await audit(client,{id:reused.id_usuario,rol:reused.rol},'REFRESH_TOKEN_REUSE_DETECTED','SEGURIDAD','Posible robo de sesión: token de refresco reutilizado tras revocación',req.ip);
    }
    return null;
  });
  if (!result) return res.status(401).json({message:'Refresh token inválido o revocado'});
  res.json(result);
});

router.post('/logout', requireAuth, async (req,res)=>{
  const {refreshToken}=req.body;
  if(refreshToken && typeof refreshToken === 'string')
    await pool.query('UPDATE refresh_tokens SET revocado=true,fecha_revocacion=now() WHERE id_usuario=$1 AND token_hash=$2 AND revocado=false',
      [req.auth.sub,hashToken(refreshToken)]);
  if(req.auth.role!=='CONSULTOR')
    await audit(pool,{id:req.auth.sub,rol:req.auth.role},'LOGOUT','AUTENTICACIÓN','Cierre de sesión',req.ip);
  res.json({ok:true});
});

router.get('/me', requireAuth, async (req,res)=>{
  const {rows}=await pool.query('SELECT id,nombre,apellido,correo,rol,estado,id_parqueadero_asignado FROM usuarios WHERE id=$1',[req.auth.sub]);
  if(!rows.length) return res.status(404).json({message:'Usuario no encontrado'});
  res.json({user:rows[0]});
});

export default router;
