import axios from 'axios';
const BASE_URL=import.meta.env.VITE_API_URL||'http://localhost:4000/api';
const api=axios.create({baseURL:BASE_URL});
api.interceptors.request.use(c=>{
  const token=localStorage.getItem('sgdpu_access');
  if(token)c.headers.Authorization=`Bearer ${token}`;
  return c;
});

// Un único refresh en curso compartido por todas las peticiones que reciben
// 401 a la vez. Los refresh tokens rotan (cada uso revoca el anterior): si dos
// peticiones paralelas refrescaran por separado, la segunda reutilizaría un
// token ya revocado y el backend lo trataría como robo de sesión, cerrando
// todas las sesiones del usuario.
let refreshing=null;
function refreshTokens(){
  if(!refreshing){
    refreshing=axios.post(`${BASE_URL}/auth/refresh`,{refreshToken:localStorage.getItem('sgdpu_refresh')})
      .then(r=>{
        localStorage.setItem('sgdpu_access',r.data.accessToken);
        localStorage.setItem('sgdpu_refresh',r.data.refreshToken);
        return r.data.accessToken;
      })
      .finally(()=>{refreshing=null});
  }
  return refreshing;
}

api.interceptors.response.use(r=>r,async err=>{
  const cfg=err.config;
  const isAuthCall=cfg?.url?.startsWith('/auth/login')||cfg?.url?.startsWith('/auth/refresh');
  if(err.response?.status===401 && cfg && !cfg._retry && !isAuthCall && localStorage.getItem('sgdpu_refresh')){
    cfg._retry=true;
    try{
      const token=await refreshTokens();
      cfg.headers.Authorization=`Bearer ${token}`;
      return api.request(cfg);
    }catch{
      // Sesión vencida o revocada: se limpia y se vuelve al login.
      localStorage.removeItem('sgdpu_access');
      localStorage.removeItem('sgdpu_refresh');
      if(window.location.pathname!=='/login') window.location.assign('/login');
    }
  }
  return Promise.reject(err);
});
export default api;
