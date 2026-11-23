import {useEffect,useRef,useState} from 'react';import {BarChart,Bar,XAxis,YAxis,Tooltip,Legend,CartesianGrid,LineChart,Line,ResponsiveContainer,Cell} from 'recharts';import api from '../services/api';import {MESES} from '../utils/months';import {downloadFile} from '../utils/download';import LectorPlacasStats from '../components/LectorPlacasStats';

const COLOR_ENTRADAS='#2e7d32';
const COLOR_SALIDAS='#8f141b';
const COLOR_PICO='#c9973a';
const COLOR_HORA='#8f141b';

function horaLabel(h){return `${String(h).padStart(2,'0')}:00`;}
function nombreCorto(n){return n.replace(/^P\d+\s*-\s*/,'');}
function HoraTooltip({active,payload,label}){
 if(!active||!payload?.length) return null;
 return <div className="card" style={{padding:'8px 12px',boxShadow:'0 4px 12px #0002'}}><b>{horaLabel(label)}</b><div>{payload[0].value} movimiento(s)</div></div>;
}
function ParqueaderoTooltip({active,payload,label}){
 if(!active||!payload?.length) return null;
 return <div className="card" style={{padding:'8px 12px',boxShadow:'0 4px 12px #0002'}}><b>{label}</b>{payload.map(p=><div key={p.dataKey} style={{color:p.color}}>{p.name}: {p.value}</div>)}</div>;
}

export default function Stats(){const [data,setData]=useState({hours:[],byParking:[],trends:[]}),[year,setYear]=useState(0),[month,setMonth]=useState(0),[exporting,setExporting]=useState('');
const alive=useRef(true);
useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
useEffect(()=>{
 let cancelled=false;
 api.get('/reports/stats',{params:{year:year||undefined,month:month||undefined}}).then(r=>{if(!cancelled&&alive.current)setData(r.data)}).catch(()=>{});
 return()=>{cancelled=true};
},[year,month]);
const years=Array.from({length:6},(_,i)=>new Date().getFullYear()-i);
const params={year:year||undefined,month:month||undefined};
const download=async(path,filename)=>{setExporting(path);try{await downloadFile(api,path,params,filename)}catch(e){alert('No fue posible generar el archivo.')}finally{setExporting('')}};
const picoTotal=data.hours.length?Math.max(...data.hours.map(h=>h.total)):0;
const picoHora=data.hours.find(h=>h.total===picoTotal)?.hora;
return <div className="content"><h1 className="page-title">Estadísticas y reportes</h1><p className="page-sub">Horas pico, concurrencia y tendencias de uso. Configure filtros y exporte el reporte de estadísticas.</p><div className="toolbar">
 <select className="select" style={{width:130}} value={year} onChange={e=>setYear(Number(e.target.value))}><option value="0">Año</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
 <select className="select" style={{width:150}} value={month} onChange={e=>setMonth(Number(e.target.value))}><option value="0">Mes</option>{MESES.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
 <button className="btn btn-outline" disabled={!!exporting} onClick={()=>download('/reports/stats-excel','sgdpu_estadisticas.xlsx')}>{exporting==='/reports/stats-excel'?'Generando…':'Exportar Excel'}</button>
 <button className="btn btn-primary" disabled={!!exporting} onClick={()=>download('/reports/stats-pdf','sgdpu_estadisticas.pdf')}>{exporting==='/reports/stats-pdf'?'Generando…':'Exportar PDF'}</button>
</div>
<div className="grid grid-2">
 <div className="card"><div className="card-head"><h3>Horas de mayor actividad</h3>{data.hours.length>0&&<span className="chip chip-amber">Pico: {horaLabel(picoHora)} · {picoTotal} mov.</span>}</div><div className="card-body chart">{data.hours.length>0?<ResponsiveContainer width="100%" height="100%"><BarChart data={data.hours} margin={{bottom:8}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="hora" tickFormatter={horaLabel} interval={2} tick={{fontSize:10}} label={{value:'Hora del día',position:'insideBottom',offset:-5,fontSize:11}}/><YAxis allowDecimals={false} label={{value:'Movimientos',angle:-90,position:'insideLeft',fontSize:11}}/><Tooltip content={<HoraTooltip/>}/><Bar dataKey="total" name="Movimientos" radius={[3,3,0,0]}>{data.hours.map((h,i)=><Cell key={i} fill={h.total===picoTotal&&picoTotal>0?COLOR_PICO:COLOR_HORA}/>)}</Bar></BarChart></ResponsiveContainer>:<div className="empty">Sin datos para el filtro seleccionado.</div>}</div>{data.hours.length>0&&<div className="card-body" style={{paddingTop:0,display:'flex',gap:16,fontSize:12}}><span><i className="dot" style={{background:COLOR_HORA,display:'inline-block',width:9,height:9,borderRadius:2,marginRight:5}}/>Movimientos por hora</span><span><i className="dot" style={{background:COLOR_PICO,display:'inline-block',width:9,height:9,borderRadius:2,marginRight:5}}/>Hora pico</span></div>}</div>
 <div className="card"><div className="card-head"><h3>Movimientos por parqueadero</h3></div><div className="card-body chart">{data.byParking.length>0?<ResponsiveContainer width="100%" height="100%"><BarChart data={data.byParking} margin={{bottom:20}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="nombre" tickFormatter={nombreCorto} interval={0} tick={{fontSize:10}}/><YAxis allowDecimals={false} label={{value:'Movimientos',angle:-90,position:'insideLeft',fontSize:11}}/><Tooltip content={<ParqueaderoTooltip/>}/><Legend verticalAlign="top" height={28}/><Bar dataKey="entradas" name="Entradas" fill={COLOR_ENTRADAS} radius={[3,3,0,0]}/><Bar dataKey="salidas" name="Salidas" fill={COLOR_SALIDAS} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>:<div className="empty">Sin datos para el filtro seleccionado.</div>}</div></div>
</div>
<div className="card" style={{marginTop:16}}><div className="card-head"><h3>Tendencia diaria</h3></div><div className="card-body chart">{data.trends.length>0?<ResponsiveContainer width="100%" height="100%"><LineChart data={data.trends} margin={{bottom:8}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="fecha" label={{value:'Fecha',position:'insideBottom',offset:-5,fontSize:11}}/><YAxis allowDecimals={false} label={{value:'Movimientos',angle:-90,position:'insideLeft',fontSize:11}}/><Tooltip/><Legend verticalAlign="top" height={28}/><Line type="monotone" dataKey="entradas" name="Entradas" stroke={COLOR_ENTRADAS} strokeWidth={2} dot={{r:3}}/><Line type="monotone" dataKey="salidas" name="Salidas" stroke={COLOR_SALIDAS} strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer>:<div className="empty">Sin datos para el filtro seleccionado.</div>}</div></div><LectorPlacasStats year={year} month={month}/></div>}
