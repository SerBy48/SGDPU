import {useEffect,useRef,useState} from 'react';
import {Camera} from 'lucide-react';
import {recognizePlate} from '../utils/plateRecognition';
import {sanitizePlate} from '../utils/text';

export default function PlateCapture({value,onChange,tipoVehiculo,error:plateErr}){
 const [active,setActive]=useState(false); const [error,setError]=useState('');
 const videoRef=useRef(null); const streamRef=useRef(null);

 const stop=()=>{
  streamRef.current?.getTracks().forEach(t=>t.stop());
  streamRef.current=null; setActive(false);
 };
 useEffect(()=>()=>stop(),[]);

 const start=async()=>{
  setError('');
  if(!navigator.mediaDevices?.getUserMedia){setError('Cámara no disponible, ingrese la placa manualmente.');return}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
   streamRef.current=stream; setActive(true);
   if(videoRef.current)videoRef.current.srcObject=stream;
  }catch{
   setError('No fue posible acceder a la cámara. Ingrese la placa manualmente.');
  }
 };

 const capture=async()=>{
  const video=videoRef.current; if(!video)return;
  const canvas=document.createElement('canvas');
  canvas.width=video.videoWidth; canvas.height=video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0);
  canvas.toBlob(async blob=>{
   const texto=await recognizePlate(blob);
   if(texto)onChange(sanitizePlate(texto));
  },'image/jpeg',0.9);
  stop();
 };

 return <div className="field">
  <label className="label" htmlFor="placa-input">Placa</label>
  <div className="row" style={{gap:8}}>
   <input id="placa-input" className="input" style={{flex:'1 1 140px',width:'auto',textTransform:'uppercase',letterSpacing:'.08em'}} required maxLength={6} inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-invalid={!!plateErr} aria-describedby="placa-help" value={value} onChange={e=>onChange(sanitizePlate(e.target.value))} placeholder={tipoVehiculo==='MOTO'?'ABC12D':'ABC123'}/>
   <button type="button" className="btn btn-outline" onClick={active?stop:start}><Camera size={16}/> {active?'Cerrar cámara':'Usar cámara'}</button>
  </div>
  <div id="placa-help" className="small" style={{marginTop:4,color:plateErr?'var(--crimson)':'var(--muted)'}}>{plateErr||`6 caracteres, solo letras sin tildes y números · ${tipoVehiculo==='MOTO'?'moto: ABC12D':'carro: ABC123'}`}</div>
  {error&&<div className="alert alert-info" style={{marginTop:8}}>{error}</div>}
  {active&&<div style={{marginTop:8}}>
   <video ref={videoRef} autoPlay playsInline style={{width:'100%',maxWidth:320,borderRadius:8}}/>
   <div className="row" style={{marginTop:8}}><button type="button" className="btn btn-primary" onClick={capture}>Capturar</button></div>
  </div>}
 </div>;
}
