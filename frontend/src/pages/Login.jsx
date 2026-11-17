import {useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import api from '../services/api';

export default function Login({onLogin}){
 const [tab,setTab]=useState('login'); const [loading,setLoading]=useState(false); const [msg,setMsg]=useState('');
 const [form,setForm]=useState({correo:'',contrasena:'',nombre:'',apellido:''});
 const [forgotCorreo,setForgotCorreo]=useState('');
 const [showPwd,setShowPwd]=useState(false);
 const submit=async e=>{
  e.preventDefault();setLoading(true);setMsg('');
  try{
   if(tab==='login'){
    const r=await api.post('/auth/login',{correo:form.correo,contrasena:form.contrasena});
    localStorage.setItem('sgdpu_access',r.data.accessToken);localStorage.setItem('sgdpu_refresh',r.data.refreshToken);onLogin(r.data.user);
   }else if(tab==='register'){
    if(!/^[^\s@]+@usco\.edu\.co$/i.test(form.correo)){setMsg('Debe registrarse con un correo institucional @usco.edu.co');setLoading(false);return}
    const r=await api.post('/auth/register',form);setMsg(r.data.message);setTab('pending');
   }
  }catch(e){setMsg(e.response?.data?.message||'No fue posible completar la operación')}finally{setLoading(false)}
 };
 const submitForgot=async e=>{
  e.preventDefault();setLoading(true);setMsg('');
  try{const r=await api.post('/auth/forgot-password',{correo:forgotCorreo});setMsg(r.data.message)}
  catch(e){setMsg(e.response?.data?.message||'No fue posible completar la operación')}finally{setLoading(false)}
 };
 return <div className="login"><section className="login-hero"><div><img className="uni-logo" src="/universidad-surcolombiana.png" alt="Universidad Surcolombiana"/><h1 style={{marginTop:22}}>Gestión de<br/><span>Parqueaderos</span></h1><p>Consulta disponibilidad, gestiona cupos y centraliza la información operativa de los parqueaderos del campus.</p></div></section>
 <section className="login-form"><div className="login-box">
 {tab!=='forgot'&&tab!=='pending'&&<div className="tabs"><button className={tab==='login'?'active':''} onClick={()=>{setTab('login');setMsg('')}}>Iniciar sesión</button><button className={tab==='register'?'active':''} onClick={()=>{setTab('register');setMsg('')}}>Registrarse</button></div>}
 {tab==='pending'&&<>
  <h2 className="form-title">Revise su correo</h2>
  {msg&&<div className="alert alert-info">{msg}</div>}
  <p className="muted">Debe verificar su cuenta antes de iniciar sesión.</p>
  <button className="btn btn-outline" style={{marginTop:14}} onClick={()=>{setTab('login');setMsg('')}}>Volver a inicio de sesión</button>
 </>}
 {tab==='forgot'&&<>
  <h2 className="form-title">Recuperar contraseña</h2>
  {msg&&<div className="alert alert-info">{msg}</div>}
  <form onSubmit={submitForgot}>
   <div className="field"><label className="label">Correo institucional</label><input type="email" className="input" required value={forgotCorreo} onChange={e=>setForgotCorreo(e.target.value)}/></div>
   <button className="btn btn-primary" style={{width:'100%',padding:12}} disabled={loading}>{loading?'Procesando…':'Enviar enlace de recuperación'}</button>
  </form>
  <button className="btn btn-ghost" style={{marginTop:10}} onClick={()=>{setTab('login');setMsg('')}}>Volver a inicio de sesión</button>
 </>}
 {(tab==='login'||tab==='register')&&<>
 <h2 className="form-title">{tab==='login'?'Bienvenido al SGDPU':'Crear cuenta'}</h2>{tab==='login'&&<p className="muted" style={{marginBottom:22}}>Ingrese sus credenciales para continuar.</p>}
 {tab==='register'&&<p className="muted" style={{marginBottom:22}}>Use su correo institucional @usco.edu.co.</p>}
 {msg&&<div className="alert alert-info">{msg}</div>}
 <form onSubmit={submit}>
 {tab==='register'&&<div className="grid grid-2"><div className="field"><label className="label">Nombre</label><input className="input" required value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></div><div className="field"><label className="label">Apellido</label><input className="input" required value={form.apellido} onChange={e=>setForm({...form,apellido:e.target.value})}/></div></div>}
 <div className="field"><label className="label">Correo</label><input type="email" className="input" required placeholder={tab==='register'?'usuario@usco.edu.co':undefined} value={form.correo} onChange={e=>setForm({...form,correo:e.target.value})}/></div>
 <div className="field"><label className="label">Contraseña</label><div className="password-field"><input type={showPwd?'text':'password'} minLength="8" className="input" required value={form.contrasena} onChange={e=>setForm({...form,contrasena:e.target.value})}/><button type="button" className="password-toggle" tabIndex={-1} onClick={()=>setShowPwd(v=>!v)} aria-label={showPwd?'Ocultar contraseña':'Mostrar contraseña'}>{showPwd?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>
 <button className="btn btn-primary" style={{width:'100%',padding:12}} disabled={loading}>{loading?'Procesando…':tab==='login'?'Iniciar sesión':'Crear cuenta'}</button>
 </form>
 {tab==='login'&&<button className="btn btn-ghost" style={{marginTop:10}} onClick={()=>{setTab('forgot');setMsg('')}}>¿Olvidó su contraseña?</button>}
 {tab==='login'&&<p className="small muted" style={{marginTop:18}}>Demo: admin@sgdpu.local / Admin123! · portero@sgdpu.local / Portero123! · consultor@sgdpu.local / Consultor123!</p>}
 </>}
 </div></section></div>
}
