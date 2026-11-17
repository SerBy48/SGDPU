import {useState} from 'react';
import {useSearchParams,useNavigate} from 'react-router-dom';
import {Eye,EyeOff} from 'lucide-react';
import api from '../services/api';

export default function ResetPassword(){
 const [params]=useSearchParams(); const nav=useNavigate();
 const token=params.get('token');
 const [contrasena,setContrasena]=useState(''); const [showPwd,setShowPwd]=useState(false);
 const [loading,setLoading]=useState(false); const [msg,setMsg]=useState(''); const [done,setDone]=useState(false);
 const submit=async e=>{
  e.preventDefault();setLoading(true);setMsg('');
  try{
   await api.post('/auth/reset-password',{token,contrasena});
   setDone(true);setMsg('Contraseña actualizada. Ya puede iniciar sesión.');
  }catch(e){setMsg(e.response?.data?.message||'Token inválido o expirado.')}finally{setLoading(false)}
 };
 return <div className="login"><section className="login-form" style={{margin:'auto'}}><div className="login-box">
  <h2 className="form-title">Nueva contraseña</h2>
  {!token&&<div className="alert alert-danger">Enlace de recuperación inválido.</div>}
  {token&&!done&&<form onSubmit={submit}>
   {msg&&<div className="alert alert-info">{msg}</div>}
   <div className="field"><label className="label">Nueva contraseña</label><div className="password-field"><input type={showPwd?'text':'password'} minLength="8" className="input" required value={contrasena} onChange={e=>setContrasena(e.target.value)}/><button type="button" className="password-toggle" tabIndex={-1} onClick={()=>setShowPwd(v=>!v)} aria-label={showPwd?'Ocultar contraseña':'Mostrar contraseña'}>{showPwd?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>
   <button className="btn btn-primary" style={{width:'100%',padding:12}} disabled={loading}>{loading?'Procesando…':'Actualizar contraseña'}</button>
  </form>}
  {done&&<div className="alert alert-info">{msg}</div>}
  {(done||!token)&&<button className="btn btn-outline" style={{marginTop:14}} onClick={()=>nav('/login')}>Ir a iniciar sesión</button>}
 </div></section></div>
}
