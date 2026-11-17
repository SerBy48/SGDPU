import {useEffect,useRef} from 'react';
import {NavLink} from 'react-router-dom';
import {LayoutDashboard,CarFront,History,Users,BarChart3,ShieldCheck,AlertTriangle,Settings,X} from 'lucide-react';

export default function Sidebar({user,open,mobile,onClose}){
 const closeRef=useRef(null);
 // Al abrir el menú en móvil se mueve el foco dentro de él (teclado/lectores de pantalla).
 useEffect(()=>{if(mobile&&open)closeRef.current?.focus()},[mobile,open]);
 const admin=user?.rol==='ADMIN';
 const items=[
  ['/dashboard','Dashboard',LayoutDashboard],
  ['/parqueaderos','Parqueaderos',CarFront],
  ...(admin?[['/historial','Historial',History],['/porteros','Porteros',Users],['/gestion-parqueaderos','Gestión de parqueaderos',Settings],['/estadisticas','Estadísticas y reportes',BarChart3],['/auditoria','Auditoría',ShieldCheck]]:[]),
  // Todos los roles autenticados pueden ver y reportar incidencias (así lo permite la API), por lo que el enlace debe estar visible para todos, no solo ADMIN/PORTERO
  ['/incidencias','Incidencias',AlertTriangle]
 ];
 return <aside id="sidebar-nav" className={'sidebar '+(open?'open':'')} aria-label="Navegación principal" {...(mobile?{role:'dialog','aria-modal':open||undefined,'aria-hidden':!open||undefined}:{})}>
  <div className="brand"><div><h2>SGDPU</h2><p>Universidad Surcolombiana</p></div>{mobile&&<button ref={closeRef} className="sidebar-close" onClick={onClose} aria-label="Cerrar menú"><X size={20}/></button>}</div>
  <div className="nav-title">Navegación</div>
  <nav className="nav">{items.map(([to,label,Icon])=><NavLink key={to} to={to} onClick={onClose} className={({isActive})=>isActive?'active':''}><Icon size={16} aria-hidden="true"/>{label}</NavLink>)}</nav>
 </aside>
}
