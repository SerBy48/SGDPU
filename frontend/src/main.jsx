import React,{useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,useNavigate,useLocation,Routes,Route,Navigate} from 'react-router-dom';import api from './services/api';import './styles/theme.css';import Login from './pages/Login';import VerifyEmail from './pages/VerifyEmail';import ResetPassword from './pages/ResetPassword';import Layout from './components/Layout';import Dashboard from './pages/Dashboard';import Parking from './pages/Parking';import {Porteros,History} from './pages/Admin';import Parkings from './pages/ParkingsAdmin';import Stats from './pages/Stats';import Audit from './pages/Audit';import Incidents from './pages/Incidents';import NotFound from './pages/NotFound';

function App(){
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true);const nav=useNavigate();const loc=useLocation();
 useEffect(()=>{const t=localStorage.getItem('sgdpu_access');if(t)api.get('/auth/me').then(r=>setUser(r.data.user)).catch(()=>{}).finally(()=>setLoading(false));else setLoading(false)},[]);
 const login=u=>{setUser(u);nav('/dashboard')};
 const logout=async()=>{try{await api.post('/auth/logout',{refreshToken:localStorage.getItem('sgdpu_refresh')})}catch{}localStorage.removeItem('sgdpu_access');localStorage.removeItem('sgdpu_refresh');setUser(null);nav('/login')};
 if(loading)return <div className="empty">Cargando SGDPU…</div>;
 if(!user)return <Routes><Route path="/verify-email" element={<VerifyEmail/>}/><Route path="/reset-password" element={<ResetPassword/>}/><Route path="*" element={<Login onLogin={login}/>}/></Routes>;
 const allowedAdmin=user.rol==='ADMIN';
 return <Layout user={user} onLogout={logout} resetKey={loc.pathname}><Routes>
  <Route path="/dashboard" element={<Dashboard user={user}/>}/>
  <Route path="/parqueaderos" element={<Parking user={user}/>}/>
  {allowedAdmin&&<><Route path="/porteros" element={<Porteros/>}/><Route path="/gestion-parqueaderos" element={<Parkings/>}/><Route path="/historial" element={<History/>}/><Route path="/estadisticas" element={<Stats/>}/><Route path="/auditoria" element={<Audit/>}/></>}
  <Route path="/incidencias" element={<Incidents user={user}/>}/>
  <Route path="*" element={<NotFound/>}/>
 </Routes></Layout>
}
createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);
