// Banco de pruebas del lector de placas (fase F5: dispositivos). Solo existe en
// desarrollo (no entra al build): `npm run dev:movil` y abrir en el celular
// https://<IP-del-PC>:5173/pruebas/lector.html. No requiere iniciar sesión ni
// backend. Registra el tiempo de carga de los modelos y de cada lectura.
import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../src/styles/theme.css';
import PlateCapture from '../src/components/PlateCapture.jsx';
import {precargarModelos} from '../src/utils/plateRecognition.js';

const META_MS=2000; // plan §8: ≤ 2 s por captura en gama media

function dispositivo(){
 const n=navigator;
 return {
  navegador:n.userAgent,
  nucleos:n.hardwareConcurrency??null,
  memoriaGB:n.deviceMemory??null,
  pantalla:`${screen.width}x${screen.height} @${devicePixelRatio}`,
  contextoSeguro:window.isSecureContext,
  aislamientoOrigen:window.crossOriginIsolated,
  webgpu:!!n.gpu,
  webassembly:typeof WebAssembly!=='undefined',
 };
}

function Banco(){
 const [tipo,setTipo]=useState('CARRO');
 const [placa,setPlaca]=useState('');
 const [carga,setCarga]=useState({estado:'cargando'});
 const [lecturas,setLecturas]=useState([]);
 const [copiado,setCopiado]=useState(false);
 const info=dispositivo();

 useEffect(()=>{
  const t0=performance.now();
  precargarModelos().then(i=>setCarga({estado:'listo',ms:Math.round(performance.now()-t0),version:i.version}))
   .catch(e=>setCarga({estado:'error',error:String(e.message||e)}));
 },[]);

 const agregar=r=>setLecturas(ls=>[{hora:new Date().toLocaleTimeString('es-CO'),tipo,...r},...ls]);
 const tiempos=lecturas.map(l=>l.ms).sort((a,b)=>a-b);
 const mediana=tiempos.length?tiempos[Math.floor(tiempos.length/2)]:null;
 const informe={fecha:new Date().toISOString(),dispositivo:info,cargaModelos:carga,lecturas};
 const copiar=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(informe,null,1));setCopiado(true)}catch{setCopiado(false);alert(JSON.stringify(informe))}};

 return <div className="content" style={{maxWidth:720,margin:'0 auto'}}>
  <h1 className="page-title">Banco de pruebas · Lector de placas</h1>
  <p className="page-sub">Pruebe varias placas reales (de día, de noche, carros y motos) y copie los resultados al terminar.</p>
  <div className="card"><div className="card-body">
   <div className="field"><span className="label">Tipo de vehículo (lo fija el cupo en la app)</span>
    <div className="row" style={{gap:14}}>{['CARRO','MOTO'].map(t=><label key={t} className="row" style={{gap:4}}><input type="radio" name="tipo" checked={tipo===t} onChange={()=>{setTipo(t);setPlaca('')}}/> {t==='CARRO'?'Carro':'Moto'}</label>)}</div></div>
   <PlateCapture key={tipo} value={placa} onChange={setPlaca} tipoVehiculo={tipo} onDetalle={agregar}/>
  </div></div>

  <div className="card" style={{marginTop:16}}><div className="card-head"><h3>Resultados</h3>
   <button className="btn btn-outline" onClick={copiar} disabled={!lecturas.length}>{copiado?'Copiado':'Copiar resultados (JSON)'}</button></div>
   <div className="card-body">
    <div className="grid grid-3">
     <div className="stat"><b id="carga-ms">{carga.estado==='listo'?`${carga.ms} ms`:carga.estado==='error'?'Error':'…'}</b><span>Carga de modelos{carga.version?` (v. ${carga.version})`:''}</span></div>
     <div className="stat"><b>{mediana!=null?`${mediana} ms`:'—'}</b><span>Mediana por captura (meta ≤ {META_MS} ms)</span></div>
     <div className="stat"><b>{lecturas.length}</b><span>Lecturas</span></div>
    </div>
    {carga.error&&<div className="alert alert-danger" style={{marginTop:10}}>{carga.error}</div>}
    {lecturas.length>0&&<div className="table-wrap" style={{marginTop:12}}><table className="table"><thead><tr><th>Hora</th><th>Tipo</th><th>Placa</th><th>Nivel</th><th>Confianza</th><th>Votos</th><th>Tiempo</th><th>Resolución</th></tr></thead>
     <tbody>{lecturas.map((l,i)=><tr key={i}><td>{l.hora}</td><td>{l.tipo}</td><td style={{fontFamily:'monospace'}}>{l.placa||'—'}</td><td>{l.nivel}</td><td>{l.confianza}</td><td>{l.votos}/{l.fotogramas}</td><td style={{color:l.ms>META_MS?'var(--red)':undefined}}>{l.ms} ms</td><td>{l.resolucion}</td></tr>)}</tbody></table></div>}
    <h4 style={{margin:'14px 0 6px'}}>Dispositivo</h4>
    <pre className="small" style={{whiteSpace:'pre-wrap',margin:0}}>{JSON.stringify(info,null,1)}</pre>
   </div></div>
 </div>;
}

createRoot(document.getElementById('root')).render(<Banco/>);
