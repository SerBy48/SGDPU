import {useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';

export const MAX_PAGE_SIZE=100;
// Valores por los que avanzan las flechas; con el teclado se puede escribir cualquier número de 1 a MAX_PAGE_SIZE.
const PASOS=[5,10,25,50,75,100];
const clampSize=n=>Math.min(MAX_PAGE_SIZE,Math.max(1,Math.round(Number(n))||1));

export function usePagination(rows,defaultSize=50){
 const [page,setPage]=useState(1);
 const [pageSize,setPageSizeRaw]=useState(clampSize(defaultSize));
 const setPageSize=n=>setPageSizeRaw(clampSize(n));
 useEffect(()=>{setPage(1)},[rows.length,pageSize]);
 const totalPages=Math.max(1,Math.ceil(rows.length/pageSize));
 const safePage=Math.min(page,totalPages);
 const pageRows=rows.slice((safePage-1)*pageSize,safePage*pageSize);
 return {page:safePage,setPage,pageSize,setPageSize,totalPages,pageRows,total:rows.length};
}

function PageSizeStepper({value,onChange}){
 const [text,setText]=useState(String(value));
 const [aviso,setAviso]=useState(false);
 useEffect(()=>{setText(String(value))},[value]);
 const prev=[...PASOS].reverse().find(v=>v<value), next=PASOS.find(v=>v>value);
 const onType=e=>{
  const digits=e.target.value.replace(/\D/g,'').slice(0,3);
  if(digits&&Number(digits)>MAX_PAGE_SIZE){setText(String(MAX_PAGE_SIZE));setAviso(true);onChange(MAX_PAGE_SIZE);return}
  setAviso(false);setText(digits);
  if(digits&&Number(digits)>=1) onChange(Number(digits));
 };
 return <div className="row" style={{gap:8}}>
  <span className="small muted" id="page-size-label">Filas por página</span>
  <div className="page-size" role="group" aria-labelledby="page-size-label">
   <button type="button" disabled={!prev} onClick={()=>{setAviso(false);onChange(prev)}} aria-label="Menos filas por página"><ChevronLeft size={16}/></button>
   <input type="text" inputMode="numeric" value={text} onChange={onType} onBlur={()=>setText(String(value))} aria-label={`Filas por página (máximo ${MAX_PAGE_SIZE})`}/>
   <button type="button" disabled={!next} onClick={()=>{setAviso(false);onChange(next)}} aria-label="Más filas por página"><ChevronRight size={16}/></button>
  </div>
  {aviso&&<span className="small" style={{color:'var(--blue)'}} role="status">Máximo {MAX_PAGE_SIZE} filas por página.</span>}
 </div>;
}

export default function Pagination({page,setPage,pageSize,setPageSize,totalPages,total}){
 return <div className="pagination">
  <PageSizeStepper value={pageSize} onChange={setPageSize}/>
  <div className="row">
   <button className="btn btn-ghost" disabled={page<=1} onClick={()=>setPage(page-1)}>Anterior</button>
   <span className="small muted">Página {page} de {totalPages} · {total} registros</span>
   <button className="btn btn-ghost" disabled={page>=totalPages} onClick={()=>setPage(page+1)}>Siguiente</button>
  </div>
 </div>;
}
