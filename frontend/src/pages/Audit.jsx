import {useEffect,useState} from 'react';import api from '../services/api';import Pagination,{usePagination} from '../components/Pagination';import {MESES} from '../utils/months';

function actionChip(accion){
 if(accion==='LOGIN') return 'chip-blue';
 if(accion==='LOGOUT') return 'chip-neutral';
 if(accion.startsWith('CREAR_')) return 'chip-green';
 if(accion.startsWith('ACTIVAR_')) return 'chip-green';
 if(accion.startsWith('DESACTIVAR_')) return 'chip-red';
 if(accion.startsWith('EDITAR_')) return 'chip-amber';
 if(accion.startsWith('ELIMINAR_')) return 'chip-red';
 if(accion==='MOVIMIENTO_ENTRADA') return 'chip-green';
 if(accion==='MOVIMIENTO_SALIDA') return 'chip-blue';
 if(accion==='INHABILITAR_CUPOS') return 'chip-red';
 if(accion==='REHABILITAR_CUPOS') return 'chip-green';
 if(accion==='CAMBIAR_PLANO_PARQUEADERO') return 'chip-amber';
 if(accion==='REGISTRAR_INCIDENCIA') return 'chip-purple';
 return 'chip-neutral';
}

const ACCIONES=['LOGIN','LOGOUT','CREAR_PORTERO','ACTIVAR_PORTERO','DESACTIVAR_PORTERO','CREAR_PARQUEADERO','EDITAR_PARQUEADERO','ACTIVAR_PARQUEADERO','DESACTIVAR_PARQUEADERO','ELIMINAR_PARQUEADERO','CAMBIAR_PLANO_PARQUEADERO','INHABILITAR_CUPOS','REHABILITAR_CUPOS','MOVIMIENTO_ENTRADA','MOVIMIENTO_SALIDA','REGISTRAR_INCIDENCIA'];

export default function Audit(){
 const [rows,setRows]=useState([]);
 const [year,setYear]=useState(0),[month,setMonth]=useState(0),[rol,setRol]=useState(''),[accion,setAccion]=useState('');
 useEffect(()=>{api.get('/admin/auditoria',{params:{year:year||undefined,month:month||undefined,rol:rol||undefined,accion:accion||undefined}}).then(r=>setRows(r.data))},[year,month,rol,accion]);
 const years=Array.from({length:6},(_,i)=>new Date().getFullYear()-i);
 const {page,setPage,pageSize,setPageSize,totalPages,pageRows,total}=usePagination(rows,50);
 return <div className="content"><h1 className="page-title">Auditoría</h1><p className="page-sub">Bitácora inmutable de acciones administrativas y de portería.</p>
 <div className="toolbar">
  <select className="select" style={{width:130}} value={year} onChange={e=>setYear(Number(e.target.value))}><option value="0">Año</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
  <select className="select" style={{width:150}} value={month} onChange={e=>setMonth(Number(e.target.value))}><option value="0">Mes</option>{MESES.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
  <select className="select" style={{width:180}} value={rol} onChange={e=>setRol(e.target.value)}><option value="">Todos los usuarios</option><option value="ADMIN">Administrador</option><option value="PORTERO">Portero</option></select>
  <select className="select" style={{width:200}} value={accion} onChange={e=>setAccion(e.target.value)}><option value="">Todas las acciones</option>{ACCIONES.map(a=><option key={a} value={a}>{a}</option>)}</select>
 </div>
 <div className="card"><div className="table-wrap"><table className="table-fixed" style={{minWidth:1100}}><colgroup><col style={{width:170}}/><col style={{width:160}}/><col style={{width:100}}/><col style={{width:200}}/><col style={{width:100}}/><col/><col style={{width:120}}/></colgroup><thead><tr><th>Fecha</th><th>Usuario</th><th>Rol</th><th>Acción</th><th>Módulo</th><th>Detalle</th><th>IP</th></tr></thead><tbody>{pageRows.map(r=><tr key={r.id}><td>{new Date(r.fecha_hora).toLocaleString()}</td><td>{r.usuario}</td><td>{r.rol_usuario}</td><td><span className={'chip '+actionChip(r.accion)}>{r.accion}</span></td><td>{r.modulo}</td><td>{r.descripcion_detalle}</td><td>{r.ip}</td></tr>)}</tbody></table>{!rows.length&&<div className="empty">Sin registros para los filtros seleccionados.</div>}</div><Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalPages={totalPages} total={total}/></div></div>
}
