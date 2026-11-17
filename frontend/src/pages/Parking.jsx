import {useEffect,useRef,useState} from 'react'; import {io} from 'socket.io-client'; import api from '../services/api'; import Modal from '../components/Modal'; import PlateCapture from '../components/PlateCapture'; import ParkingPlano from '../components/ParkingPlano'; import {sanitizeName,sanitizeDigits,plateError} from '../utils/text'; import {useIsMobile} from '../utils/useMediaQuery';
const OCUPANTE_VACIO={nombreOcupante:'',codigoCarne:'',placa:'',tipoPersona:'ESTUDIANTE',tipoVehiculo:'CARRO'};
const VEHICULO_LABEL={CARRO:'Carro',MOTO:'Moto'};
// Restricción de vehículos del parqueadero según los cupos que tiene.
const tipoParqueadero=p=>p.espacios_carro&&!p.espacios_moto?{label:'Solo carros',cls:'chip-amber'}:p.espacios_moto&&!p.espacios_carro?{label:'Solo motos',cls:'chip-purple'}:{label:'Carros y motos',cls:'chip-neutral'};
const TIPO_PERSONA_LABEL={ESTUDIANTE:'Estudiante',ADMINISTRATIVO:'Administrativo',DOCENTE:'Docente'};
export default function Parking({user}){
 const [parks,setParks]=useState([]),[selected,setSelected]=useState(null),[detail,setDetail]=useState(null),[slot,setSlot]=useState(null),[modal,setModal]=useState(null),[msg,setMsg]=useState('');
 const [ocupante,setOcupante]=useState(OCUPANTE_VACIO);
 const [intentoSubmit,setIntentoSubmit]=useState(false);
 const erroresOcupante={
  nombreOcupante:!ocupante.nombreOcupante.trim()?'El nombre es obligatorio.':null,
  codigoCarne:(ocupante.tipoPersona==='ESTUDIANTE'&&!ocupante.codigoCarne.trim())?'El código de carné es obligatorio para estudiantes.':null,
  placa:plateError(ocupante.placa,ocupante.tipoVehiculo),
 };
 const ocupanteCompleto=!erroresOcupante.nombreOcupante&&!erroresOcupante.codigoCarne&&!erroresOcupante.placa;
 const [ocupanteActual,setOcupanteActual]=useState(null);
 const selectedRef=useRef(selected);
 useEffect(()=>{selectedRef.current=selected},[selected]);
 const load=async()=>{const r=await api.get('/parking/active');setParks(r.data);if(selectedRef.current){const d=await api.get('/parking/'+selectedRef.current.id);setDetail(d.data)}};
 useEffect(()=>{
  load();
  const s=io(import.meta.env.VITE_API_URL?.replace('/api','')||'http://localhost:4000');
  s.on('parking:update',e=>{load();if(selectedRef.current?.id===e.parkingId)setDetail(e.parking)});
  const t=setInterval(load,5000);
  return()=>{clearInterval(t);if(typeof s.disconnect==='function')s.disconnect()};
 },[]);
 useEffect(()=>{if(!selected&&parks.length){const p=user.rol==='PORTERO'?parks.find(x=>x.id===user.id_parqueadero_asignado):parks[0];if(p)setSelected(p)}},[parks,user]);
 useEffect(()=>{
  if(!selected) return;
  let cancelled=false;
  api.get('/parking/'+selected.id).then(d=>{if(!cancelled)setDetail(d.data)});
  return()=>{cancelled=true};
 },[selected?.id]);
 useEffect(()=>{
  if(!slot||slot.cupos_disponibles||slot.habilitado===false){setOcupanteActual(undefined);return}
  setOcupanteActual(undefined);
  let cancelled=false;
  api.get(`/occupations/section/${slot.id}/current`).then(r=>{if(!cancelled)setOcupanteActual(r.data||null)}).catch(()=>{if(!cancelled)setOcupanteActual(null)});
  return()=>{cancelled=true};
 },[slot?.id]);
 const choose=p=>{setSelected(p);setSlot(null);setMsg('')};
 const move=async type=>{
  if(!slot)return;
  if(type==='ENTRADA'&&!ocupanteCompleto){setIntentoSubmit(true);return}
  try{
   const payload={sectionId:slot.id,type,...(type==='ENTRADA'?ocupante:{})};
   const r=await api.post(`/parking/${selected.id}/movement`,payload);
   setDetail(r.data);setMsg(`Entrada/salida registrada en ${slot.nombre}`);setModal(null);setSlot(null);
   setOcupante(OCUPANTE_VACIO);setIntentoSubmit(false);
  }catch(e){setMsg(e.response?.data?.message||'No fue posible registrar el movimiento');setModal(null)}
 };
 const abrirEntrada=()=>{setOcupante({...OCUPANTE_VACIO,tipoVehiculo:slot.tipo_vehiculo||'CARRO'});setIntentoSubmit(false);setModal('ENTRADA')};
 const mobile=useIsMobile();
 const isPortero=user.rol==='PORTERO';
 const ownParking=isPortero&&selected&&user.id_parqueadero_asignado===selected.id;
 const canOperate=ownParking;
 const displayed=detail?.secciones||[];
 const inhabilitados=displayed.filter(s=>s.habilitado===false).length;
 return <div className="content"><h1 className="page-title">{isPortero?'Gestión de Cupos':'Disponibilidad de Parqueaderos'}</h1><p className="page-sub">{isPortero?'Seleccione un cupo y confirme la operación.':'Consulta el estado de los parqueaderos activos en tiempo real.'}</p>
 <div className="parking-grid" style={{marginBottom:16}}>{parks.map(p=>{const t=tipoParqueadero(p);return <button type="button" className={'parking-card '+(selected?.id===p.id?'selected':'')} key={p.id} aria-pressed={selected?.id===p.id} onClick={()=>choose(p)}><div className="row space"><strong>{p.nombre}</strong><span className="chip chip-blue">{p.cupos_disponibles} libres</span></div><p className="muted">{p.sede} · {p.ubicacion}</p><div className="row space" style={{marginBottom:8}}><span className={'chip '+t.cls}>{t.label}</span></div><div className="progress"><div style={{width:`${p.ocupacion}%`}}/></div></button>})}</div>
 {isPortero&&selected&&!ownParking&&<div className="alert alert-danger">No puede operar este parqueadero: no está asignado a su portería.</div>}
 {detail&&<><div className="parking-stack"><div className="card"><div className="card-head"><h3>Plano interactivo — {detail.nombre}</h3></div><div className="card-body"><div className="legend"><span><i className="dot" style={{background:'#4caf50'}}/>Disponible</span><span><i className="dot" style={{background:'#ef5350'}}/>Ocupado</span>{canOperate&&<span><i className="dot" style={{background:'#f9a825'}}/>Seleccionado</span>}{inhabilitados>0&&<span><i className="dot" style={{background:'#9e9e9e'}}/>Inhabilitado temporalmente</span>}<span><i className="dot" style={{background:'#1565c0'}}/>Preferencial (discapacidad)</span></div><div className="svg-box">{detail.plano_svg?<ParkingPlano svg={detail.plano_svg} secciones={displayed} selectedId={slot?.id} canOperate={canOperate} onSelect={setSlot} renderPopover={(sec,cerrar)=><SlotDetails sec={sec} operable={canOperate&&slot?.id===sec.id} ocupanteActual={ocupanteActual} onEntrada={()=>{cerrar();abrirEntrada()}} onSalida={()=>{cerrar();setModal('SALIDA')}}/>}/>:<div className="slot-grid">{displayed.map(s=><button key={s.id} className={'slot '+(slot?.id===s.id?'selected':s.cupos_disponibles?'free':'occ')} disabled={!canOperate} title={s.nombre} onClick={()=>setSlot(s)}>{s.nombre}</button>)}</div>}</div>{mobile&&msg&&<div className="alert alert-info" style={{marginTop:12}}>{msg}</div>}{detail.cupos_disponibles===0&&<div className="alert alert-danger" style={{marginTop:12}}>Parqueadero lleno. Revise las alternativas disponibles.</div>}</div></div>
 <div><div className="card"><div className="card-head"><h3>Resumen {detail.nombre}</h3></div><div className="card-body"><div className={'grid '+(inhabilitados?'grid-3':'grid-2')}><div className="stat"><b>{detail.cupos_disponibles}</b><span>Disponibles</span></div><div className="stat"><b>{detail.capacidad_total-detail.cupos_disponibles-inhabilitados}</b><span>Ocupados</span></div>{inhabilitados>0&&<div className="stat"><b>{inhabilitados}</b><span>Inhabilitados temporalmente</span></div>}</div><div className="progress"><div style={{width:`${((detail.capacidad_total-detail.cupos_disponibles-inhabilitados)/Math.max(1,detail.capacidad_total-inhabilitados))*100}%`}}/></div>{slot&&canOperate&&!mobile&&<div className="alert alert-info" style={{marginTop:14}}><SlotDetails sec={slot} operable ocupanteActual={ocupanteActual} onEntrada={abrirEntrada} onSalida={()=>setModal('SALIDA')}/></div>}{!mobile&&msg&&<div className="alert alert-info" style={{marginTop:12}}>{msg}</div>}</div></div>
 {detail.cupos_disponibles===0&&<Alternatives parks={parks} current={detail.id}/>}</div></div></>}
 {modal&&<Modal title={`Confirmar ${modal.toLowerCase()}`} onClose={()=>{setModal(null);setOcupante(OCUPANTE_VACIO);setIntentoSubmit(false)}}>
 <p>¿Confirmar el registro de <b>{modal.toLowerCase()}</b> para el cupo <b>{slot?.nombre}</b>?</p>
 {modal==='ENTRADA'&&<div style={{marginTop:10}}>
  <p className="muted">Datos de la persona que ocupará el cupo:</p>
  {intentoSubmit&&!ocupanteCompleto&&<div className="alert alert-danger" style={{marginBottom:10}}>Complete los campos obligatorios resaltados abajo.</div>}
  <div className="field"><label className="label">Nombre completo</label><input className="input" required value={ocupante.nombreOcupante} onChange={e=>setOcupante({...ocupante,nombreOcupante:sanitizeName(e.target.value)})}/>{intentoSubmit&&erroresOcupante.nombreOcupante&&<div className="small" style={{color:'var(--crimson)',marginTop:4}}>{erroresOcupante.nombreOcupante}</div>}</div>
  <div className="field"><label className="label">Tipo de persona</label><div className="row" style={{gap:14}}>{Object.entries(TIPO_PERSONA_LABEL).map(([v,l])=><label key={v} className="row" style={{gap:4}}><input type="radio" name="tipoPersona" checked={ocupante.tipoPersona===v} onChange={()=>setOcupante({...ocupante,tipoPersona:v})}/> {l}</label>)}</div></div>
  <div className="field"><label className="label">Código de carné{ocupante.tipoPersona!=='ESTUDIANTE'&&' (opcional)'}</label><input className="input" required={ocupante.tipoPersona==='ESTUDIANTE'} maxLength={40} value={ocupante.codigoCarne} onChange={e=>setOcupante({...ocupante,codigoCarne:sanitizeDigits(e.target.value)})}/>{intentoSubmit&&erroresOcupante.codigoCarne&&<div className="small" style={{color:'var(--crimson)',marginTop:4}}>{erroresOcupante.codigoCarne}</div>}</div>
  <div className="field"><span className="label">Tipo de vehículo</span><div className="row"><span className="chip chip-blue">{VEHICULO_LABEL[ocupante.tipoVehiculo]}</span><span className="small muted">El cupo {slot?.nombre} es exclusivo para {ocupante.tipoVehiculo==='MOTO'?'motos':'carros'}.</span></div></div>
  <PlateCapture value={ocupante.placa} tipoVehiculo={ocupante.tipoVehiculo} error={intentoSubmit||ocupante.placa.length===6?erroresOcupante.placa:null} onChange={placa=>setOcupante({...ocupante,placa})}/>
 </div>}
 <div className="row" style={{justifyContent:'flex-end',marginTop:18,position:'sticky',bottom:-18,background:'var(--card)',padding:'12px 0',borderTop:'1px solid var(--border)'}}><button className="btn btn-ghost" onClick={()=>{setModal(null);setOcupante(OCUPANTE_VACIO);setIntentoSubmit(false)}}>Cancelar</button><button className={modal==='ENTRADA'?'btn btn-primary':'btn btn-danger'} onClick={()=>move(modal)}>Confirmar</button></div>
 </Modal>}
 </div>
}
function Alternatives({parks,current}){const a=parks.filter(p=>p.id!==current&&p.cupos_disponibles>0);return <div className="card" style={{marginTop:14}}><div className="card-head"><h3>Orientación</h3></div><div className="card-body">{a.length?a.map(p=><div className="row space" key={p.id} style={{padding:'8px 0'}}><span>{p.nombre}</span><b>{p.cupos_disponibles} libres</b></div>):<div className="empty">Sin disponibilidad en el campus.</div>}</div></div>}
// Detalle de un cupo: lo usa el resumen (escritorio) y la ventana junto al
// cupo en el plano (móvil). Los datos del ocupante y las acciones solo se
// muestran al portero del parqueadero (operable).
function SlotDetails({sec,operable,ocupanteActual,onEntrada,onSalida}){
 const inhabilitado=sec.habilitado===false;
 const libre=!inhabilitado&&!!sec.cupos_disponibles;
 return <div className="slot-details">
  <div className="row space"><b style={{fontSize:15}}>Cupo {sec.nombre}</b><span className={'chip '+(inhabilitado?'chip-neutral':libre?'chip-green':'chip-red')}>{inhabilitado?'Inhabilitado':libre?'Disponible':'Ocupado'}</span></div>
  <div className="row" style={{gap:6,marginTop:6}}><span className="chip chip-neutral">{sec.tipo_vehiculo==='MOTO'?'Solo motos':'Solo carros'}</span>{sec.es_preferencial&&<span className="chip chip-blue">Preferencial</span>}</div>
  {inhabilitado&&<div className="small" style={{marginTop:8}}><div><b>Motivo:</b> {sec.motivo_inhabilitacion||'No registrado'}</div>{sec.inhabilitado_hasta&&<div><b>Rehabilitación estimada:</b> {sec.inhabilitado_hasta.split('-').reverse().join('/')}</div>}</div>}
  {operable&&!libre&&!inhabilitado&&<div style={{marginTop:8}}>
   {ocupanteActual===undefined&&<div className="small muted">Cargando datos del ocupante…</div>}
   {ocupanteActual===null&&<div className="small muted">Sin datos de ocupante registrados para este cupo.</div>}
   {ocupanteActual&&<div className="small"><div><b>Ocupante:</b> {ocupanteActual.nombre_ocupante} ({TIPO_PERSONA_LABEL[ocupanteActual.tipo_persona]||ocupanteActual.tipo_persona})</div><div><b>Carné:</b> {ocupanteActual.codigo_carne||'No registra'}</div><div><b>Placa:</b> {ocupanteActual.placa}</div><div><b>Vehículo:</b> {ocupanteActual.tipo_vehiculo}</div><div><b>Desde:</b> {new Date(ocupanteActual.fecha_inicio).toLocaleString()}</div></div>}
  </div>}
  {operable&&!inhabilitado&&<div className="row" style={{marginTop:10}}>{libre?<button className="btn btn-primary" onClick={onEntrada}>Registrar entrada</button>:<button className="btn btn-danger" onClick={onSalida}>Registrar salida</button>}</div>}
 </div>
}
