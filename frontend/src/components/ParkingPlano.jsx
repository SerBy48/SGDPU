import { useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeSvg } from '../utils/svg';

const POP_WIDTH=300, POP_MARGIN=8, POP_MIN_SPACE=220;

// Renderiza el plano real (planos_parqueadero.archivo_svg): cada cupo es un
// <polygon data-codigo="..."> ya definido en el SVG. En vez de reconstruir
// geometría en React, se inyecta el SVG tal cual y se le agregan/quitan las
// clases libre/ocupado/selected por DOM directo, casando data-codigo con
// secciones.nombre — evita recalcular formas irregulares (diagonales,
// perpendiculares) que sí trae el dibujo original.
//
// Con mouse, al pasar sobre un cupo se muestra solo su código (el SVG no trae
// rótulos). Con pantalla táctil no existe hover: al tocar un cupo se abre
// junto a él una ventana con renderPopover(sec, cerrar), para no tener que
// bajar hasta el resumen.
//
// selectedIds permite selección múltiple (inhabilitar cupos desde
// administración); variant="preview" colorea por tipo de vehículo para la
// revisión previa de un plano recién subido.
export default function ParkingPlano({svg,secciones,selectedId,selectedIds,canOperate,onSelect,renderPopover,variant}){
 const ref=useRef(null), wrapRef=useRef(null), popRef=useRef(null), pointerType=useRef('mouse');
 const [tip,setTip]=useState(null);
 const [pop,setPop]=useState(null);
 const porCodigo=useMemo(()=>Object.fromEntries(secciones.map(s=>[s.nombre,s])),[secciones]);
 const svgSeguro=useMemo(()=>sanitizeSvg(svg),[svg]);
 const seleccion=useMemo(()=>new Set(selectedIds||(selectedId!=null?[selectedId]:[])),[selectedIds,selectedId]);

 useEffect(()=>{
  const root=ref.current;
  if(!root) return;
  root.querySelectorAll('[data-codigo]').forEach(el=>{
   const sec=porCodigo[el.getAttribute('data-codigo')];
   el.classList.remove('libre','ocupado','selected','inhabilitado');
   if(!sec) return;
   if(seleccion.has(sec.id)){el.classList.add('selected');return}
   if(sec.habilitado===false){el.classList.add('inhabilitado');return}
   if(!sec.cupos_disponibles){el.classList.add('ocupado');return}
   // libre: los preferenciales ya traen class="puesto preferencial" en el SVG
   // (azul por defecto); no se agrega 'libre' encima para no taparlo de verde.
   if(!sec.es_preferencial) el.classList.add('libre');
  });
 },[porCodigo,seleccion,svgSeguro]);

 // Si el portero deselecciona el cupo (p. ej. tras registrar el movimiento) se cierra la ventana.
 useEffect(()=>{if(canOperate&&pop&&selectedId!==pop.id)setPop(null)},[selectedId]);

 // La ventana usa posición fija: se cierra al desplazar, redimensionar, con Esc o tocando fuera.
 useEffect(()=>{
  if(!pop) return;
  const close=e=>{if(e?.type==='scroll'&&popRef.current?.contains(e.target))return;setPop(null)};
  const onDown=e=>{if(!popRef.current?.contains(e.target)&&!ref.current?.contains(e.target))close()};
  const onKey=e=>{if(e.key==='Escape')close()};
  window.addEventListener('scroll',close,true);
  window.addEventListener('resize',close);
  document.addEventListener('pointerdown',onDown);
  document.addEventListener('keydown',onKey);
  return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);document.removeEventListener('pointerdown',onDown);document.removeEventListener('keydown',onKey)};
 },[!!pop]);

 const cupoDe=e=>{
  const el=e.target.closest?.('[data-codigo]');
  const sec=el&&porCodigo[el.getAttribute('data-codigo')];
  return sec?{el,sec}:null;
 };

 const handlePointerMove=e=>{
  if(e.pointerType!=='mouse') return;
  const hit=cupoDe(e);
  if(!hit){if(tip)setTip(null);return}
  if(tip?.codigo===hit.sec.nombre) return;
  const r=hit.el.getBoundingClientRect(), w=wrapRef.current.getBoundingClientRect();
  setTip({codigo:hit.sec.nombre,x:r.left+r.width/2-w.left,y:r.top-w.top});
 };

 const handleClick=e=>{
  const hit=cupoDe(e);
  if(!hit){setPop(null);return}
  if(canOperate) onSelect(hit.sec);
  if(pointerType.current==='mouse'||!renderPopover) return;
  const r=hit.el.getBoundingClientRect();
  const vw=document.documentElement.clientWidth, vh=window.innerHeight;
  const width=Math.min(POP_WIDTH,vw-POP_MARGIN*2);
  const left=Math.min(Math.max(r.left+r.width/2-width/2,POP_MARGIN),vw-width-POP_MARGIN);
  const below=vh-r.bottom-POP_MARGIN*2, above=r.top-POP_MARGIN*2;
  const placeBelow=below>=POP_MIN_SPACE||below>=above;
  setPop({id:hit.sec.id,codigo:hit.sec.nombre,left,width,
   ...(placeBelow?{top:r.bottom+POP_MARGIN,maxHeight:below}:{bottom:vh-r.top+POP_MARGIN,maxHeight:above})});
 };

 const popSec=pop&&porCodigo[pop.codigo];
 return <div className="plano-wrap" ref={wrapRef}>
  <div ref={ref} className={'plano-real'+(canOperate?'':' readonly')+(variant==='preview'?' plano-preview':'')}
   onPointerDown={e=>{pointerType.current=e.pointerType||'mouse'}}
   onPointerMove={handlePointerMove} onPointerLeave={()=>setTip(null)}
   onClick={handleClick} dangerouslySetInnerHTML={{__html:svgSeguro}}/>
  {tip&&<div className="plano-tip" style={{left:tip.x,top:tip.y}} role="tooltip">{tip.codigo}</div>}
  {popSec&&<div ref={popRef} className="plano-pop" role="dialog" aria-label={`Cupo ${popSec.nombre}`}
   style={{left:pop.left,width:pop.width,top:pop.top,bottom:pop.bottom,maxHeight:pop.maxHeight}}>
   {renderPopover(popSec,()=>setPop(null))}
  </div>}
 </div>;
}
