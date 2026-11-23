import {useEffect,useRef,useState} from 'react';
import {Camera,RotateCcw,X} from 'lucide-react';
import {recognizePlate,precargarModelos,lectorDisponible} from '../utils/plateRecognition';
import {sanitizePlate} from '../utils/text';

// Captura de placa: el portero toma la foto con la cámara trasera y el lector
// (src/alpr, en el propio navegador) prellena el campo. La imagen no sale del
// dispositivo. El campo siempre es editable y nunca se registra nada solo: el
// portero confirma o corrige antes de pulsar Confirmar.
const FOTOGRAMAS=3, PAUSA_MS=120, ESPERA_MODELO_MS=30_000;
const NIVEL={
 verde:{chip:'chip-green',texto:'Lectura confiable. Verifique que coincida con la placa y confirme.'},
 ambar:{chip:'chip-amber',texto:'Revise la placa: los caracteres resaltados son dudosos.'},
 rojo:{chip:'chip-red',texto:'No fue posible leer la placa. Intente de nuevo o escríbala manualmente.'},
};
const esperar=ms=>new Promise(r=>setTimeout(r,ms));

// onLectura(l): {sugerida, confianza, versionModelos} para enviar al backend.
// onDetalle(r): resultado completo del lector (tiempos, votos...), opcional (banco de pruebas).
export default function PlateCapture({value,onChange,tipoVehiculo,error:plateErr,onLectura,onDetalle}){
 const [camara,setCamara]=useState('apagada'); // apagada | abriendo | activa
 const [modelo,setModelo]=useState(lectorDisponible()?'cargando':'no-disponible'); // cargando | lento | listo | error | no-disponible
 const [leyendo,setLeyendo]=useState(false);
 const [lectura,setLectura]=useState(null);
 const [aviso,setAviso]=useState('');
 const videoRef=useRef(null); const streamRef=useRef(null); const recorteRef=useRef(null);
 const montado=useRef(true);

 const stop=()=>{
  streamRef.current?.getTracks().forEach(t=>t.stop());
  streamRef.current=null;
  if(montado.current)setCamara('apagada');
 };

 // Precarga de modelos al abrir el modal de entrada (mientras el portero
 // diligencia los demás datos).
 useEffect(()=>{
  montado.current=true;
  if(!lectorDisponible())return()=>{montado.current=false;stop()};
  const lento=setTimeout(()=>{if(montado.current)setModelo(m=>m==='cargando'?'lento':m)},ESPERA_MODELO_MS);
  precargarModelos().then(()=>{if(montado.current)setModelo('listo')}).catch(()=>{if(montado.current)setModelo('error')}).finally(()=>clearTimeout(lento));
  return()=>{montado.current=false;clearTimeout(lento);stop()};
 },[]);

 // El <video> solo existe con la cámara activa: se le asigna el stream cuando ya está montado.
 useEffect(()=>{
  const v=videoRef.current;
  if(camara==='activa'&&v&&streamRef.current&&v.srcObject!==streamRef.current){
   v.srcObject=streamRef.current;
   v.play?.().catch(()=>{});
  }
 },[camara]);

 // Miniatura del recorte que leyó el modelo.
 useEffect(()=>{
  const c=recorteRef.current, r=lectura?.recorte;
  if(!c||!r)return;
  c.width=r.ancho; c.height=r.alto;
  c.getContext('2d').putImageData(new ImageData(r.datos,r.ancho,r.alto),0,0);
 },[lectura]);

 const start=async()=>{
  setAviso('');
  if(!navigator.mediaDevices?.getUserMedia){
   setAviso(window.isSecureContext?'Cámara no disponible, ingrese la placa manualmente.':'La cámara requiere una conexión segura (HTTPS). Ingrese la placa manualmente.');
   return;
  }
  setCamara('abriendo');
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   if(!montado.current){stream.getTracks().forEach(t=>t.stop());return}
   streamRef.current=stream; setCamara('activa');
  }catch{
   setCamara('apagada');
   setAviso('No fue posible acceder a la cámara. Ingrese la placa manualmente.');
  }
 };

 const capturar=async()=>{
  const video=videoRef.current;
  if(!video||video.readyState<2||!video.videoWidth){setAviso('La cámara aún no está lista, intente de nuevo.');return}
  const w=video.videoWidth, h=video.videoHeight;
  const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const fotogramas=[];
  for(let i=0;i<FOTOGRAMAS;i++){
   if(i)await esperar(PAUSA_MS);
   ctx.drawImage(video,0,0,w,h);
   fotogramas.push(ctx.getImageData(0,0,w,h));
  }
  stop();
  setLeyendo(true); setAviso('');
  try{
   const r=await recognizePlate(fotogramas,{tipoVehiculo});
   if(!montado.current)return;
   setLectura(r);
   if(r.formatoValido&&r.placa)onChange(sanitizePlate(r.placa));
   onLectura?.({sugerida:r.formatoValido?r.placa:'',confianza:r.confianza,versionModelos:r.versionModelos});
   onDetalle?.({...r,recorte:undefined,resolucion:`${w}x${h}`});
  }catch{
   if(!montado.current)return;
   setLectura(null);
   setAviso('El lector automático falló. Ingrese la placa manualmente.');
  }finally{
   if(montado.current)setLeyendo(false);
  }
 };

 const lectorListo=modelo==='listo';
 const sinLector=modelo==='error'||modelo==='no-disponible';
 const corregida=lectura?.formatoValido&&value!==lectura.placa;
 const nivel=lectura&&NIVEL[lectura.nivel];
 const dudoso=i=>(lectura?.confianzaPorCaracter?.[i]??1)<(lectura?.umbral??0.9);

 return <div className="field">
  <label className="label" htmlFor="placa-input">Placa</label>
  <div className="row" style={{gap:8}}>
   <input id="placa-input" className="input" style={{flex:'1 1 140px',width:'auto',textTransform:'uppercase',letterSpacing:'.08em'}} required maxLength={6} inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-invalid={!!plateErr} aria-describedby="placa-help placa-lector" value={value} onChange={e=>onChange(sanitizePlate(e.target.value))} placeholder={tipoVehiculo==='MOTO'?'ABC12D':'ABC123'}/>
   {!sinLector&&(camara==='apagada'
    ?<button type="button" className="btn btn-outline" onClick={start} disabled={leyendo}>{lectura?<><RotateCcw size={16}/> Leer de nuevo</>:<><Camera size={16}/> Usar cámara</>}</button>
    :<button type="button" className="btn btn-outline" onClick={stop}><X size={16}/> Cerrar cámara</button>)}
  </div>
  <div id="placa-help" className="small" style={{marginTop:4,color:plateErr?'var(--crimson)':'var(--muted)'}}>{plateErr||`6 caracteres, solo letras sin tildes y números · ${tipoVehiculo==='MOTO'?'moto: ABC12D':'carro: ABC123'}`}</div>

  <div id="placa-lector" aria-live="polite">
   {modelo==='lento'&&<div className="small muted" style={{marginTop:6}}>El lector automático está tardando en cargar; puede escribir la placa mientras tanto.</div>}
   {sinLector&&<div className="small muted" style={{marginTop:6}}>Lector automático no disponible en este dispositivo. Ingrese la placa manualmente.</div>}
   {aviso&&<div className="alert alert-info" style={{marginTop:8}}>{aviso}</div>}
   {leyendo&&<div className="small" style={{marginTop:8}}>Leyendo la placa…</div>}
   {lectura&&!leyendo&&nivel&&<div style={{marginTop:8,padding:10,border:'1px solid var(--border)',borderRadius:8,background:'var(--surface-2)'}}>
    <div className="row" style={{gap:10,alignItems:'center',flexWrap:'wrap'}}>
     {lectura.recorte&&<canvas ref={recorteRef} aria-label="Recorte de la placa leída" style={{height:44,maxWidth:160,borderRadius:4,border:'1px solid var(--border)',imageRendering:'auto'}}/>}
     {lectura.formatoValido&&<span aria-label={`Lectura sugerida ${lectura.placa}`} style={{fontFamily:'monospace',fontSize:20,fontWeight:700,letterSpacing:'.12em'}}>
      {[...lectura.placa].map((c,i)=><span key={i} style={dudoso(i)?{background:'var(--amber-bg)',color:'var(--amber)',borderRadius:3,outline:'1px solid var(--amber)'}:undefined}>{c}</span>)}
     </span>}
     <span className={`chip ${nivel.chip}`}>{lectura.nivel==='verde'?'Confiable':lectura.nivel==='ambar'?'Revisar':'Sin lectura'}{lectura.formatoValido?` · ${Math.round(lectura.confianza*100)} %`:''}</span>
    </div>
    <div className="small" style={{marginTop:6,color:'var(--mid)'}}>{corregida?'Placa corregida manualmente.':nivel.texto}</div>
   </div>}
  </div>

  {camara!=='apagada'&&<div style={{marginTop:8}}>
   <video ref={videoRef} autoPlay playsInline muted style={{width:'100%',maxWidth:360,borderRadius:8,background:'#000'}}/>
   <div className="small muted" style={{marginTop:4}}>Encuadre la placa completa, de frente y sin reflejos.</div>
   <div className="row" style={{marginTop:8,gap:8}}>
    <button type="button" className="btn btn-primary" onClick={capturar} disabled={camara!=='activa'||!lectorListo}>
     {lectorListo?'Capturar':'Cargando lector…'}
    </button>
   </div>
  </div>}
 </div>;
}
