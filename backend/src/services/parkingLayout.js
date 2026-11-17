// Aplica los cupos de un plano .svg (ya saneado por utils/svgPlano.js) a un
// parqueadero. Lo usan la creación de parqueaderos y el cambio de plano.
//
// Reglas del cambio de plano (permanente):
//  * Cupo nuevo en el plano            → se crea.
//  * Cupo retirado antes y que vuelve  → se reactiva.
//  * Cupo que ya no está en el plano   → se elimina si no tiene historial; si
//    lo tiene se retira (activo=false), porque movimientos/ocupaciones son
//    inmutables y lo referencian.
//  * Un cupo OCUPADO no se puede quitar ni cambiar de tipo: primero se debe
//    registrar la salida del vehículo. El cambio completo se bloquea.

async function seccionesActuales(db,parkingId){
 return (await db.query(`
  SELECT s.*,
   (o.id IS NOT NULL OR (s.habilitado AND s.cupos_disponibles=0)) ocupado,
   EXISTS(SELECT 1 FROM movimientos m WHERE m.id_seccion=s.id) con_historial
  FROM secciones s
  LEFT JOIN ocupaciones o ON o.id_seccion=s.id AND o.estado='ACTIVA'
  WHERE s.id_parqueadero=$1`,[parkingId])).rows;
}

export async function diffPlano(db,parkingId,cupos){
 const actuales=await seccionesActuales(db,parkingId);
 const porNombre=new Map(actuales.map(s=>[s.nombre,s]));
 const nuevosCodigos=new Set(cupos.map(c=>c.codigo));
 const d={nuevos:[],reactivados:[],cambianTipo:[],retirados:[],eliminados:[],bloqueos:[],sinCambio:0};
 for(const c of cupos){
  const s=porNombre.get(c.codigo);
  if(!s){d.nuevos.push(c.codigo);continue}
  if(!s.activo){d.reactivados.push(c.codigo);continue}
  if(s.tipo_vehiculo!==c.tipo){
   if(s.ocupado) d.bloqueos.push(`El cupo ${c.codigo} está ocupado y el nuevo plano lo cambia a ${c.tipo==='MOTO'?'moto':'carro'}.`);
   d.cambianTipo.push(c.codigo);
  } else d.sinCambio++;
 }
 for(const s of actuales){
  if(!s.activo||nuevosCodigos.has(s.nombre)) continue;
  if(s.ocupado) d.bloqueos.push(`El cupo ${s.nombre} está ocupado y no existe en el nuevo plano.`);
  (s.con_historial?d.retirados:d.eliminados).push(s.nombre);
 }
 const antes=actuales.filter(s=>s.activo).length;
 d.capacidadAntes=antes; d.capacidadDespues=cupos.length;
 return d;
}

export async function aplicarPlano(client,parkingId,plano,{usuarioId,motivo}){
 const d=await diffPlano(client,parkingId,plano.cupos);
 if(d.bloqueos.length) throw Object.assign(new Error('No es posible aplicar el plano: hay cupos ocupados afectados. Registre su salida primero.'),{status:409,errores:d.bloqueos});
 const porCodigo=new Map(plano.cupos.map(c=>[c.codigo,c]));
 for(const codigo of d.nuevos){
  const c=porCodigo.get(codigo);
  await client.query(`INSERT INTO secciones(nombre,descripcion,capacidad,cupos_disponibles,tipo_vehiculo,es_preferencial,id_parqueadero)
   VALUES($1,'Cupo del plano',1,1,$2,$3,$4)`,[codigo,c.tipo,c.preferencial,parkingId]);
 }
 for(const codigo of d.reactivados){
  const c=porCodigo.get(codigo);
  await client.query(`UPDATE secciones SET activo=true,habilitado=true,cupos_disponibles=1,tipo_vehiculo=$1,es_preferencial=$2,
   motivo_inhabilitacion=NULL,inhabilitado_desde=NULL,inhabilitado_hasta=NULL WHERE id_parqueadero=$3 AND nombre=$4`,[c.tipo,c.preferencial,parkingId,codigo]);
 }
 // Cupos que siguen: se actualiza tipo y marca preferencial (su estado se conserva).
 for(const c of plano.cupos){
  if(d.nuevos.includes(c.codigo)||d.reactivados.includes(c.codigo)) continue;
  await client.query('UPDATE secciones SET tipo_vehiculo=$1,es_preferencial=$2 WHERE id_parqueadero=$3 AND nombre=$4 AND activo',[c.tipo,c.preferencial,parkingId,c.codigo]);
 }
 if(d.retirados.length)
  await client.query(`UPDATE secciones SET activo=false,cupos_disponibles=0,habilitado=true,motivo_inhabilitacion=NULL,inhabilitado_desde=NULL,inhabilitado_hasta=NULL
   WHERE id_parqueadero=$1 AND nombre=ANY($2)`,[parkingId,d.retirados]);
 if(d.eliminados.length)
  await client.query('DELETE FROM secciones WHERE id_parqueadero=$1 AND nombre=ANY($2)',[parkingId,d.eliminados]);

 await client.query('UPDATE planos_parqueadero SET activo=false WHERE id_parqueadero=$1',[parkingId]);
 await client.query(`INSERT INTO planos_parqueadero(id_parqueadero,archivo_svg,activo,sha256,id_usuario_carga,motivo,resumen)
  VALUES($1,$2,true,$3,$4,$5,$6)`,[parkingId,plano.svg,plano.sha256,usuarioId,motivo,JSON.stringify({...plano.resumen,cambios:{nuevos:d.nuevos.length,reactivados:d.reactivados.length,cambianTipo:d.cambianTipo.length,retirados:d.retirados.length,eliminados:d.eliminados.length}})]);
 await recalcularCupos(client,parkingId);
 return d;
}

// capacidad_total = cupos activos del plano; cupos_disponibles = libres y habilitados.
export async function recalcularCupos(client,parkingId){
 await client.query(`UPDATE parqueaderos p SET
   capacidad_total=t.total,cupos_disponibles=t.libres
  FROM (SELECT COUNT(*)::int total,COALESCE(SUM(cupos_disponibles),0)::int libres FROM secciones WHERE id_parqueadero=$1 AND activo) t
  WHERE p.id=$1`,[parkingId]);
}
