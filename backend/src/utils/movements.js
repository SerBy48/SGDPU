// Filtros y consulta del historial de movimientos, compartidos por la tabla
// (/admin/movements) y las exportaciones (/reports/excel, /reports/pdf) para
// que lo exportado sea exactamente lo que el administrador ve en pantalla.
//
// Las fechas se comparan en hora de Neiva/Bogotá (el servidor de PostgreSQL
// corre en UTC; ver reports.js), de lo contrario un movimiento nocturno
// quedaría en el día/mes siguiente.
export const TZ='America/Bogota';
export const LOCAL=`(m.fecha_hora AT TIME ZONE '${TZ}')`;

const TIPOS_MOV=['ENTRADA','SALIDA'];
const TIPOS_VEHICULO=['CARRO','MOTO'];
const TIPOS_PERSONA=['ESTUDIANTE','ADMINISTRATIVO','DOCENTE'];
const isDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
const isId=v=>/^\d+$/.test(String(v||''));

export function movementFilters(query){
 const {desde,hasta,parking,user,year,month,tipo,vehiculo,persona,q}=query;
 const params=[]; const where=[];
 const add=(sql,val)=>{params.push(val);where.push(sql.replace('?',`$${params.length}`));};
 if(isDate(desde)) add(`${LOCAL}::date >= ?::date`,desde);
 if(isDate(hasta)) add(`${LOCAL}::date <= ?::date`,hasta);
 if(isId(parking)) add('m.id_parqueadero=?',parking);
 if(isId(user)) add('m.id_usuario=?',user);
 if(Number(year)) add(`EXTRACT(YEAR FROM ${LOCAL})=?`,Number(year));
 if(Number(month)) add(`EXTRACT(MONTH FROM ${LOCAL})=?`,Number(month));
 if(TIPOS_MOV.includes(tipo)) add('m.tipo=?',tipo);
 // Vehículo/persona salen de la ocupación asociada (la de entrada o la que
 // cerró la salida); si la ocupación no existe se usa el tipo del cupo.
 if(TIPOS_VEHICULO.includes(vehiculo)) add('COALESCE(o.tipo_vehiculo,s.tipo_vehiculo)=?',vehiculo);
 if(TIPOS_PERSONA.includes(persona)) add('o.tipo_persona=?',persona);
 const term=String(q||'').trim().slice(0,80);
 if(term){
  params.push(`%${term.replace(/[\\%_]/g,c=>'\\'+c)}%`);
  const n=`$${params.length}`;
  where.push(`(o.placa ILIKE ${n} OR o.nombre_ocupante ILIKE ${n} OR o.codigo_carne ILIKE ${n} OR s.nombre ILIKE ${n})`);
 }
 return {params,where:where.length?'WHERE '+where.join(' AND '):''};
}

export async function movementRows(db,query,{limit}={}){
 const {params,where}=movementFilters(query);
 const sql=`SELECT m.id,m.tipo,m.fecha_hora,m.id_parqueadero,m.id_usuario,m.observacion,
   p.nombre parqueadero,s.nombre seccion,u.nombre||' '||u.apellido portero,u.correo,
   o.nombre_ocupante,o.codigo_carne,o.tipo_persona,o.placa,
   COALESCE(o.tipo_vehiculo,s.tipo_vehiculo) tipo_vehiculo
   FROM movimientos m JOIN parqueaderos p ON p.id=m.id_parqueadero
   LEFT JOIN secciones s ON s.id=m.id_seccion JOIN usuarios u ON u.id=m.id_usuario
   LEFT JOIN ocupaciones o ON o.id_movimiento_entrada=m.id OR o.id_movimiento_salida=m.id
   ${where} ORDER BY m.fecha_hora DESC${limit?` LIMIT ${Number(limit)}`:''}`;
 return (await db.query(sql,params)).rows;
}
