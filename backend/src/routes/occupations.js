import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router=Router();

// CONSULTOR nunca ve identidad del ocupante (nombre/carné/placa), solo estado y tipo de vehículo.
function maskOccupant(row, role) {
  if (!row) return row;
  if (role==='CONSULTOR') {
    const {nombre_ocupante,codigo_carne,placa,...rest} = row;
    return rest;
  }
  return row;
}

router.get('/section/:sectionId/current', requireAuth, async (req,res)=>{
  const {rows}=await pool.query(
    `SELECT * FROM ocupaciones WHERE id_seccion=$1 AND estado='ACTIVA' ORDER BY fecha_inicio DESC LIMIT 1`,
    [req.params.sectionId]
  );
  res.json(maskOccupant(rows[0]||null, req.auth.role));
});

router.get('/', requireAuth, requireRole('ADMIN'), async (req,res)=>{
  const {parking,section,desde,hasta,estado}=req.query;
  const clauses=[]; const params=[];
  if(parking){params.push(parking);clauses.push(`o.id_parqueadero=$${params.length}`);}
  if(section){params.push(section);clauses.push(`o.id_seccion=$${params.length}`);}
  if(estado){params.push(estado);clauses.push(`o.estado=$${params.length}`);}
  if(desde){params.push(desde);clauses.push(`o.fecha_inicio>=$${params.length}`);}
  if(hasta){params.push(hasta);clauses.push(`o.fecha_inicio<=$${params.length}`);}
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
  const {rows}=await pool.query(
    `SELECT o.*,p.nombre parqueadero,s.nombre seccion
     FROM ocupaciones o
     JOIN parqueaderos p ON p.id=o.id_parqueadero
     JOIN secciones s ON s.id=o.id_seccion
     ${where} ORDER BY o.fecha_inicio DESC`,
    params
  );
  res.json(rows);
});

export default router;
