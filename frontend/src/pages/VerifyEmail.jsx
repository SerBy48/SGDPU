import {useEffect,useState} from 'react';
import {useSearchParams,useNavigate} from 'react-router-dom';
import api from '../services/api';

export default function VerifyEmail(){
 const [params]=useSearchParams(); const nav=useNavigate();
 const [status,setStatus]=useState('loading'); const [msg,setMsg]=useState('Verificando su correo…');
 useEffect(()=>{
  const token=params.get('token');
  if(!token){setStatus('error');setMsg('Enlace de verificación inválido.');return}
  api.post('/auth/verify-email',{token})
   .then(()=>{setStatus('ok');setMsg('Correo verificado correctamente. Ya puede iniciar sesión.')})
   .catch(e=>{setStatus('error');setMsg(e.response?.data?.message||'Token inválido o expirado.')});
 },[]);
 return <div className="login"><section className="login-form" style={{margin:'auto'}}><div className="login-box">
  <h2 className="form-title">Verificación de correo</h2>
  <div className={`alert ${status==='error'?'alert-danger':'alert-info'}`}>{msg}</div>
  {status!=='loading'&&<button className="btn btn-primary" style={{marginTop:14}} onClick={()=>nav('/login')}>Ir a iniciar sesión</button>}
 </div></section></div>
}
