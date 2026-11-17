export async function downloadFile(api,path,params,filename){
 const r=await api.get(path,{params,responseType:'blob'});
 const url=URL.createObjectURL(r.data);
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 URL.revokeObjectURL(url);
}
