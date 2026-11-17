import { Router } from '../utils/router.js';
import { pool, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { io } from '../server.js';
import { isAlphabeticName, isNumericCode, plateError, toTitleCase } from '../utils/text.js';

const router=Router();
const TIPOS_PERSONA=['ESTUDIANTE','ADMINISTRATIVO','DOCENTE'];
const TIPOS_VEHICULO=['CARRO','MOTO'];

export async function snapshot(id, db=pool) {
  // 'ocupada'/'tipo_vehiculo_actual' son seguros para todos los roles (incluido
  // CONSULTOR) y para la difusión por Socket.IO; la identidad del ocupante
  // (nombre/carné/placa) solo se expone vía /api/occupations, con control de rol.
  // Nota: dentro de una transacción se debe pasar el `client` (no `pool`), de lo
  // contrario esta consulta corre en otra conexión y no ve los cambios aún sin
  // COMMIT (lectura de datos previos a la transacción en curso).
  // plano_svg es nulo cuando el parqueadero no tiene un plano interactivo
  // configurado; el frontend usa la cuadrícula simple de siempre como
  // respaldo en ese caso. El plano guarda cada cupo como <polygon
  // data-codigo="..."> y el frontend lo colorea en vivo haciendo coincidir
  // data-codigo con secciones.nombre (ya no se usa coordenadas_seccion).
  const p=await db.query(`
    SELECT p.*,s.nombre sede,pl.archivo_svg plano_svg,
      COALESCE(json_agg(json_build_object(
        'id',sec.id,'nombre',sec.nombre,'descripcion',sec.descripcion,
        'capacidad',sec.capacidad,'cupos_disponibles',sec.cupos_disponibles,
        'tipo_vehiculo',sec.tipo_vehiculo,'es_preferencial',sec.es_preferencial,
        'habilitado',sec.habilitado,'motivo_inhabilitacion',sec.motivo_inhabilitacion,
        'inhabilitado_desde',sec.inhabilitado_desde,'inhabilitado_hasta',sec.inhabilitado_hasta,
        'ocupada',(o.id IS NOT NULL),
        'tipo_vehiculo_actual',o.tipo_vehiculo
      ) ORDER BY sec.id) FILTER(WHERE sec.id IS NOT NULL),'[]') secciones
    FROM parqueaderos p JOIN sedes s ON s.id=p.id_sede
    LEFT JOIN secciones sec ON sec.id_parqueadero=p.id AND sec.activo
    LEFT JOIN ocupaciones o ON o.id_seccion=sec.id AND o.estado='ACTIVA'
    LEFT JOIN planos_parqueadero pl ON pl.id_parqueadero=p.id AND pl.activo=true
    WHERE p.id=$1 GROUP BY p.id,s.nombre,pl.archivo_svg`,[id]);
  return p.rows[0];
}

router.get('/active', requireAuth, async (_req,res)=>{
  // Los cupos inhabilitados temporalmente no cuentan como ocupados: el
  // porcentaje de ocupación se calcula sobre los cupos operativos.
  const {rows}=await pool.query(`
    SELECT p.id,p.nombre,p.ubicacion,p.capacidad_total,p.cupos_disponibles,p.estado,s.nombre sede,
      c.espacios_carro,c.espacios_moto,c.inhabilitados,
      ROUND(100.0*(p.capacidad_total-p.cupos_disponibles-c.inhabilitados)/NULLIF(p.capacidad_total-c.inhabilitados,0),1) ocupacion
    FROM parqueaderos p JOIN sedes s ON s.id=p.id_sede
    CROSS JOIN LATERAL (SELECT
      COUNT(*) FILTER(WHERE sec.tipo_vehiculo='CARRO')::int espacios_carro,
      COUNT(*) FILTER(WHERE sec.tipo_vehiculo='MOTO')::int espacios_moto,
      COUNT(*) FILTER(WHERE NOT sec.habilitado)::int inhabilitados
      FROM secciones sec WHERE sec.id_parqueadero=p.id AND sec.activo) c
    WHERE p.estado='ACTIVO' ORDER BY p.id`);
  res.json(rows);
});

router.get('/:id', requireAuth, async (req,res)=>{
  if(!/^\d+$/.test(req.params.id)) return res.status(400).json({message:'Parqueadero inválido'});
  const p=await snapshot(req.params.id);
  if(!p) return res.status(404).json({message:'Parqueadero no encontrado'});
  res.json(p);
});

router.post('/:id/movement', requireAuth, requireRole('PORTERO'), async (req,res)=>{
  const {sectionId,type,observacion}=req.body;
  if(!['ENTRADA','SALIDA'].includes(type)) return res.status(400).json({message:'Tipo inválido'});
  const nombreOcupante=toTitleCase(String(req.body.nombreOcupante||'').trim().replace(/\s+/g,' '));
  const codigoCarne=String(req.body.codigoCarne||'').trim();
  const placa=String(req.body.placa||'').trim().toUpperCase();
  const tipoPersona=TIPOS_PERSONA.includes(req.body.tipoPersona) ? req.body.tipoPersona : 'ESTUDIANTE';
  const tipoVehiculo=req.body.tipoVehiculo;
  if(type==='ENTRADA') {
    if(!nombreOcupante || !placa) return res.status(400).json({message:'Nombre y placa del ocupante son obligatorios'});
    if(!isAlphabeticName(nombreOcupante)) return res.status(400).json({message:'El nombre solo puede contener letras y espacios'});
    if(tipoPersona==='ESTUDIANTE' && !codigoCarne) return res.status(400).json({message:'El código de carné es obligatorio para estudiantes'});
    if(codigoCarne && !isNumericCode(codigoCarne)) return res.status(400).json({message:'El código de carné solo puede contener números'});
    if(!TIPOS_VEHICULO.includes(tipoVehiculo)) return res.status(400).json({message:'Tipo de vehículo inválido'});
    const errPlaca=plateError(placa,tipoVehiculo);
    if(errPlaca) return res.status(400).json({message:errPlaca});
  }
  if(nombreOcupante.length>160 || codigoCarne.length>40 || placa.length>20)
    return res.status(400).json({message:'Alguno de los datos del ocupante excede la longitud permitida'});
  if(!/^\d+$/.test(String(sectionId??'')) || !/^\d+$/.test(req.params.id))
    return res.status(400).json({message:'Cupo o parqueadero inválido'});
  if(observacion!=null && (typeof observacion!=='string' || observacion.length>500))
    return res.status(400).json({message:'La observación no puede superar 500 caracteres'});
  try {
    const result=await withTransaction(async client=>{
      const u=(await client.query('SELECT * FROM usuarios WHERE id=$1 FOR UPDATE',[req.auth.sub])).rows[0];
      if(!u?.id_parqueadero_asignado) throw Object.assign(new Error('Portero sin parqueadero asignado'),{status:403});
      if(Number(req.params.id)!==Number(u.id_parqueadero_asignado)) throw Object.assign(new Error('No puede operar este parqueadero'),{status:403});
      const p=(await client.query('SELECT * FROM parqueaderos WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      if(!p || p.estado!=='ACTIVO') throw Object.assign(new Error('Parqueadero no disponible'),{status:409});
      const sec=(await client.query('SELECT * FROM secciones WHERE id=$1 AND id_parqueadero=$2 AND activo FOR UPDATE',[sectionId,req.params.id])).rows[0];
      if(!sec) throw Object.assign(new Error('Cupo/sección no encontrado'),{status:404});
      if(!sec.habilitado)
        throw Object.assign(new Error(`El cupo ${sec.nombre} está inhabilitado temporalmente${sec.motivo_inhabilitacion?`: ${sec.motivo_inhabilitacion}`:''}`),{status:409});
      // Cada cupo es exclusivo de carro o de moto (P1 Central solo carros, P2
      // solo motos, P3/P4 mixtos por zona): no se acepta un vehículo distinto
      // al tipo del cupo aunque el cliente envíe otro valor.
      if(type==='ENTRADA' && tipoVehiculo!==sec.tipo_vehiculo)
        throw Object.assign(new Error(`El cupo ${sec.nombre} es exclusivo para ${sec.tipo_vehiculo==='MOTO'?'motos':'carros'}`),{status:409});
      // Un mismo vehículo no puede estar en dos cupos a la vez (placa mal
      // digitada o entrada duplicada).
      if(type==='ENTRADA'){
        const dup=(await client.query(`SELECT s.nombre cupo,p2.nombre parqueadero FROM ocupaciones o
          JOIN secciones s ON s.id=o.id_seccion JOIN parqueaderos p2 ON p2.id=o.id_parqueadero
          WHERE o.placa=$1 AND o.estado='ACTIVA' LIMIT 1`,[placa])).rows[0];
        if(dup) throw Object.assign(new Error(`La placa ${placa} ya tiene una entrada activa en el cupo ${dup.cupo} de ${dup.parqueadero}. Registre primero su salida.`),{status:409});
      }
      if(type==='ENTRADA' && p.cupos_disponibles<=0) throw Object.assign(new Error('El parqueadero está lleno'),{status:409});
      if(type==='ENTRADA' && sec.cupos_disponibles<=0) throw Object.assign(new Error('El cupo seleccionado está ocupado'),{status:409});
      if(type==='SALIDA' && p.cupos_disponibles>=p.capacidad_total) throw Object.assign(new Error('No hay vehículos registrados para retirar'),{status:409});
      if(type==='SALIDA' && sec.cupos_disponibles>=sec.capacidad) throw Object.assign(new Error('El cupo seleccionado ya está disponible'),{status:409});

      const delta=type==='ENTRADA'?-1:1;
      await client.query('UPDATE parqueaderos SET cupos_disponibles=cupos_disponibles+$1 WHERE id=$2',[delta,req.params.id]);
      await client.query('UPDATE secciones SET cupos_disponibles=cupos_disponibles+$1 WHERE id=$2',[delta,sectionId]);
      const mov=(await client.query(`INSERT INTO movimientos(tipo,id_parqueadero,id_seccion,id_usuario,observacion)
                          VALUES($1,$2,$3,$4,$5) RETURNING id`,[type,req.params.id,sectionId,req.auth.sub,observacion||null])).rows[0];

      let anomalia='';
      if(type==='ENTRADA') {
        await client.query(`INSERT INTO ocupaciones(id_parqueadero,id_seccion,nombre_ocupante,codigo_carne,tipo_persona,placa,tipo_vehiculo,id_movimiento_entrada)
                            VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [req.params.id,sectionId,nombreOcupante,codigoCarne||null,tipoPersona,placa,tipoVehiculo,mov.id]);
      } else {
        const closed=await client.query(
          `UPDATE ocupaciones SET estado='FINALIZADA',fecha_fin=now(),id_movimiento_salida=$1
           WHERE id_seccion=$2 AND estado='ACTIVA' RETURNING id`,[mov.id,sectionId]);
        if(!closed.rowCount) anomalia=' [Salida sin ocupación activa registrada]';
      }

      const detalle=type==='ENTRADA'
        ? `Entrada de ${nombreOcupante} (${tipoPersona}${codigoCarne?`, carné ${codigoCarne}`:''}, placa ${placa}, ${tipoVehiculo}) en ${sec.nombre}`
        : `Registro de salida en ${sec.nombre}${anomalia}`;
      await audit(client,u,`MOVIMIENTO_${type}`,'CUPOS',detalle,req.ip);
      return await snapshot(req.params.id, client);
    });
    // Solo se avisa qué parqueadero cambió; cada cliente recarga por la API
    // (autenticada). Antes se difundía el snapshot completo con el SVG del
    // plano (hasta 1 MB) a todos los clientes en cada movimiento.
    io.emit('parking:update',{parkingId:Number(req.params.id)});
    res.json(result);
  } catch(e) {
    if(!e.status)console.error(e);res.status(e.status||500).json({message:e.status?e.message:'Error procesando movimiento'});
  }
});

export default router;
