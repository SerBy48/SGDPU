import crypto from 'crypto';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

// Validación y saneamiento de los planos .svg que sube el administrador.
//
// Un SVG es un documento XML que el navegador ejecuta como parte de la página
// (se inyecta en el DOM del plano interactivo), así que puede traer código
// malicioso: <script>, atributos on*, <foreignObject> con HTML, enlaces
// javascript:, recursos externos (<image>, <use>, url() en CSS) que filtran
// datos o rastrean, o entidades XML (DOCTYPE/ENTITY) para ataques de
// expansión. Por eso:
//   1. Se rechazan de entrada los archivos que no cumplen lo básico (tamaño,
//      raíz <svg>, DOCTYPE/ENTITY, CSS con recursos externos).
//   2. Se sanea con DOMPurify (lista blanca de etiquetas/atributos SVG) más
//      reglas propias: sin imágenes, enlaces, <use> ni animaciones.
//   3. Se valida la estructura que necesita el sistema: cada cupo es un
//      elemento con data-codigo único y data-tipo carro|moto|discapacitado.
// El resultado (SVG saneado + informe) se muestra al administrador como
// revisión previa; al guardar, el servidor vuelve a sanear el archivo
// recibido (nunca confía en lo que reenvía el cliente).

export const MAX_SVG_BYTES=1024*1024;
export const MAX_CUPOS=2000;
const CODIGO=/^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/;
// data-tipo="discapacitado" es como vienen marcados los cupos preferenciales
// en los planos reales: es un cupo de carro con es_preferencial.
const TIPOS={carro:'CARRO',moto:'MOTO',discapacitado:'CARRO'};
const FORMAS_CUPO=new Set(['polygon','rect','path','polyline','circle','ellipse']);
// CSS que carga recursos o ejecuta código (en <style> o en atributos style).
const CSS_PELIGROSO=/@import|url\s*\((?!\s*['"]?#)|expression\s*\(|javascript:|behavior\s*:|-moz-binding/i;

const {window}=new JSDOM('');
const DOMPurify=createDOMPurify(window);
const PURIFY_CONFIG={
 USE_PROFILES:{svg:true,svgFilters:true},
 ADD_TAGS:['style'],
 FORBID_TAGS:['image','a','use','animate','animateMotion','animateTransform','set','foreignObject','script','iframe','audio','video','canvas'],
 FORBID_ATTR:['href','xlink:href'],
};
DOMPurify.addHook('uponSanitizeAttribute',(_node,data)=>{
 if(data.attrName==='style'&&CSS_PELIGROSO.test(data.attrValue)) data.keepAttr=false;
});

const err=(message,errores)=>Object.assign(new Error(message),{status:400,errores});

export function sanitizePlano(raw){
 if(typeof raw!=='string'||!raw.trim()) throw err('Debe adjuntar el archivo .svg del plano');
 const bytes=Buffer.byteLength(raw,'utf8');
 if(bytes>MAX_SVG_BYTES) throw err(`El plano pesa ${(bytes/1024).toFixed(0)} KB; el máximo permitido es ${MAX_SVG_BYTES/1024} KB`);
 const errores=[];
 if(/<!DOCTYPE|<!ENTITY/i.test(raw)) errores.push('El archivo declara DOCTYPE/ENTITY (no permitido: riesgo de expansión de entidades XML).');
 if(!/<svg[\s>]/i.test(raw)) errores.push('El archivo no contiene un elemento raíz <svg>.');
 for(const m of raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
  if(CSS_PELIGROSO.test(m[1])) errores.push('Un bloque <style> carga recursos externos o ejecuta código (@import, url(), expression…).');
 if(errores.length) throw err('El plano no superó la revisión de seguridad',errores);

 const limpio=DOMPurify.sanitize(raw,PURIFY_CONFIG);
 // DOMPurify reporta también el <body> envolvente de su parser interno.
 const eliminados=[...new Set(DOMPurify.removed
  .map(r=>r.element?`<${r.element.nodeName.toLowerCase()}>`:r.attribute?`atributo ${r.attribute.name}`:null)
  .filter(x=>x&&x!=='<body>'))];

 const doc=new JSDOM(`<!doctype html><body>${limpio}</body>`).window.document;
 const svg=doc.body.firstElementChild;
 if(!svg||svg.nodeName.toLowerCase()!=='svg') throw err('El plano no superó la revisión de seguridad',['Después del saneamiento no queda un <svg> válido.']);
 if(!svg.getAttribute('viewBox')) errores.push('El <svg> debe tener el atributo viewBox (necesario para que el plano se adapte a cualquier pantalla).');
 svg.removeAttribute('width'); svg.removeAttribute('height');

 const cupos=[]; const vistos=new Set(); const advertencias=[];
 svg.querySelectorAll('[data-codigo]').forEach(el=>{
  const codigo=(el.getAttribute('data-codigo')||'').trim();
  const tipoRaw=(el.getAttribute('data-tipo')||'').trim().toLowerCase();
  const forma=el.nodeName.toLowerCase();
  if(!CODIGO.test(codigo)){errores.push(`Código de cupo inválido "${codigo.slice(0,30)}": use letras, números y guion (máx. 20), p. ej. C-01.`);return}
  if(vistos.has(codigo)){errores.push(`El código ${codigo} está repetido; cada cupo debe tener un data-codigo único.`);return}
  if(!TIPOS[tipoRaw]){errores.push(`El cupo ${codigo} no tiene un data-tipo válido ("carro", "moto" o "discapacitado").`);return}
  if(!FORMAS_CUPO.has(forma)) advertencias.push(`El cupo ${codigo} es un <${forma}>; se recomienda polygon, rect o path para que se pueda colorear.`);
  vistos.add(codigo);
  el.setAttribute('data-tipo',tipoRaw);
  const preferencial=tipoRaw==='discapacitado'||el.classList.contains('preferencial');
  if(preferencial) el.classList.add('preferencial');
  cupos.push({codigo,tipo:TIPOS[tipoRaw],preferencial});
 });
 if(!cupos.length) errores.push('El plano no tiene cupos: cada puesto debe llevar data-codigo y data-tipo.');
 if(cupos.length>MAX_CUPOS) errores.push(`El plano tiene ${cupos.length} cupos; el máximo es ${MAX_CUPOS}.`);
 if(errores.length) throw err('El plano no cumple el formato requerido',errores);
 if(eliminados.length) advertencias.unshift(`Se eliminaron elementos no permitidos: ${eliminados.join(', ')}. Revise que el plano se vea completo en la vista previa.`);

 const svgFinal=svg.outerHTML;
 return {
  svg:svgFinal,
  sha256:crypto.createHash('sha256').update(svgFinal).digest('hex'),
  cupos,
  resumen:{
   total:cupos.length,
   carros:cupos.filter(c=>c.tipo==='CARRO').length,
   motos:cupos.filter(c=>c.tipo==='MOTO').length,
   preferenciales:cupos.filter(c=>c.preferencial).length,
   kb:Math.round(Buffer.byteLength(svgFinal)/1024),
  },
  advertencias,
  eliminados,
 };
}
