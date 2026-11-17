import axios from 'axios';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:4000/api'});
api.interceptors.request.use(c=>{
  const token=localStorage.getItem('sgdpu_access');
  if(token)c.headers.Authorization=`Bearer ${token}`;
  return c;
});
api.interceptors.response.use(r=>r,async err=>{
  if(err.response?.status===401 && localStorage.getItem('sgdpu_refresh')){
    try{
      const r=await axios.post(`${import.meta.env.VITE_API_URL||'http://localhost:4000/api'}/auth/refresh`,
        {refreshToken:localStorage.getItem('sgdpu_refresh')});
      localStorage.setItem('sgdpu_access',r.data.accessToken);
      localStorage.setItem('sgdpu_refresh',r.data.refreshToken);
      err.config.headers.Authorization=`Bearer ${r.data.accessToken}`;
      return api.request(err.config);
    }catch{}
  }
  return Promise.reject(err);
});
export default api;
