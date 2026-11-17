import {useEffect,useState} from 'react';
import {Menu,X,Moon,Sun,LogOut} from 'lucide-react';
import Sidebar from './Sidebar';
import ErrorBoundary from './ErrorBoundary';
import {useIsMobile} from '../utils/useMediaQuery';

function useDarkMode(){
 const [dark,setDark]=useState(()=>localStorage.getItem('sgdpu_theme')==='dark');
 useEffect(()=>{
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  localStorage.setItem('sgdpu_theme',dark?'dark':'light');
 },[dark]);
 // El tema oscuro solo aplica dentro de la sesión: al cerrar sesión (Layout se
 // desmonta) login/registro vuelven al tema claro. La preferencia se conserva
 // en localStorage y se restaura al volver a iniciar sesión.
 useEffect(()=>()=>document.documentElement.setAttribute('data-theme','light'),[]);
 return [dark,setDark];
}

export default function Layout({user,onLogout,children,resetKey}){
 const [open,setOpen]=useState(false);
 const [dark,setDark]=useDarkMode();
 const mobile=useIsMobile();
 const drawerOpen=mobile&&open;

 // Cierra el menú al navegar o al pasar a escritorio.
 useEffect(()=>{setOpen(false)},[resetKey,mobile]);
 // Con el menú abierto en móvil: Esc lo cierra y el fondo no se desplaza.
 useEffect(()=>{
  if(!drawerOpen) return;
  const onKey=e=>{if(e.key==='Escape')setOpen(false)};
  document.addEventListener('keydown',onKey);
  document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=''};
 },[drawerOpen]);

 return <div className="layout">
 <Sidebar user={user} open={drawerOpen} mobile={mobile} onClose={()=>setOpen(false)}/>
 {drawerOpen&&<div className="sidebar-backdrop" onClick={()=>setOpen(false)} aria-hidden="true"/>}
 <main className="main"><header className="topbar">
  {/* La hamburguesa solo existe en móvil; en escritorio la navegación lateral queda siempre visible. */}
  {mobile&&<button className="btn btn-ghost icon-btn" onClick={()=>setOpen(v=>!v)} aria-label={open?'Cerrar menú':'Abrir menú'} aria-expanded={open} aria-controls="sidebar-nav">{open?<X size={22}/>:<Menu size={22}/>}</button>}
  <div className="row topbar-right">
   <button className="btn btn-ghost icon-btn" onClick={()=>setDark(v=>!v)} aria-label={dark?'Activar modo claro':'Activar modo oscuro'} title={dark?'Modo claro':'Modo oscuro'}>{dark?<Sun size={22} strokeWidth={2.25}/>:<Moon size={22} strokeWidth={2.25}/>}</button>
   <div className="avatar avatar-sm" aria-hidden="true">{user?.nombre?.[0]||'U'}</div>
   <div className="user-mini"><strong>{user?.nombre} {user?.apellido}</strong><span>{user?.rol}</span></div>
   <button className="btn btn-ghost icon-btn" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={22} strokeWidth={2.25}/></button>
  </div>
 </header><ErrorBoundary resetKey={resetKey}>{children}</ErrorBoundary></main></div>
}
