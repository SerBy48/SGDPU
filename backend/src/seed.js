import bcrypt from 'bcryptjs';
import { pool } from './db.js';
// Estas cuentas usan contraseñas públicas (están en el README): solo para desarrollo.
if(process.env.NODE_ENV==='production'){
 console.error('npm run seed crea cuentas de demostración con contraseñas conocidas; no se ejecuta con NODE_ENV=production.');
 process.exit(1);
}
const users=[
 ['Administrador','SGDPU','admin@sgdpu.local','Admin123!','ADMIN',null],
 ['Carlos','Portero','portero@sgdpu.local','Portero123!','PORTERO',1],
 ['Laura','Consultora','consultor@sgdpu.local','Consultor123!','CONSULTOR',null]
];
for(const [nombre,apellido,correo,pwd,rol,parkingId] of users){
 const hash=await bcrypt.hash(pwd,10);
 await pool.query(`INSERT INTO usuarios(nombre,apellido,correo,contrasena_hash,rol,estado,id_parqueadero_asignado,email_verificado)
 VALUES($1,$2,$3,$4,$5,'ACTIVO',$6,true)
 ON CONFLICT(correo) DO UPDATE SET contrasena_hash=EXCLUDED.contrasena_hash,estado='ACTIVO',rol=EXCLUDED.rol,id_parqueadero_asignado=EXCLUDED.id_parqueadero_asignado,email_verificado=true`,
 [nombre,apellido,correo,hash,rol,parkingId]);
}
console.log('Usuarios de desarrollo creados/actualizados.');
await pool.end();
