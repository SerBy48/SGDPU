import { Router } from '../utils/router.js';
import { pool, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.js';

const router=Router();
router.use(requireAuth);

router.get('/', async (_req,res)=>{
  const {rows}=await pool.query(`
    SELECT i.*,p.nombre parqueadero,u.nombre||' '||u.apellido reportado_por
    FROM incidencias i JOIN parqueaderos p ON p.id=i.id_parqueadero
    JOIN usuarios u ON u.id=i.id_usuario ORDER BY i.fecha_hora DESC`);
  res.json(rows);
});

router.post('/', async (req,res)=>{
  const {id_parqueadero,descripcion,placa_opcional,cupo_opcional}=req.body;
  if(!id_parqueadero||typeof descripcion!=='string'||!descripcion.trim()) return res.status(400).json({message:'Parqueadero y descripción son obligatorios'});
  if(!/^\d+$/.test(String(id_parqueadero))) return res.status(400).json({message:'Parqueadero inválido'});
  if(descripcion.length>2000) return res.status(400).json({message:'La descripción no puede superar 2000 caracteres'});
  const result=await withTransaction(async client=>{
    const r=await client.query(`INSERT INTO incidencias(descripcion,placa_opcional,cupo_opcional,id_parqueadero,id_usuario)
      VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [descripcion.trim(),placa_opcional||null,cupo_opcional||null,id_parqueadero,req.auth.sub]);
    const u=(await client.query('SELECT * FROM usuarios WHERE id=$1',[req.auth.sub])).rows[0];
    await audit(client,u,'REGISTRAR_INCIDENCIA','CUPOS',descripcion,req.ip);
    return r.rows[0];
  });
  res.status(201).json(result);
});

router.patch('/:id/close', async (req,res)=>{
  if(req.auth.role!=='ADMIN') return res.status(403).json({message:'Solo el administrador puede cerrar incidencias'});
  const {comentario_resolucion}=req.body;
  if(!/^\d+$/.test(req.params.id)) return res.status(400).json({message:'Incidencia inválida'});
  const result=await withTransaction(async client=>{
    const r=await client.query(`UPDATE incidencias SET estado='CERRADA',comentario_resolucion=$1 WHERE id=$2 AND estado='ACTIVA' RETURNING *`,[comentario_resolucion||null,req.params.id]);
    if(!r.rowCount) return null;
    const u=(await client.query('SELECT * FROM usuarios WHERE id=$1',[req.auth.sub])).rows[0];
    await audit(client,u,'CERRAR_INCIDENCIA','CUPOS',`Cerró la incidencia ${req.params.id}${comentario_resolucion?`: ${comentario_resolucion}`:''}`,req.ip);
    return r.rows[0];
  });
  if(!result)return res.status(404).json({message:'Incidencia no encontrada o ya cerrada'});
  res.json(result);
});

export default router;
