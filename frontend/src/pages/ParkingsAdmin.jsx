import {useEffect,useMemo,useState} from 'react';
import {Download,FileUp,ShieldCheck} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import ParkingPlano from '../components/ParkingPlano';
import {MAX_SVG_KB,PLANTILLA_SVG} from '../utils/svg';

// Deben coincidir con MOTIVOS_TEMPORALES / MOTIVOS_PLANO de backend/src/routes/admin.js.
const MOTIVOS_TEMPORALES={MANTENIMIENTO:'Mantenimiento',OBRA:'Obra o reparación',EVENTO:'Evento institucional',SEGURIDAD:'Seguridad',SENALIZACION:'Demarcación o señalización',OTRO:'Otro'};
const MOTIVOS_PLANO={AMPLIACION:'Ampliación del parqueadero',REDUCCION:'Reducción del parqueadero',REDISTRIBUCION:'Redistribución de cupos (carro/moto)',CORRECCION:'Corrección del plano',OTRO:'Otro'};
const MIN_DETALLE=10;
const hoy=()=>new Date().toISOString().slice(0,10);
const fechaCorta=d=>d?d.slice(0,10).split('-').reverse().join('/'):'—';
const errorDe=(e,fallback)=>({message:e.response?.data?.message||fallback,errores:e.response?.data?.errores||[]});

function ErrorBox({error}){
 if(!error) return null;
 return <div className="alert alert-danger" role="alert"><b>{error.message}</b>{error.errores?.length>0&&<ul>{error.errores.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>;
}

function descargarPlantilla(){
 const url=URL.createObjectURL(new Blob([PLANTILLA_SVG],{type:'image/svg+xml'}));
 const a=document.createElement('a');a.href=url;a.download='plantilla_plano_sgdpu.svg';document.body.appendChild(a);a.click();a.remove();
 URL.revokeObjectURL(url);
}

function GuiaPlano({abierta}){
 return <details className="guide" open={abierta}>
  <summary>Guía: cómo preparar el plano .svg</summary>
  <ol>
   <li>Dibuje el parqueadero en un editor vectorial (Inkscape, Illustrator, Figma…) y expórtelo como <b>SVG</b>, con atributo <code>viewBox</code>.</li>
   <li>Cada puesto debe ser una figura (<code>rect</code>, <code>polygon</code> o <code>path</code>) con dos atributos:
    <span className="code code-block">{'<rect data-codigo="C-01" data-tipo="carro" … />\n<rect data-codigo="M-01" data-tipo="moto" … />\n<rect data-codigo="C-02" data-tipo="discapacitado" … />'}</span>
    <code>data-codigo</code> es el número del cupo que verán porteros y reportes: único, solo letras, números y guion (máx. 20). <code>data-tipo</code> es <code>carro</code>, <code>moto</code> o <code>discapacitado</code> (cupo preferencial de carro).</li>
   <li>Vías, muros y rótulos van sin <code>data-codigo</code>: se muestran como fondo y no se pueden seleccionar.</li>
   <li>La cantidad de cupos del parqueadero es la cantidad de figuras con <code>data-codigo</code>; no se escribe a mano.</li>
  </ol>
  <div className="row" style={{gap:6,alignItems:'flex-start'}}><ShieldCheck size={16} style={{flex:'0 0 auto',color:'var(--green)'}}/><span><b>Seguridad:</b> un SVG puede contener código. Por eso el sistema revisa cada archivo antes de guardarlo: rechaza <code>DOCTYPE</code>/entidades y CSS que cargue recursos externos, y elimina scripts, eventos (<code>onclick</code>…), <code>foreignObject</code>, imágenes, enlaces, <code>use</code> y animaciones. Máximo {MAX_SVG_KB} KB. Revise siempre la vista previa: lo que ve ahí es exactamente lo que se guardará.</span></div>
  <button type="button" className="btn btn-ghost" style={{marginTop:10}} onClick={descargarPlantilla}><Download size={14}/> Descargar plantilla .svg</button>
 </details>;
}

// Revisión previa del plano: valida en el cliente lo básico, lo envía al
// servidor para revisión de seguridad y formato, y muestra el informe y la
// vista previa saneada. onChange recibe {svg,revision} cuando el plano es válido.
function PlanoUploader({parkingId,onChange}){
 const [archivo,setArchivo]=useState(null),[revision,setRevision]=useState(null),[error,setError]=useState(null),[cargando,setCargando]=useState(false);
 const elegir=async e=>{
  const f=e.target.files?.[0]; setRevision(null);setError(null);onChange(null);setArchivo(f||null);
  if(!f) return;
  if(!/\.svg$/i.test(f.name)){setError({message:'El archivo debe tener extensión .svg'});return}
  if(f.size>MAX_SVG_KB*1024){setError({message:`El archivo pesa ${Math.round(f.size/1024)} KB; el máximo es ${MAX_SVG_KB} KB`});return}
  setCargando(true);
  try{
   const svg=await f.text();
   const r=await api.post('/admin/planos/validar',{svg,id_parqueadero:parkingId});
   setRevision(r.data);onChange({svg,revision:r.data});
  }catch(err){setError(errorDe(err,'No fue posible revisar el plano'))}finally{setCargando(false)}
 };
 const secciones=useMemo(()=>(revision?.cupos||[]).map(c=>({id:c.codigo,nombre:c.codigo,cupos_disponibles:1,tipo_vehiculo:c.tipo,es_preferencial:c.preferencial})),[revision]);
 return <div>
  <div className="field"><label className="label" htmlFor="plano-file">Archivo del plano (.svg)</label>
   <label className="btn btn-outline" style={{display:'inline-flex',gap:6,alignItems:'center'}}><FileUp size={14}/> {archivo?'Cambiar archivo':'Seleccionar archivo'}<input id="plano-file" type="file" accept=".svg,image/svg+xml" onChange={elegir} style={{display:'none'}}/></label>
   {archivo&&<span className="small muted" style={{marginLeft:8}}>{archivo.name} · {Math.round(archivo.size/1024)||1} KB</span>}
  </div>
  {cargando&&<div className="alert alert-info">Revisando el plano…</div>}
  <ErrorBox error={error}/>
  {revision&&<div className="report">
   <div className="row space"><b>Revisión del plano</b><span className="chip chip-green">Superó la revisión de seguridad</span></div>
   <div className="chips" style={{marginTop:8}}>
    <span className="chip chip-blue">{revision.resumen.total} cupos</span><span className="chip chip-green">{revision.resumen.carros} carro</span><span className="chip chip-purple">{revision.resumen.motos} moto</span><span className="chip chip-neutral">{revision.resumen.preferenciales} preferenciales</span>
   </div>
   {revision.advertencias.length>0&&<div className="alert alert-warn" style={{marginTop:10,marginBottom:0}}><b>Advertencias</b><ul>{revision.advertencias.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
   {revision.cambios&&<ResumenCambios cambios={revision.cambios}/>}
   <div className="legend" style={{marginTop:12}}><span><i className="dot" style={{background:'#4caf50'}}/>Carro</span><span><i className="dot" style={{background:'#8e24aa'}}/>Moto</span><span><i className="dot" style={{background:'#1565c0'}}/>Preferencial</span><span className="muted">Pase el cursor sobre un cupo para ver su código.</span></div>
   <div className="svg-box"><ParkingPlano svg={revision.svg} secciones={secciones} canOperate={false} variant="preview"/></div>
  </div>}
 </div>;
}

function ResumenCambios({cambios:c}){
 const lista=(t,xs,cls)=>xs.length>0&&<div style={{marginTop:8}}><span className={'chip '+cls}>{t}: {xs.length}</span> <span className="small muted">{xs.slice(0,30).join(', ')}{xs.length>30?'…':''}</span></div>;
 return <div style={{marginTop:12}}>
  <b>Cambios respecto al plano actual</b> <span className="small muted">· capacidad {c.capacidadAntes} → {c.capacidadDespues} cupos</span>
  {lista('Cupos nuevos',[...c.nuevos,...c.reactivados],'chip-green')}
  {lista('Cambian de tipo',c.cambianTipo,'chip-amber')}
  {lista('Se eliminan (sin historial)',c.eliminados,'chip-red')}
  {lista('Se retiran (conservan su historial)',c.retirados,'chip-neutral')}
  {!c.nuevos.length&&!c.reactivados.length&&!c.cambianTipo.length&&!c.eliminados.length&&!c.retirados.length&&<div className="small muted" style={{marginTop:6}}>El nuevo plano tiene los mismos cupos; solo cambia el dibujo o la marca de preferenciales.</div>}
  {c.bloqueos.length>0&&<div className="alert alert-danger" style={{marginTop:10,marginBottom:0}}><b>No se puede aplicar todavía</b><ul>{c.bloqueos.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
 </div>;
}

function CampoMotivo({catalogo,motivo,detalle,onMotivo,onDetalle,ayuda}){
 return <div className="grid grid-2">
  <div className="field"><label className="label" htmlFor="motivo">Motivo del cambio *</label><select id="motivo" className="select" value={motivo} onChange={e=>onMotivo(e.target.value)}><option value="">Seleccione</option>{Object.entries(catalogo).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
  <div className="field"><label className="label" htmlFor="detalle">Descripción *</label><textarea id="detalle" className="textarea" rows={2} maxLength={500} placeholder={ayuda} value={detalle} onChange={e=>onDetalle(e.target.value)}/><div className="small muted">{detalle.trim().length<MIN_DETALLE?`Mínimo ${MIN_DETALLE} caracteres (${detalle.trim().length}/${MIN_DETALLE})`:`${detalle.length}/500`}</div></div>
 </div>;
}

function CamposBasicos({form,setForm,sedes}){
 return <>
  <div className="grid grid-2">
   <div className="field"><label className="label" htmlFor="p-nombre">Nombre *</label><input id="p-nombre" className="input" required maxLength={120} placeholder="P5 - Facultad de Salud" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></div>
   <div className="field"><label className="label" htmlFor="p-sede">Sede *</label><select id="p-sede" className="select" required value={form.id_sede} onChange={e=>setForm({...form,id_sede:e.target.value})}><option value="">Seleccione</option>{sedes.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
  </div>
  <div className="field"><label className="label" htmlFor="p-ubicacion">Ubicación *</label><input id="p-ubicacion" className="input" required placeholder="Referencia para orientar a los usuarios (acceso, bloque…)" value={form.ubicacion} onChange={e=>setForm({...form,ubicacion:e.target.value})}/></div>
 </>;
}

function CrearParqueadero({sedes,onClose,onDone}){
 const [form,setForm]=useState({nombre:'',ubicacion:'',id_sede:''}),[plano,setPlano]=useState(null),[confirmado,setConfirmado]=useState(false),[error,setError]=useState(null),[guardando,setGuardando]=useState(false);
 const listo=form.nombre.trim()&&form.ubicacion.trim()&&form.id_sede&&plano&&confirmado;
 const guardar=async e=>{
  e.preventDefault();if(!listo)return;setGuardando(true);setError(null);
  try{await api.post('/admin/parkings',{...form,svg:plano.svg});onDone(`Parqueadero ${form.nombre} creado con ${plano.revision.resumen.total} cupos.`)}
  catch(err){setError(errorDe(err,'No fue posible crear el parqueadero'))}finally{setGuardando(false)}
 };
 return <Modal size="lg" title="Crear parqueadero" onClose={onClose}><form onSubmit={guardar}>
  <div className="alert alert-info">Los cupos se crean a partir del plano: cada figura con <b>data-codigo</b> es un cupo. Complete los datos, suba el plano y revise la vista previa antes de crear.</div>
  <h4 style={{margin:'4px 0 10px'}}>1. Datos generales</h4>
  <CamposBasicos form={form} setForm={setForm} sedes={sedes}/>
  <h4 style={{margin:'10px 0'}}>2. Plano del parqueadero</h4>
  <GuiaPlano abierta/>
  <PlanoUploader onChange={p=>{setPlano(p);setConfirmado(false)}}/>
  {plano&&<label className="check" style={{margin:'10px 0'}}><input type="checkbox" checked={confirmado} onChange={e=>setConfirmado(e.target.checked)}/> Revisé la vista previa: el dibujo, los códigos y el tipo de cada cupo corresponden al parqueadero real.</label>}
  <ErrorBox error={error}/>
  <div className="row" style={{justifyContent:'flex-end'}}><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!listo||guardando}>{guardando?'Creando…':'Crear parqueadero'}</button></div>
 </form></Modal>;
}

function EditarDatos({parking,sedes,onClose,onDone}){
 const [form,setForm]=useState({nombre:parking.nombre,ubicacion:parking.ubicacion,id_sede:parking.id_sede}),[error,setError]=useState(null);
 const guardar=async e=>{e.preventDefault();setError(null);try{await api.patch('/admin/parkings/'+parking.id,form);onDone('Datos del parqueadero actualizados.')}catch(err){setError(errorDe(err,'No fue posible guardar'))}};
 return <Modal title={`Editar datos — ${parking.nombre}`} onClose={onClose}><form onSubmit={guardar}>
  <CamposBasicos form={form} setForm={setForm} sedes={sedes}/>
  <p className="small muted">Para cambiar la cantidad de cupos use <b>Cupos y plano</b>: allí se indica el motivo y si el cambio es temporal o un nuevo plano.</p>
  <ErrorBox error={error}/>
  <div className="row" style={{justifyContent:'flex-end'}}><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary">Guardar</button></div>
 </form></Modal>;
}

function CuposYPlano({parking,onClose,onDone}){
 const [detalle,setDetalleParking]=useState(null),[modo,setModo]=useState(null),[ok,setOk]=useState(''),[error,setError]=useState(null);
 const cargar=()=>api.get('/parking/'+parking.id).then(r=>setDetalleParking(r.data));
 useEffect(()=>{cargar()},[parking.id]);
 const listo=msg=>{setOk(msg);setError(null);setModo(null);cargar();onDone()};
 const inhabilitados=(detalle?.secciones||[]).filter(s=>s.habilitado===false);
 return <Modal size="lg" title={`Cupos y plano — ${parking.nombre}`} onClose={onClose}>
  {ok&&<div className="alert alert-info" role="status">{ok}</div>}
  <p className="muted" style={{marginTop:0}}>Capacidad actual: <b>{parking.capacidad_total}</b> cupos ({parking.espacios_carro} carro / {parking.espacios_moto} moto){inhabilitados.length>0&&<> · <b>{inhabilitados.length}</b> inhabilitados temporalmente</>}. ¿Qué tipo de cambio necesita?</p>
  <div className="choice-grid" role="radiogroup" aria-label="Tipo de cambio">
   <button type="button" role="radio" aria-checked={modo==='temporal'} className={'choice '+(modo==='temporal'?'active':'')} onClick={()=>{setModo('temporal');setOk('')}}><b>Cambio temporal</b><span>Inhabilitar cupos puntuales (obra, mantenimiento, evento). El plano no cambia y luego se pueden rehabilitar.</span></button>
   <button type="button" role="radio" aria-checked={modo==='plano'} className={'choice '+(modo==='plano'?'active':'')} onClick={()=>{setModo('plano');setOk('')}}><b>Cambio permanente</b><span>Aumentar, reducir o redistribuir cupos. Exige subir el nuevo plano .svg antes de aplicar.</span></button>
  </div>
  <ErrorBox error={error}/>
  {modo==='temporal'&&detalle&&<Inhabilitar detalle={detalle} onError={setError} onDone={listo}/>}
  {modo==='plano'&&<CambiarPlano parking={parking} onError={setError} onDone={listo}/>}
  {!modo&&inhabilitados.length>0&&<Rehabilitar parkingId={parking.id} secciones={inhabilitados} onError={setError} onDone={listo}/>}
 </Modal>;
}

function Inhabilitar({detalle,onError,onDone}){
 const [sel,setSel]=useState([]),[motivo,setMotivo]=useState(''),[texto,setTexto]=useState(''),[hasta,setHasta]=useState(''),[aviso,setAviso]=useState('');
 const porId=useMemo(()=>Object.fromEntries(detalle.secciones.map(s=>[s.id,s])),[detalle]);
 const toggle=s=>{
  if(s.habilitado===false){setAviso(`El cupo ${s.nombre} ya está inhabilitado.`);return}
  if(s.ocupada||!s.cupos_disponibles){setAviso(`El cupo ${s.nombre} está ocupado: registre su salida antes de inhabilitarlo.`);return}
  setAviso('');setSel(v=>v.includes(s.id)?v.filter(x=>x!==s.id):[...v,s.id]);
 };
 const valido=sel.length&&motivo&&texto.trim().length>=MIN_DETALLE;
 const enviar=async()=>{
  try{const r=await api.post(`/admin/parkings/${detalle.id}/cupos/inhabilitar`,{ids:sel,motivo,detalle:texto,hasta:hasta||null});onDone(`Se inhabilitaron ${r.data.inhabilitados.length} cupo(s): ${r.data.inhabilitados.join(', ')}.`)}
  catch(e){onError(errorDe(e,'No fue posible inhabilitar los cupos'))}
 };
 return <div>
  <div className="alert alert-info">Toque o haga clic en el plano los cupos <b>libres</b> que quedarán fuera de servicio. Los porteros no podrán registrar entradas en ellos hasta que se rehabiliten.</div>
  <div className="legend"><span><i className="dot" style={{background:'#4caf50'}}/>Libre</span><span><i className="dot" style={{background:'#ef5350'}}/>Ocupado</span><span><i className="dot" style={{background:'#9e9e9e'}}/>Ya inhabilitado</span><span><i className="dot" style={{background:'#f9a825'}}/>Seleccionado para inhabilitar</span></div>
  {detalle.plano_svg?<div className="svg-box"><ParkingPlano svg={detalle.plano_svg} secciones={detalle.secciones} selectedIds={sel} canOperate onSelect={toggle}/></div>:<div className="alert alert-danger">Este parqueadero no tiene plano: use «Cambio permanente» para cargarlo.</div>}
  {aviso&&<div className="small" role="status" style={{color:'var(--amber)',marginTop:6}}>{aviso}</div>}
  <div className="field" style={{marginTop:10}}><span className="label">Cupos seleccionados ({sel.length})</span><div className="chips">{sel.length?sel.map(id=><button type="button" key={id} className="chip chip-amber" style={{border:0}} onClick={()=>toggle(porId[id])} aria-label={`Quitar ${porId[id]?.nombre}`}>{porId[id]?.nombre} ✕</button>):<span className="small muted">Ninguno</span>}</div></div>
  <CampoMotivo catalogo={MOTIVOS_TEMPORALES} motivo={motivo} detalle={texto} onMotivo={setMotivo} onDetalle={setTexto} ayuda="Ej.: reparación del piso de la zona C"/>
  <div className="field" style={{maxWidth:260}}><label className="label" htmlFor="hasta">Rehabilitación estimada (opcional)</label><input id="hasta" type="date" className="input" min={hoy()} value={hasta} onChange={e=>setHasta(e.target.value)}/><div className="small muted">Es informativa: los cupos se rehabilitan manualmente.</div></div>
  <div className="row" style={{justifyContent:'flex-end'}}><button className="btn btn-danger" disabled={!valido} onClick={enviar}>Inhabilitar {sel.length||''} cupo(s)</button></div>
 </div>;
}

function CambiarPlano({parking,onError,onDone}){
 const [plano,setPlano]=useState(null),[motivo,setMotivo]=useState(''),[texto,setTexto]=useState(''),[confirmado,setConfirmado]=useState(false),[guardando,setGuardando]=useState(false);
 const bloqueado=plano?.revision.cambios?.bloqueos.length>0;
 const valido=plano&&!bloqueado&&confirmado&&motivo&&texto.trim().length>=MIN_DETALLE;
 const aplicar=async()=>{
  setGuardando(true);
  try{const r=await api.put(`/admin/parkings/${parking.id}/plano`,{svg:plano.svg,motivo,detalle:texto});onDone(`Nuevo plano aplicado: ${r.data.capacidadAntes} → ${r.data.capacidadDespues} cupos.`)}
  catch(e){onError(errorDe(e,'No fue posible aplicar el plano'))}finally{setGuardando(false)}
 };
 return <div>
  <div className="alert alert-warn">El nuevo plano reemplaza al actual. Los cupos que ya no aparezcan se eliminan (o se retiran si tienen historial) y los cupos ocupados que cambien o desaparezcan bloquean el cambio hasta registrar su salida.</div>
  <CampoMotivo catalogo={MOTIVOS_PLANO} motivo={motivo} detalle={texto} onMotivo={setMotivo} onDetalle={setTexto} ayuda="Ej.: se demarcaron 12 cupos nuevos de moto en la zona norte"/>
  <GuiaPlano/>
  <PlanoUploader parkingId={parking.id} onChange={p=>{setPlano(p);setConfirmado(false)}}/>
  {plano&&!bloqueado&&<label className="check" style={{margin:'10px 0'}}><input type="checkbox" checked={confirmado} onChange={e=>setConfirmado(e.target.checked)}/> Revisé la vista previa y los cambios: el nuevo plano corresponde al parqueadero real.</label>}
  <div className="row" style={{justifyContent:'flex-end'}}><button className="btn btn-primary" disabled={!valido||guardando} onClick={aplicar}>{guardando?'Aplicando…':'Aplicar nuevo plano'}</button></div>
 </div>;
}

function Rehabilitar({parkingId,secciones,onError,onDone}){
 const [sel,setSel]=useState([]);
 const todos=sel.length===secciones.length;
 const enviar=async()=>{
  try{const r=await api.post(`/admin/parkings/${parkingId}/cupos/rehabilitar`,{ids:sel});onDone(`Se rehabilitaron ${r.data.rehabilitados.length} cupo(s): ${r.data.rehabilitados.join(', ')}.`)}
  catch(e){onError(errorDe(e,'No fue posible rehabilitar los cupos'))}
 };
 return <div className="report">
  <div className="row space"><b>Cupos inhabilitados temporalmente</b><button className="btn btn-info" disabled={!sel.length} onClick={enviar}>Rehabilitar {sel.length||''} seleccionado(s)</button></div>
  <div className="table-wrap" style={{marginTop:10}}><table className="table-fixed" style={{minWidth:620}}><colgroup><col style={{width:40}}/><col style={{width:80}}/><col/><col style={{width:110}}/><col style={{width:130}}/></colgroup>
   <thead><tr><th><input type="checkbox" aria-label="Seleccionar todos" checked={todos} onChange={()=>setSel(todos?[]:secciones.map(s=>s.id))}/></th><th>Cupo</th><th>Motivo</th><th>Desde</th><th>Rehab. estimada</th></tr></thead>
   <tbody>{secciones.map(s=>{const vencida=s.inhabilitado_hasta&&s.inhabilitado_hasta.slice(0,10)<hoy();return <tr key={s.id}>
    <td><input type="checkbox" aria-label={`Seleccionar ${s.nombre}`} checked={sel.includes(s.id)} onChange={()=>setSel(v=>v.includes(s.id)?v.filter(x=>x!==s.id):[...v,s.id])}/></td>
    <td><b>{s.nombre}</b></td><td>{s.motivo_inhabilitacion||'—'}</td><td>{fechaCorta(s.inhabilitado_desde)}</td>
    <td>{fechaCorta(s.inhabilitado_hasta)}{vencida&&<div><span className="chip chip-amber">Fecha vencida</span></div>}</td>
   </tr>})}</tbody></table></div>
 </div>;
}

export default function Parkings(){
 const [rows,setRows]=useState([]),[sedes,setSedes]=useState([]),[modal,setModal]=useState(null),[deleting,setDeleting]=useState(null),[err,setErr]=useState(''),[ok,setOk]=useState('');
 const load=()=>{api.get('/admin/parkings').then(r=>setRows(r.data));api.get('/admin/sedes').then(r=>setSedes(r.data))};useEffect(load,[]);
 const cerrar=msg=>{setModal(null);if(msg)setOk(msg);load()};
 const toggle=async r=>{await api.patch('/admin/parkings/'+r.id+'/status',{estado:r.estado==='ACTIVO'?'INACTIVO':'ACTIVO'});load()};
 const remove=async()=>{try{await api.delete('/admin/parkings/'+deleting.id);setDeleting(null);load()}catch(e){setErr(e.response?.data?.message||'No fue posible eliminar el parqueadero');setDeleting(null)}};
 // Las acciones de cupos refrescan la tabla sin cerrar el modal (puede seguir rehabilitando, etc.).
 const sincronizar=()=>api.get('/admin/parkings').then(r=>{setRows(r.data);setModal(m=>m?.tipo==='cupos'?{...m,parking:r.data.find(p=>p.id===m.parking.id)||m.parking}:m)});
 return <div className="content"><div className="row space"><div><h1 className="page-title">Gestión de Parqueaderos</h1><p className="page-sub">Cree parqueaderos a partir de su plano .svg y gestione sus cupos con motivo registrado.</p></div><button className="btn btn-primary" onClick={()=>{setOk('');setModal({tipo:'crear'})}}>+ Nuevo parqueadero</button></div>
 {err&&<div className="alert alert-danger">{err}</div>}{ok&&<div className="alert alert-info" role="status">{ok}</div>}
 <div className="card"><div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Sede</th><th>Ubicación</th><th>Carro</th><th>Moto</th><th>Capacidad</th><th>Inhabilitados</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>
  <td>{r.nombre}{!r.tiene_plano&&<div><span className="chip chip-amber">Sin plano</span></div>}</td><td>{r.sede}</td><td>{r.ubicacion}</td><td>{r.espacios_carro}</td><td>{r.espacios_moto}</td><td>{r.capacidad_total}</td>
  <td>{r.inhabilitados?<span className="chip chip-neutral">{r.inhabilitados}</span>:'—'}</td>
  <td><span className={r.estado==='ACTIVO'?'chip chip-green':'chip chip-red'}>{r.estado}</span></td>
  <td><div className="row" style={{gap:6}}><button className="btn btn-ghost" onClick={()=>setModal({tipo:'editar',parking:r})}>Editar datos</button><button className="btn btn-outline" onClick={()=>setModal({tipo:'cupos',parking:r})}>Cupos y plano</button><button className="btn btn-ghost" onClick={()=>toggle(r)}>{r.estado==='ACTIVO'?'Desactivar':'Activar'}</button><button className="btn btn-danger" onClick={()=>setDeleting(r)}>Eliminar</button></div></td>
 </tr>)}</tbody></table></div></div>
 {modal?.tipo==='crear'&&<CrearParqueadero sedes={sedes} onClose={()=>cerrar()} onDone={cerrar}/>}
 {modal?.tipo==='editar'&&<EditarDatos parking={modal.parking} sedes={sedes} onClose={()=>cerrar()} onDone={cerrar}/>}
 {modal?.tipo==='cupos'&&<CuposYPlano parking={modal.parking} onClose={()=>cerrar()} onDone={sincronizar}/>}
 {deleting&&<Modal title="Eliminar parqueadero" onClose={()=>setDeleting(null)}><p>¿Eliminar permanentemente <b>{deleting.nombre}</b>? Esta acción no se puede deshacer. Si tiene historial de movimientos o incidencias, no será posible eliminarlo y deberá desactivarlo en su lugar.</p><div className="row" style={{justifyContent:'flex-end',marginTop:18}}><button className="btn btn-ghost" onClick={()=>setDeleting(null)}>Cancelar</button><button className="btn btn-danger" onClick={remove}>Eliminar</button></div></Modal>}
 </div>;
}
