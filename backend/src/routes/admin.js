import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { movementRows } from '../utils/movements.js';
import { sanitizePlano } from '../utils/svgPlano.js';
import { aplicarPlano, diffPlano, recalcularCupos } from '../services/parkingLayout.js';
import { snapshot } from './parking.js';
import { io } from '../server.js';

// La tabla pagina en el cliente; más allá de este tope se deben acotar los filtros.
const MOVEMENTS_LIMIT=1000;

const router=Router();
router.use(requireAuth,requireRole('ADMIN'));

router.get('/dashboard', async (_req,res)=>{
  const [u,p,m,i]=await Promise.all([
    pool.query(`SELECT COUNT(*) FILTER(WHERE rol='PORTERO')::int porteros, COUNT(*) FILTER(WHERE rol='CONSULTOR')::int consultores FROM usuarios WHERE estado='ACTIVO'`),
    pool.query(`SELECT COUNT(*)::int parqueaderos,COALESCE(SUM(capacidad_total),0)::int capacidad,COALESCE(SUM(cupos_disponibles),0)::int disponibles FROM parqueaderos WHERE estado='ACTIVO'`),
    pool.query(`SELECT COUNT(*)::int movimientos FROM movimientos WHERE fecha_hora>=current_date`),
    pool.query(`SELECT COUNT(*)::int incidencias FROM incidencias WHERE estado='ACTIVA'`)
  ]);
  res.json({users:u.rows[0],parking:p.rows[0],today:m.rows[0],incidents:i.rows[0]});
});

router.get('/porteros', async (_req,res)=>{
  const {rows}=await pool.query(`
    SELECT u.id,u.nombre,u.apellido,u.correo,u.estado,u.id_parqueadero_asignado,p.nombre parqueadero
    FROM usuarios u LEFT JOIN parqueaderos p ON p.id=u.id_parqueadero_asignado
    WHERE u.rol='PORTERO' ORDER BY u.id DESC`);
  res.json(rows);
});

router.post('/porteros', async (req,res)=>{
  const {nombre,apellido,correo,contrasena,id_parqueadero_asignado}=req.body;
  if(!nombre||!apellido||!correo||!contrasena||!id_parqueadero_asignado) return res.status(400).json({message:'Complete todos los campos'});
  try {
    const hash=await bcrypt.hash(contrasena,10);
    const result=await withTransaction(async client=>{
      const r=await client.query(`INSERT INTO usuarios(nombre,apellido,correo,contrasena_hash,rol,estado,id_parqueadero_asignado)
        VALUES($1,$2,$3,$4,'PORTERO','ACTIVO',$5) RETURNING id,nombre,apellido,correo,rol,estado,id_parqueadero_asignado`,
        [nombre,apellido,correo.toLowerCase(),hash,id_parqueadero_asignado]);
      const u=(await client.query('SELECT * FROM usuarios WHERE id=$1',[req.auth.sub])).rows[0];
      await audit(client,u,'CREAR_PORTERO','ADMINISTRACIÓN',`Creó al portero ${correo}`,req.ip);
      return r.rows[0];
    });
    res.status(201).json(result);
  } catch(e){res.status(e.code==='23505'?409:500).json({message:e.code==='23505'?'Correo ya registrado':'No fue posible crear el portero'});}
});

router.patch('/porteros/:id/status', async (req,res)=>{
  const {estado}=req.body;
  if(!['ACTIVO','INACTIVO'].includes(estado)) return res.status(400).json({message:'Estado inválido'});
  const result=await withTransaction(async client=>{
    const r=await client.query(`UPDATE usuarios SET estado=$1 WHERE id=$2 AND rol='PORTERO'
      RETURNING id,nombre,apellido,correo,rol,estado,id_parqueadero_asignado`,[estado,req.params.id]);
    if(!r.rowCount) throw Object.assign(new Error('Portero no encontrado'),{status:404});
    if(estado==='INACTIVO') await client.query('UPDATE refresh_tokens SET revocado=true,fecha_revocacion=now() WHERE id_usuario=$1',[req.params.id]);
    const u=(await client.query('SELECT * FROM usuarios WHERE id=$1',[req.auth.sub])).rows[0];
    await audit(client,u,estado==='ACTIVO'?'ACTIVAR_PORTERO':'DESACTIVAR_PORTERO','ADMINISTRACIÓN',`Estado ${estado} para usuario ${req.params.id}`,req.ip);
    return r.rows[0];
  });
  res.json(result);
});

router.patch('/porteros/:id/reassign', async (req,res)=>{
  const {id_parqueadero_asignado}=req.body;
  if(!id_parqueadero_asignado) return res.status(400).json({message:'Seleccione un parqueadero'});
  try {
    const result=await withTransaction(async client=>{
      const p=(await client.query('SELECT id,nombre FROM parqueaderos WHERE id=$1',[id_parqueadero_asignado])).rows[0];
      if(!p) throw Object.assign(new Error('Parqueadero no encontrado'),{status:404});
      const r=await client.query(`UPDATE usuarios SET id_parqueadero_asignado=$1 WHERE id=$2 AND rol='PORTERO'
        RETURNING id,nombre,apellido,correo,rol,estado,id_parqueadero_asignado`,[id_parqueadero_asignado,req.params.id]);
      if(!r.rowCount) throw Object.assign(new Error('Portero no encontrado'),{status:404});
      const u=(await client.query('SELECT * FROM usuarios WHERE id=$1',[req.auth.sub])).rows[0];
      await audit(client,u,'REASIGNAR_PORTERO','ADMINISTRACIÓN',`Reasignó al portero ${req.params.id} al parqueadero ${p.nombre}`,req.ip);
      return r.rows[0];
    });
    res.json(result);
  } catch(e){res.status(e.status||500).json({message:e.message||'No fue posible reasignar el portero'});}
});

router.delete('/porteros/:id', async (req,res)=>{
  try {
    const result=await withTransaction(async client=>{
      const p=(await client.query(`SELECT * FROM usuarios WHERE id=$1 AND rol='PORTERO' FOR UPDATE`,[req.params.id])).rows[0];
      if(!p) throw Object.assign(new Error('Portero no encontrado'),{status:404});
      const hist=(await client.query('SELECT 1 FROM movimientos WHERE id_usuario=$1 LIMIT 1',[p.id])).rowCount;
      if(hist) throw Object.assign(new Error('No es posible eliminar este portero: tiene movimientos históricos registrados (son inmutables). Desactívelo en su lugar.'),{status:409});
      const inc=(await client.query('SELECT 1 FROM incidencias WHERE id_usuario=$1 LIMIT 1',[p.id])).rowCount;
      if(inc) throw Object.assign(new Error('No es posible eliminar este portero: tiene incidencias registradas. Desactívelo en su lugar.'),{status:409});
      await client.query('DELETE FROM refresh_tokens WHERE id_usuario=$1',[p.id]);
      await client.query('DELETE FROM usuarios WHERE id=$1',[p.id]);
      const u=(await client.query('SELECT * FROM usuarios WHERE id=$1',[req.auth.sub])).rows[0];
      await audit(client,u,'ELIMINAR_PORTERO','ADMINISTRACIÓN',`Eliminó al portero ${p.correo}`,req.ip);
      return {ok:true};
    });
    res.json(result);
  } catch(e){res.status(e.status||500).json({message:e.message||'No fue posible eliminar el portero'});}
});

router.get('/auditoria', async (req,res)=>{
  const {usuario,accion,desde,hasta,rol,year,month}=req.query;
  const params=[]; const where=[];
  if(usuario){params.push(`%${usuario}%`);where.push(`(u.correo ILIKE $${params.length} OR u.nombre ILIKE $${params.length})`);}
  if(accion){params.push(`%${accion}%`);where.push(`a.accion ILIKE $${params.length}`);}
  if(rol){params.push(rol);where.push(`a.rol_usuario=$${params.length}`);}
  if(desde){params.push(desde);where.push(`a.fecha_hora >= $${params.length}`);}
  if(hasta){params.push(hasta);where.push(`a.fecha_hora < ($${params.length}::date + interval '1 day')`);}
  if(year){params.push(Number(year));where.push(`EXTRACT(YEAR FROM a.fecha_hora)=$${params.length}`);}
  if(month){params.push(Number(month));where.push(`EXTRACT(MONTH FROM a.fecha_hora)=$${params.length}`);}
  const q=`SELECT a.*,COALESCE(u.nombre||' '||u.apellido,'Sistema') usuario
           FROM auditoria a LEFT JOIN usuarios u ON u.id=a.id_usuario
           ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY a.fecha_hora DESC LIMIT 500`;
  const {rows}=await pool.query(q,params);res.json(rows);
});

router.get('/movements', async (req,res)=>{
  res.json(await movementRows(pool,req.query,{limit:MOVEMENTS_LIMIT}));
});

router.get('/parkings', async (_req,res)=>{
  const {rows}=await pool.query(`
    SELECT p.*,s.nombre sede,
      COUNT(sec.id) FILTER(WHERE sec.tipo_vehiculo='CARRO')::int espacios_carro,
      COUNT(sec.id) FILTER(WHERE sec.tipo_vehiculo='MOTO')::int espacios_moto,
      COUNT(sec.id) FILTER(WHERE NOT sec.habilitado)::int inhabilitados,
      EXISTS(SELECT 1 FROM planos_parqueadero pl WHERE pl.id_parqueadero=p.id AND pl.activo) tiene_plano
    FROM parqueaderos p JOIN sedes s ON s.id=p.id_sede
    LEFT JOIN secciones sec ON sec.id_parqueadero=p.id AND sec.activo
    GROUP BY p.id,s.nombre ORDER BY p.id DESC`);
  res.json(rows);
});

// Motivos aceptados para modificar los cupos de un parqueadero existente.
const MOTIVOS_TEMPORALES={MANTENIMIENTO:'Mantenimiento',OBRA:'Obra o reparación',EVENTO:'Evento institucional',SEGURIDAD:'Seguridad',SENALIZACION:'Demarcación o señalización',OTRO:'Otro'};
const MOTIVOS_PLANO={AMPLIACION:'Ampliación del parqueadero',REDUCCION:'Reducción del parqueadero',REDISTRIBUCION:'Redistribución de cupos (carro/moto)',CORRECCION:'Corrección del plano',OTRO:'Otro'};
const MIN_DETALLE=10;
function motivoTexto(catalogo,motivo,detalle){
  if(!catalogo[motivo]) throw Object.assign(new Error('Seleccione el motivo del cambio'),{status:400});
  const d=String(detalle||'').trim();
  if(d.length<MIN_DETALLE) throw Object.assign(new Error(`Describa el motivo con al menos ${MIN_DETALLE} caracteres`),{status:400});
  if(d.length>500) throw Object.assign(new Error('La descripción del motivo no puede superar 500 caracteres'),{status:400});
  return `${catalogo[motivo]}: ${d}`;
}
function datosBasicos(body){
  const nombre=String(body.nombre||'').trim(), ubicacion=String(body.ubicacion||'').trim(), id_sede=body.id_sede;
  if(!nombre||!ubicacion||!id_sede) throw Object.assign(new Error('Complete nombre, ubicación y sede'),{status:400});
  if(nombre.length>120) throw Object.assign(new Error('El nombre no puede superar 120 caracteres'),{status:400});
  return {nombre,ubicacion,id_sede};
}
const fail=(res,e,fallback)=>res.status(e.status||500).json({message:e.status?e.message:fallback,errores:e.errores});
const actor=async (client,id)=>(await client.query('SELECT * FROM usuarios WHERE id=$1',[id])).rows[0];
const emitir=async parkingId=>io.emit('parking:update',{parkingId:Number(parkingId),parking:await snapshot(parkingId)});

// Revisión previa: valida y sanea el .svg sin guardar nada. El cliente
// muestra la vista previa saneada y el informe; al confirmar reenvía el
// archivo original, que el servidor vuelve a sanear (no confía en el cliente).
router.post('/planos/validar', async (req,res)=>{
  try {
    const plano=sanitizePlano(req.body.svg);
    const parkingId=Number(req.body.id_parqueadero)||null;
    const cambios=parkingId?await diffPlano(pool,parkingId,plano.cupos):null;
    res.json({svg:plano.svg,cupos:plano.cupos,resumen:plano.resumen,advertencias:plano.advertencias,cambios});
  } catch(e){fail(res,e,'No fue posible revisar el plano');}
});

router.post('/parkings', async (req,res)=>{
  try {
    const {nombre,ubicacion,id_sede}=datosBasicos(req.body);
    const plano=sanitizePlano(req.body.svg);
    const result=await withTransaction(async client=>{
      const p=(await client.query(`INSERT INTO parqueaderos(nombre,ubicacion,capacidad_total,cupos_disponibles,estado,id_sede)
        VALUES($1,$2,$3,$3,'ACTIVO',$4) RETURNING *`,[nombre,ubicacion,plano.cupos.length,id_sede])).rows[0];
      await aplicarPlano(client,p.id,plano,{usuarioId:req.auth.sub,motivo:'Plano inicial del parqueadero'});
      const {carros,motos,preferenciales}=plano.resumen;
      await audit(client,await actor(client,req.auth.sub),'CREAR_PARQUEADERO','ADMINISTRACIÓN',
        `Creó el parqueadero ${nombre} con plano (${carros} carro / ${motos} moto / ${preferenciales} preferenciales, sha256 ${plano.sha256.slice(0,12)})`,req.ip);
      return p;
    });
    res.status(201).json(result);
  } catch(e){fail(res,e,'No fue posible crear el parqueadero');}
});

router.patch('/parkings/:id/status', async (req,res)=>{
  const {estado}=req.body;
  if(!['ACTIVO','INACTIVO'].includes(estado)) return res.status(400).json({message:'Estado inválido'});
  const result=await withTransaction(async client=>{
    const r=await client.query('UPDATE parqueaderos SET estado=$1 WHERE id=$2 RETURNING *',[estado,req.params.id]);
    if(!r.rowCount) throw Object.assign(new Error('Parqueadero no encontrado'),{status:404});
    const u=(await client.query('SELECT * FROM usuarios WHERE id=$1',[req.auth.sub])).rows[0];
    await audit(client,u,estado==='ACTIVO'?'ACTIVAR_PARQUEADERO':'DESACTIVAR_PARQUEADERO','ADMINISTRACIÓN',`Estado ${estado} para parqueadero ${req.params.id}`,req.ip);
    return r.rows[0];
  });
  res.json(result);
});

// Solo datos generales. La cantidad de cupos se modifica únicamente con
// motivo, por inhabilitación temporal o por cambio de plano (rutas de abajo).
router.patch('/parkings/:id', async (req,res)=>{
  try {
    const {nombre,ubicacion,id_sede}=datosBasicos(req.body);
    const result=await withTransaction(async client=>{
      const r=await client.query('UPDATE parqueaderos SET nombre=$1,ubicacion=$2,id_sede=$3 WHERE id=$4 RETURNING *',[nombre,ubicacion,id_sede,req.params.id]);
      if(!r.rowCount) throw Object.assign(new Error('Parqueadero no encontrado'),{status:404});
      await audit(client,await actor(client,req.auth.sub),'EDITAR_PARQUEADERO','ADMINISTRACIÓN',`Editó los datos generales del parqueadero ${nombre}`,req.ip);
      return r.rows[0];
    });
    await emitir(req.params.id);
    res.json(result);
  } catch(e){fail(res,e,'No fue posible editar el parqueadero');}
});

router.put('/parkings/:id/plano', async (req,res)=>{
  try {
    const motivo=motivoTexto(MOTIVOS_PLANO,req.body.motivo,req.body.detalle);
    const plano=sanitizePlano(req.body.svg);
    const result=await withTransaction(async client=>{
      const p=(await client.query('SELECT * FROM parqueaderos WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      if(!p) throw Object.assign(new Error('Parqueadero no encontrado'),{status:404});
      const d=await aplicarPlano(client,p.id,plano,{usuarioId:req.auth.sub,motivo});
      await audit(client,await actor(client,req.auth.sub),'CAMBIAR_PLANO_PARQUEADERO','ADMINISTRACIÓN',
        `Cambió el plano de ${p.nombre} (${d.capacidadAntes} → ${d.capacidadDespues} cupos; +${d.nuevos.length+d.reactivados.length} / -${d.retirados.length+d.eliminados.length} / ${d.cambianTipo.length} cambian de tipo). Motivo: ${motivo}`,req.ip);
      return d;
    });
    await emitir(req.params.id);
    res.json(result);
  } catch(e){fail(res,e,'No fue posible aplicar el nuevo plano');}
});

router.post('/parkings/:id/cupos/inhabilitar', async (req,res)=>{
  try {
    const motivo=motivoTexto(MOTIVOS_TEMPORALES,req.body.motivo,req.body.detalle);
    const ids=[...new Set((req.body.ids||[]).map(Number).filter(Number.isInteger))];
    if(!ids.length) throw Object.assign(new Error('Seleccione en el plano los cupos a inhabilitar'),{status:400});
    const hasta=req.body.hasta||null;
    if(hasta&&(!/^\d{4}-\d{2}-\d{2}$/.test(hasta)||hasta<new Date().toISOString().slice(0,10)))
      throw Object.assign(new Error('La fecha estimada de rehabilitación debe ser hoy o posterior'),{status:400});
    const result=await withTransaction(async client=>{
      const p=(await client.query('SELECT * FROM parqueaderos WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      if(!p) throw Object.assign(new Error('Parqueadero no encontrado'),{status:404});
      const secs=(await client.query(`SELECT s.*,(o.id IS NOT NULL OR s.cupos_disponibles=0) ocupado FROM secciones s
        LEFT JOIN ocupaciones o ON o.id_seccion=s.id AND o.estado='ACTIVA'
        WHERE s.id=ANY($1) AND s.id_parqueadero=$2 AND s.activo AND s.habilitado FOR UPDATE OF s`,[ids,p.id])).rows;
      if(secs.length!==ids.length) throw Object.assign(new Error('Algunos cupos seleccionados no existen o ya están inhabilitados'),{status:409});
      const ocupados=secs.filter(s=>s.ocupado).map(s=>s.nombre);
      if(ocupados.length) throw Object.assign(new Error(`No se pueden inhabilitar cupos ocupados (${ocupados.join(', ')}). Registre primero la salida.`),{status:409});
      await client.query(`UPDATE secciones SET habilitado=false,cupos_disponibles=0,motivo_inhabilitacion=$1,inhabilitado_desde=now(),inhabilitado_hasta=$2 WHERE id=ANY($3)`,[motivo,hasta,ids]);
      await recalcularCupos(client,p.id);
      const nombres=secs.map(s=>s.nombre).sort();
      await audit(client,await actor(client,req.auth.sub),'INHABILITAR_CUPOS','CUPOS',
        `Inhabilitó ${nombres.length} cupo(s) de ${p.nombre}: ${nombres.join(', ')}${hasta?` hasta ${hasta}`:''}. Motivo: ${motivo}`,req.ip);
      return {inhabilitados:nombres};
    });
    await emitir(req.params.id);
    res.json(result);
  } catch(e){fail(res,e,'No fue posible inhabilitar los cupos');}
});

router.post('/parkings/:id/cupos/rehabilitar', async (req,res)=>{
  try {
    const ids=[...new Set((req.body.ids||[]).map(Number).filter(Number.isInteger))];
    if(!ids.length) throw Object.assign(new Error('Seleccione los cupos a rehabilitar'),{status:400});
    const result=await withTransaction(async client=>{
      const p=(await client.query('SELECT * FROM parqueaderos WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      if(!p) throw Object.assign(new Error('Parqueadero no encontrado'),{status:404});
      const r=await client.query(`UPDATE secciones SET habilitado=true,cupos_disponibles=1,motivo_inhabilitacion=NULL,inhabilitado_desde=NULL,inhabilitado_hasta=NULL
        WHERE id=ANY($1) AND id_parqueadero=$2 AND activo AND NOT habilitado RETURNING nombre`,[ids,p.id]);
      if(!r.rowCount) throw Object.assign(new Error('Los cupos seleccionados no están inhabilitados'),{status:409});
      await recalcularCupos(client,p.id);
      const nombres=r.rows.map(x=>x.nombre).sort();
      await audit(client,await actor(client,req.auth.sub),'REHABILITAR_CUPOS','CUPOS',`Rehabilitó ${nombres.length} cupo(s) de ${p.nombre}: ${nombres.join(', ')}`,req.ip);
      return {rehabilitados:nombres};
    });
    await emitir(req.params.id);
    res.json(result);
  } catch(e){fail(res,e,'No fue posible rehabilitar los cupos');}
});

router.delete('/parkings/:id', async (req,res)=>{
  try {
    const result=await withTransaction(async client=>{
      const p=(await client.query('SELECT * FROM parqueaderos WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      if(!p) throw Object.assign(new Error('Parqueadero no encontrado'),{status:404});
      const hist=(await client.query('SELECT 1 FROM movimientos WHERE id_parqueadero=$1 LIMIT 1',[p.id])).rowCount;
      if(hist) throw Object.assign(new Error('No es posible eliminar este parqueadero: tiene historial de movimientos (los registros históricos son inmutables). Desactívelo en su lugar.'),{status:409});
      const inc=(await client.query('SELECT 1 FROM incidencias WHERE id_parqueadero=$1 LIMIT 1',[p.id])).rowCount;
      if(inc) throw Object.assign(new Error('No es posible eliminar este parqueadero: tiene incidencias registradas. Desactívelo en su lugar.'),{status:409});
      await client.query('UPDATE usuarios SET id_parqueadero_asignado=NULL WHERE id_parqueadero_asignado=$1',[p.id]);
      await client.query('DELETE FROM secciones WHERE id_parqueadero=$1',[p.id]);
      await client.query('DELETE FROM parqueaderos WHERE id=$1',[p.id]);
      const u=(await client.query('SELECT * FROM usuarios WHERE id=$1',[req.auth.sub])).rows[0];
      await audit(client,u,'ELIMINAR_PARQUEADERO','ADMINISTRACIÓN',`Eliminó el parqueadero ${p.nombre}`,req.ip);
      return {ok:true};
    });
    res.json(result);
  } catch(e){res.status(e.status||500).json({message:e.message||'No fue posible eliminar el parqueadero'});}
});

router.get('/sedes', async (_req,res)=>res.json((await pool.query('SELECT * FROM sedes ORDER BY nombre')).rows));

export default router;
