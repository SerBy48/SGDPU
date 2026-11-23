import {useEffect,useState} from 'react';
import {LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid,ResponsiveContainer,ReferenceLine} from 'recharts';
import api from '../services/api';

// Métricas del lector de placas (solo ADMIN): qué tanto acepta el portero la
// placa sugerida por la cámara sin corregirla. Meta del piloto: >= 90 %.
const META=90;
const COLOR='#2e7d32';
const pct=(a,b)=>b?Math.round(1000*a/b)/10:null;
const fmtPct=v=>v==null?'—':`${String(v).replace('.',',')} %`;
const fmtConf=v=>v==null?'—':v.toFixed(3).replace('.',',');
const VEHICULO={CARRO:'Carro',MOTO:'Moto'};

function AceptadasTooltip({active,payload,label}){
 if(!active||!payload?.length)return null;
 const d=payload[0].payload;
 return <div className="card" style={{padding:'8px 12px',boxShadow:'0 4px 12px #0002'}}><b>{label}</b><div>{fmtPct(d.pct)} aceptadas sin corrección</div><div className="small muted">{d.aceptadas} de {d.lecturas} lecturas · {d.corregidas} corregidas · {d.sin_lectura} sin lectura</div></div>;
}

function Tabla({titulo,filas,clave,etiqueta=v=>v}){
 if(!filas.length)return null;
 return <div><h4 style={{margin:'14px 0 6px'}}>{titulo}</h4><div className="table-wrap"><table className="table"><thead><tr><th>{titulo.replace(/^Por /,'').replace(/^./,c=>c.toUpperCase())}</th><th>Lecturas</th><th>Aceptadas</th><th>Corregidas</th><th>Sin lectura</th><th>Confianza prom.</th></tr></thead>
  <tbody>{filas.map(f=><tr key={f[clave]??'—'}><td>{etiqueta(f[clave])}</td><td>{f.lecturas}</td><td>{f.aceptadas} ({fmtPct(pct(f.aceptadas,f.lecturas))})</td><td>{f.corregidas}</td><td>{f.sin_lectura}</td><td>{fmtConf(f.confianza_promedio)}</td></tr>)}</tbody></table></div></div>;
}

export default function LectorPlacasStats({year,month}){
 const [data,setData]=useState(null);
 const [error,setError]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  setError(false);
  api.get('/reports/lecturas-placa',{params:{year:year||undefined,month:month||undefined}})
   .then(r=>{if(!cancelled)setData(r.data)}).catch(()=>{if(!cancelled)setError(true)});
  return()=>{cancelled=true};
 },[year,month]);

 const r=data?.resumen;
 const tasa=r?pct(r.aceptadas,r.lecturas):null;
 const dias=(data?.porDia||[]).map(d=>({...d,pct:pct(d.aceptadas,d.lecturas)}));
 return <div className="card" style={{marginTop:16}}>
  <div className="card-head"><h3>Lector de placas</h3>{r?.lecturas>0&&<span className={`chip ${tasa>=META?'chip-green':'chip-amber'}`}>{tasa>=META?'Cumple':'Bajo'} la meta del {META} %</span>}</div>
  <div className="card-body">
   {error&&<div className="alert alert-danger">No fue posible cargar las métricas del lector.</div>}
   {!error&&r&&r.lecturas===0&&<div className="empty">Aún no hay entradas registradas con el lector de placas en este periodo.</div>}
   {!error&&r?.lecturas>0&&<>
    <div className="grid grid-3">
     <div className="stat"><b>{fmtPct(tasa)}</b><span>Aceptadas sin corrección ({r.aceptadas} de {r.lecturas})</span></div>
     <div className="stat"><b>{r.corregidas}</b><span>Corregidas por el portero</span></div>
     <div className="stat"><b>{r.sin_lectura}</b><span>Sin lectura (escrita a mano)</span></div>
     <div className="stat"><b>{fmtPct(pct(r.lecturas,r.entradas))}</b><span>Entradas que usaron el lector ({r.lecturas} de {r.entradas})</span></div>
     <div className="stat"><b>{fmtConf(r.confianza_promedio)}</b><span>Confianza promedio</span></div>
    </div>
    {dias.length>1&&<><h4 style={{margin:'14px 0 6px'}}>Aceptadas sin corrección por día</h4>
     <div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={dias} margin={{top:8,right:16,bottom:8}}>
      <CartesianGrid strokeDasharray="3 3" vertical={false}/>
      <XAxis dataKey="fecha" tick={{fontSize:10}}/>
      <YAxis domain={[0,100]} tickFormatter={v=>`${v} %`} tick={{fontSize:10}}/>
      <ReferenceLine y={META} stroke="var(--muted)" strokeDasharray="4 4" label={{value:`Meta ${META} %`,position:'insideTopRight',fontSize:10,fill:'var(--muted)'}}/>
      <Tooltip content={<AceptadasTooltip/>}/>
      <Line type="monotone" dataKey="pct" name="Aceptadas" stroke={COLOR} strokeWidth={2} dot={{r:4}} activeDot={{r:6}}/>
     </LineChart></ResponsiveContainer></div></>}
    <Tabla titulo="Por tipo de vehículo" filas={data.porVehiculo} clave="tipo_vehiculo" etiqueta={v=>VEHICULO[v]||v}/>
    <Tabla titulo="Por parqueadero" filas={data.porParqueadero} clave="parqueadero"/>
    <Tabla titulo="Por rango de confianza" filas={data.porConfianza} clave="rango"/>
    <Tabla titulo="Por versión de modelos" filas={data.porVersion} clave="version_modelos" etiqueta={v=>v||'—'}/>
    {data.correcciones.length>0&&<div><h4 style={{margin:'14px 0 6px'}}>Últimas correcciones</h4><div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Parqueadero</th><th>Vehículo</th><th>Sugerida</th><th>Registrada</th><th>Confianza</th></tr></thead>
     <tbody>{data.correcciones.map((c,i)=><tr key={i}><td>{new Date(c.fecha_inicio).toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'})}</td><td>{c.parqueadero}</td><td>{VEHICULO[c.tipo_vehiculo]||c.tipo_vehiculo}</td><td style={{fontFamily:'monospace'}}>{c.placa_sugerida}</td><td style={{fontFamily:'monospace'}}>{c.placa}</td><td>{fmtConf(c.confianza)}</td></tr>)}</tbody></table></div></div>}
   </>}
  </div>
 </div>;
}
