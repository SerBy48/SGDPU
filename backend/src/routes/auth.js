import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool, withTransaction } from '../db.js';
import { signAccessToken, randomToken, hashToken, compareToken, randomRefreshToken, hashRefreshToken, compareRefreshToken } from '../utils/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/mailer.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

const INSTITUTIONAL_EMAIL = /^[^\s@]+@usco\.edu\.co$/i;
const VERIFICATION_TOKEN_HOURS = 24;
const RESET_TOKEN_MINUTES = 15;

function publicUser(u) {
  return {id:u.id,nombre:u.nombre,apellido:u.apellido,correo:u.correo,rol:u.rol,estado:u.estado,id_parqueadero_asignado:u.id_parqueadero_asignado};
}

router.post('/register', authLimiter, async (req,res) => {
  const {nombre,apellido,correo,contrasena} = req.body;
  if (!nombre || !apellido || !correo || !contrasena || contrasena.length < 8)
    return res.status(400).json({message:'Nombre, apellido, correo y contraseña de mínimo 8 caracteres son obligatorios'});
  const correoNorm = String(correo).toLowerCase().trim();
  if (!INSTITUTIONAL_EMAIL.test(correoNorm))
    return res.status(400).json({message:'Debe registrarse con un correo institucional @usco.edu.co'});
  try {
    const hash = await bcrypt.hash(contrasena, 10);
    const rawToken = randomToken();
    await withTransaction(async client => {
      const {rows} = await client.query(
        `INSERT INTO usuarios(nombre,apellido,correo,contrasena_hash,rol,estado,email_verificado)
         VALUES($1,$2,$3,$4,'CONSULTOR','ACTIVO',false) RETURNING *`,
        [nombre.trim(),apellido.trim(),correoNorm,hash]
      );
      const tokenHash = await hashToken(rawToken);
      await client.query(
        `INSERT INTO email_verification_tokens(id_usuario,token_hash,fecha_expiracion)
         VALUES($1,$2,now()+interval '${VERIFICATION_TOKEN_HOURS} hours')`,
        [rows[0].id, tokenHash]
      );
    });
    const link = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    await sendVerificationEmail(correoNorm, link);
    res.status(201).json({message:'Cuenta creada. Revise su correo institucional para verificar la cuenta antes de iniciar sesión.'});
  } catch(e) {
    if (e.code==='23505') return res.status(409).json({message:'El correo ya está registrado'});
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
    if (u.estado==='INACTIVO') return res.status(403).json({message:'La cuenta está inactiva'});
    if (u.locked_until && new Date(u.locked_until)>new Date()) return res.status(423).json({message:'Cuenta bloqueada temporalmente'});
    if (!u.email_verificado) return res.status(403).json({message:'Debe verificar su correo antes de iniciar sesión. Revise su bandeja de entrada.'});
    const ok=await bcrypt.compare(contrasena||'',u.contrasena_hash);
    if (!ok) {
      const attempts=u.failed_login_attempts+1;
      const locked=attempts>=5 ? new Date(Date.now()+15*60*1000) : null;
      await client.query('UPDATE usuarios SET failed_login_attempts=$1,locked_until=$2 WHERE id=$3',[locked?0:attempts,locked,u.id]);
      return res.status(401).json({message:locked?'Cuenta bloqueada por 15 minutos tras varios intentos fallidos':'Credenciales inválidas'});
    }
    await client.query('UPDATE usuarios SET failed_login_attempts=0,locked_until=NULL WHERE id=$1',[u.id]);
    const access=signAccessToken(u);
    const refresh=randomRefreshToken();
    const rh=await hashRefreshToken(refresh);
    await client.query(`INSERT INTO refresh_tokens(id_usuario,token_hash,fecha_expiracion) VALUES($1,$2,now()+interval '7 days')`,[u.id,rh]);
    if(u.rol!=='CONSULTOR') await audit(client,u,'LOGIN','AUTENTICACIÓN','Inicio de sesión',req.ip);
    res.json({accessToken:access,refreshToken:refresh,user:publicUser(u)});
  } finally { client.release(); }
});

router.post('/verify-email', async (req,res) => {
  const {token} = req.body;
  if (!token) return res.status(400).json({message:'Token requerido'});
  // Nota: evt.id y u.id se alían explícitamente porque ambas tablas tienen
  // columna "id"; sin alias, node-postgres sobrescribe con la última (u.id).
  const {rows} = await pool.query(
    `SELECT evt.id AS token_id, evt.token_hash, evt.id_usuario, u.rol
     FROM email_verification_tokens evt JOIN usuarios u ON u.id=evt.id_usuario
     WHERE evt.usado=false AND evt.fecha_expiracion>now()`
  );
  for (const row of rows) {
    if (await compareToken(token, row.token_hash)) {
      await withTransaction(async client => {
        await client.query('UPDATE usuarios SET email_verificado=true WHERE id=$1',[row.id_usuario]);
        await client.query('UPDATE email_verification_tokens SET usado=true,fecha_uso=now() WHERE id=$1',[row.token_id]);
        await audit(client,{id:row.id_usuario,rol:row.rol},'VERIFICAR_EMAIL','AUTENTICACIÓN','Correo verificado',req.ip);
      });
      return res.json({ok:true});
    }
  }
  res.status(400).json({message:'Token inválido o expirado'});
});

router.post('/forgot-password', authLimiter, async (req,res) => {
  const {correo} = req.body;
  const generic = {message:'Si el correo existe y está verificado, se envió un enlace de recuperación.'};
  const correoNorm = String(correo||'').toLowerCase().trim();
  if (!correoNorm) return res.json(generic);
  const {rows} = await pool.query('SELECT * FROM usuarios WHERE correo=$1',[correoNorm]);
  const u = rows[0];
  if (u && u.email_verificado) {
    const rawToken = randomToken();
    const tokenHash = await hashToken(rawToken);
    await pool.query(
      `INSERT INTO password_reset_tokens(id_usuario,token_hash,fecha_expiracion)
       VALUES($1,$2,now()+interval '${RESET_TOKEN_MINUTES} minutes')`,
      [u.id, tokenHash]
    );
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(correoNorm, link);
  }
  res.json(generic);
});

router.post('/reset-password', authLimiter, async (req,res) => {
  const {token,contrasena} = req.body;
  if (!token || !contrasena || contrasena.length < 8)
    return res.status(400).json({message:'Token y contraseña de mínimo 8 caracteres son obligatorios'});
  const {rows} = await pool.query(
    `SELECT prt.id AS token_id, prt.token_hash, prt.id_usuario, u.rol
     FROM password_reset_tokens prt JOIN usuarios u ON u.id=prt.id_usuario
     WHERE prt.usado=false AND prt.fecha_expiracion>now()`
  );
  for (const row of rows) {
    if (await compareToken(token, row.token_hash)) {
      const hash = await bcrypt.hash(contrasena, 10);
      await withTransaction(async client => {
        await client.query('UPDATE usuarios SET contrasena_hash=$1 WHERE id=$2',[hash,row.id_usuario]);
        await client.query('UPDATE password_reset_tokens SET usado=true,fecha_uso=now() WHERE id=$1',[row.token_id]);
        await client.query('UPDATE refresh_tokens SET revocado=true,fecha_revocacion=now() WHERE id_usuario=$1 AND revocado=false',[row.id_usuario]);
        await audit(client,{id:row.id_usuario,rol:row.rol},'RESET_PASSWORD','AUTENTICACIÓN','Restablecimiento de contraseña',req.ip);
      });
      return res.json({ok:true});
    }
  }
  res.status(400).json({message:'Token inválido o expirado'});
});

router.post('/refresh', async (req,res) => {
  const {refreshToken}=req.body;
  if(!refreshToken) return res.status(401).json({message:'Refresh token requerido'});
  // rt.id se alía explícitamente: "SELECT rt.*,u.*" con ambas tablas teniendo
  // columna "id" haría que node-postgres sobrescribiera rt.id con u.id.
  const {rows}=await pool.query(
    `SELECT rt.id AS token_id, rt.token_hash, rt.id_usuario, u.*
     FROM refresh_tokens rt JOIN usuarios u ON u.id=rt.id_usuario
     WHERE rt.revocado=false AND rt.fecha_expiracion>now()`
  );
  for (const row of rows) {
    if(await compareRefreshToken(refreshToken,row.token_hash)) {
      const next=randomRefreshToken();
      const nh=await hashRefreshToken(next);
      await withTransaction(async client=>{
        await client.query('UPDATE refresh_tokens SET revocado=true,fecha_revocacion=now() WHERE id=$1',[row.token_id]);
        await client.query(`INSERT INTO refresh_tokens(id_usuario,token_hash,fecha_expiracion) VALUES($1,$2,now()+interval '7 days')`,[row.id_usuario,nh]);
      });
      return res.json({accessToken:signAccessToken(row),refreshToken:next});
    }
  }
  // Ningún token activo coincide: revisar si es un token ya revocado siendo
  // reutilizado (posible robo de sesión) y, de ser así, cerrar todas las sesiones.
  const {rows:revoked} = await pool.query(
    `SELECT rt.id AS token_id, rt.token_hash, rt.id_usuario, u.rol
     FROM refresh_tokens rt JOIN usuarios u ON u.id=rt.id_usuario WHERE rt.revocado=true`
  );
  for (const row of revoked) {
    if (await compareRefreshToken(refreshToken, row.token_hash)) {
      await withTransaction(async client => {
        await client.query('UPDATE refresh_tokens SET revocado=true,fecha_revocacion=now() WHERE id_usuario=$1 AND revocado=false',[row.id_usuario]);
        await audit(client,{id:row.id_usuario,rol:row.rol},'REFRESH_TOKEN_REUSE_DETECTED','SEGURIDAD','Posible robo de sesión: token de refresco reutilizado tras revocación',req.ip);
      });
      break;
    }
  }
  res.status(401).json({message:'Refresh token inválido o revocado'});
});

router.post('/logout', requireAuth, async (req,res)=>{
  const {refreshToken}=req.body;
  if(refreshToken){
    const {rows}=await pool.query(`SELECT id,token_hash FROM refresh_tokens WHERE id_usuario=$1 AND revocado=false`,[req.auth.sub]);
    for(const r of rows){
      if(await compareRefreshToken(refreshToken,r.token_hash)){
        await pool.query('UPDATE refresh_tokens SET revocado=true,fecha_revocacion=now() WHERE id=$1',[r.id]);
        break;
      }
    }
  }
  if(req.auth.role!=='CONSULTOR')
    await pool.query(`INSERT INTO auditoria(id_usuario,rol_usuario,accion,modulo,descripcion_detalle,ip)
                      VALUES($1,$2,'LOGOUT','AUTENTICACIÓN','Cierre de sesión',$3)`,
                      [req.auth.sub,req.auth.role,req.ip]);
  res.json({ok:true});
});

router.get('/me', requireAuth, async (req,res)=>{
  const {rows}=await pool.query('SELECT id,nombre,apellido,correo,rol,estado,id_parqueadero_asignado FROM usuarios WHERE id=$1',[req.auth.sub]);
  if(!rows.length) return res.status(404).json({message:'Usuario no encontrado'});
  res.json({user:rows[0]});
});

export default router;
