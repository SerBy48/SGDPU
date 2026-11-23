import { Router } from '../utils/router.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { TZ, LOCAL, movementRows } from '../utils/movements.js';

const router=Router();
router.use(requireAuth,requireRole('ADMIN'));

// El servidor de PostgreSQL corre en UTC (confirmado con SHOW timezone); sin
// convertir a la hora de Neiva/Bogotá, EXTRACT(HOUR/...)/DATE() sobre
// fecha_hora agrupan por hora y día UTC, desfasando "horas pico" y
// "tendencia diaria" ~5 horas respecto a la hora real en que ocurrió el
// movimiento (y pudiendo asignar un movimiento nocturno al día siguiente).
// TZ y LOCAL se definen en utils/movements.js.

const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// 'fecha' llega como texto 'YYYY-MM-DD' (ver db.js: se desactivó el parseo
// automático de DATE, que dependía del huso horario del proceso). Se formatea
// aquí como texto puro, sin pasar por Date/timezone.
function formatFecha(yyyyMmDd){
 const [y,m,d]=yyyyMmDd.split('-');
 return `${d}/${m}/${y}`;
}
function formatFechaHora(fechaHora){
 return new Date(fechaHora).toLocaleString('es-CO',{timeZone:TZ,dateStyle:'short',timeStyle:'short'});
}
function generadoEl(){
 return new Date().toLocaleString('es-CO',{timeZone:TZ,dateStyle:'long',timeStyle:'short'});
}

async function statsData(req){
 const year=req.query.year?Number(req.query.year):null;
 const month=Number(req.query.month||0);
 const parking=req.query.parking ? Number(req.query.parking) : null;
 const params=[]; const conds=[];
 if(year){params.push(year);conds.push(`EXTRACT(YEAR FROM ${LOCAL})=$${params.length}`);}
 if(month){params.push(month);conds.push(`EXTRACT(MONTH FROM ${LOCAL})=$${params.length}`);}
 if(parking){params.push(parking);conds.push(`m.id_parqueadero=$${params.length}`);}
 const filter=conds.length?conds.join(' AND '):'true';
 const [hours,byParking,trends]=await Promise.all([
  pool.query(`SELECT EXTRACT(HOUR FROM ${LOCAL})::int hora,COUNT(*)::int total FROM movimientos m WHERE ${filter} GROUP BY 1 ORDER BY 1`,params),
  pool.query(`SELECT p.nombre,COUNT(*)::int movimientos,COUNT(*) FILTER(WHERE m.tipo='ENTRADA')::int entradas,COUNT(*) FILTER(WHERE m.tipo='SALIDA')::int salidas FROM movimientos m JOIN parqueaderos p ON p.id=m.id_parqueadero WHERE ${filter} GROUP BY p.id,p.nombre ORDER BY movimientos DESC`,params),
  pool.query(`SELECT DATE(${LOCAL}) fecha,COUNT(*) FILTER(WHERE tipo='ENTRADA')::int entradas,COUNT(*) FILTER(WHERE tipo='SALIDA')::int salidas FROM movimientos m WHERE ${filter} GROUP BY DATE(${LOCAL}) ORDER BY fecha`,params)
 ]);
 const label=month&&year?`${MESES[month-1]} ${year}`:month?`${MESES[month-1]} (todos los años)`:year?`${year}`:'Todos los años';
 return {hours:hours.rows,byParking:byParking.rows,trends:trends.rows,label};
}
async function reportRows(req){
 return movementRows(pool,req.query);
}

router.get('/stats', async (req,res)=>{
 const {hours,byParking,trends}=await statsData(req);
 res.json({hours,byParking,trends});
});

router.get('/report-data', async (req,res)=>res.json(await reportRows(req)));

// Lector de placas: cuántas sugerencias acepta el portero sin corregir. Solo
// cuentan las entradas en que se usó el lector (placa_sugerida no nula; '' =
// el lector no leyó nada). Filtros: year, month (hora de Bogotá), parking.
const LOCAL_OCUPACION=`(o.fecha_inicio AT TIME ZONE '${TZ}')`;
const AGREGADO_LECTURAS=`COUNT(*)::int lecturas,
 COUNT(*) FILTER(WHERE o.placa_sugerida=o.placa)::int aceptadas,
 COUNT(*) FILTER(WHERE o.placa_sugerida<>'' AND o.placa_sugerida<>o.placa)::int corregidas,
 COUNT(*) FILTER(WHERE o.placa_sugerida='')::int sin_lectura,
 ROUND(AVG(o.confianza_lectura) FILTER(WHERE o.placa_sugerida<>''),3)::float confianza_promedio`;
const RANGO_CONFIANZA=`CASE WHEN o.confianza_lectura<0.5 THEN '< 0,50' WHEN o.confianza_lectura<0.8 THEN '0,50–0,79'
 WHEN o.confianza_lectura<0.9 THEN '0,80–0,89' WHEN o.confianza_lectura<0.95 THEN '0,90–0,94' ELSE '≥ 0,95' END`;

router.get('/lecturas-placa', async (req,res)=>{
 const year=Number(req.query.year)||null, month=Number(req.query.month)||0;
 const parking=/^\d+$/.test(String(req.query.parking||''))?Number(req.query.parking):null;
 const params=[]; const conds=[`o.placa_sugerida IS NOT NULL`];
 if(year){params.push(year);conds.push(`EXTRACT(YEAR FROM ${LOCAL_OCUPACION})=$${params.length}`);}
 if(month){params.push(month);conds.push(`EXTRACT(MONTH FROM ${LOCAL_OCUPACION})=$${params.length}`);}
 if(parking){params.push(parking);conds.push(`o.id_parqueadero=$${params.length}`);}
 const where=conds.join(' AND ');
 const periodo=conds.slice(1).join(' AND ')||'true';
 const q=sql=>pool.query(sql,params).then(r=>r.rows);
 const [[resumen],[uso],porDia,porVehiculo,porParqueadero,porVersion,porConfianza,correcciones]=await Promise.all([
  q(`SELECT ${AGREGADO_LECTURAS} FROM ocupaciones o WHERE ${where}`),
  q(`SELECT COUNT(*)::int entradas FROM ocupaciones o WHERE ${periodo}`),
  q(`SELECT DATE(${LOCAL_OCUPACION}) fecha,${AGREGADO_LECTURAS} FROM ocupaciones o WHERE ${where} GROUP BY 1 ORDER BY 1`),
  q(`SELECT o.tipo_vehiculo,${AGREGADO_LECTURAS} FROM ocupaciones o WHERE ${where} GROUP BY 1 ORDER BY 1`),
  q(`SELECT p.nombre parqueadero,${AGREGADO_LECTURAS} FROM ocupaciones o JOIN parqueaderos p ON p.id=o.id_parqueadero WHERE ${where} GROUP BY p.id,p.nombre ORDER BY lecturas DESC`),
  q(`SELECT o.version_modelos,${AGREGADO_LECTURAS} FROM ocupaciones o WHERE ${where} GROUP BY 1 ORDER BY 1`),
  q(`SELECT ${RANGO_CONFIANZA} rango,MIN(o.confianza_lectura)::float desde,${AGREGADO_LECTURAS} FROM ocupaciones o WHERE ${where} AND o.placa_sugerida<>'' GROUP BY 1 ORDER BY desde`),
  q(`SELECT o.fecha_inicio,p.nombre parqueadero,o.tipo_vehiculo,o.placa_sugerida,o.placa,o.confianza_lectura::float confianza,o.version_modelos
     FROM ocupaciones o JOIN parqueaderos p ON p.id=o.id_parqueadero
     WHERE ${where} AND o.placa_sugerida<>'' AND o.placa_sugerida<>o.placa ORDER BY o.fecha_inicio DESC LIMIT 20`),
 ]);
 res.json({resumen:{...resumen,entradas:uso.entradas},porDia,porVehiculo,porParqueadero,porVersion,porConfianza,correcciones});
});

// ---------- Paleta e identidad visual compartida por Excel y PDF ----------
// Los valores sin '#' (red/gold/green/lightRow/border) son para ARGB de
// ExcelJS ('FF'+valor); los que terminan en Hex/Rgb llevan '#' para pdfkit.
const BRAND={
 red:'8F141B', gold:'C9973A', green:'2E7D32', lightRow:'F6EFE9', border:'D9CFC4',
 crimsonHex:'#8F141B', goldRgb:'#C9973A', greenHex:'#2E7D32', lightRowHex:'#F6EFE9',
 dark:'#2B2B2B',
};

// ---------- Excel: estilos reutilizables ----------
function styleTitleSheet(ws,title,subtitle,colCount){
 ws.mergeCells(1,1,1,colCount);
 const t=ws.getCell(1,1); t.value=title; t.font={bold:true,size:14,color:{argb:'FFFFFFFF'}};
 t.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+BRAND.red}}; t.alignment={vertical:'middle'};
 ws.getRow(1).height=26;
 ws.mergeCells(2,1,2,colCount);
 const s=ws.getCell(2,1); s.value=subtitle; s.font={italic:true,size:10,color:{argb:'FF666666'}};
 ws.addRow([]);
}
function styleHeaderRow(row){
 row.eachCell(c=>{
  c.font={bold:true,color:{argb:'FFFFFFFF'}};
  c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+BRAND.gold}};
  c.alignment={vertical:'middle',horizontal:'center'};
  c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}};
 });
}
function styleDataRows(ws,startRow,endRow){
 for(let r=startRow;r<=endRow;r++){
  const row=ws.getRow(r);
  row.eachCell(c=>{
   c.border={top:{style:'hair',color:{argb:'FF'+BRAND.border}},bottom:{style:'hair',color:{argb:'FF'+BRAND.border}},left:{style:'hair',color:{argb:'FF'+BRAND.border}},right:{style:'hair',color:{argb:'FF'+BRAND.border}}};
   if((r-startRow)%2===1) c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+BRAND.lightRow}};
  });
 }
}

router.get('/excel', async (req,res)=>{
 const rows=await reportRows(req);
 const wb=new ExcelJS.Workbook();
 wb.creator='SGDPU'; wb.created=new Date();
 const ws=wb.addWorksheet('Movimientos',{views:[{state:'frozen',ySplit:4}]});
 [10,14,20,24,12,10,12,26,20].forEach((w,i)=>{ws.getColumn(i+1).width=w;});
 styleTitleSheet(ws,'SGDPU — Reporte de movimientos',`Generado: ${generadoEl()} · ${rows.length} registro(s)`,9);
 const headerRow=ws.getRow(4);
 headerRow.values=['ID','Tipo','Fecha y hora','Parqueadero','Cupo','Vehículo','Placa','Ocupante','Portero'];
 styleHeaderRow(headerRow);
 rows.forEach(r=>ws.addRow([r.id,r.tipo,formatFechaHora(r.fecha_hora),r.parqueadero,r.seccion||'—',r.tipo_vehiculo||'—',r.placa||'—',r.nombre_ocupante||'—',r.portero]));
 styleDataRows(ws,5,4+rows.length);
 ws.autoFilter={from:{row:4,column:1},to:{row:4,column:9}};
 res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 res.setHeader('Content-Disposition','attachment; filename="sgdpu_reporte.xlsx"');
 await wb.xlsx.write(res); res.end();
});

router.get('/pdf', async (req,res)=>{
 const rows=await reportRows(req);
 res.setHeader('Content-Type','application/pdf');
 res.setHeader('Content-Disposition','attachment; filename="sgdpu_reporte.pdf"');
 const PDF_ROW_LIMIT=500;
 const doc=new PDFDocument({margin:40,bufferPages:true}); doc.pipe(res);
 const subtitle=rows.length>PDF_ROW_LIMIT
  ?`Mostrando los primeros ${PDF_ROW_LIMIT} de ${rows.length} registros. Use filtros de fecha o exporte a Excel para el detalle completo.`
  :`${rows.length} registro(s) encontrados`;
 drawCoverHeader(doc,'Reporte de movimientos',subtitle);
 const cols=[
  {key:'tipo',label:'Tipo',width:52},
  {key:'fecha_hora',label:'Fecha y hora',width:82,fmt:formatFechaHora},
  {key:'parqueadero',label:'Parqueadero',width:100},
  {key:'seccion',label:'Cupo',width:40,fmt:v=>v||'—'},
  {key:'tipo_vehiculo',label:'Vehículo',width:46,fmt:v=>v||'—'},
  {key:'placa',label:'Placa',width:50,fmt:v=>v||'—'},
  {key:'portero',label:'Portero',width:0}, // 0 = ocupa el resto del ancho
 ];
 drawTable(doc,cols,rows.slice(0,PDF_ROW_LIMIT));
 finishPdf(doc);
});

// ---------- PDF: helpers visuales compartidos ----------
function drawCoverHeader(doc,title,subtitle){
 const w=doc.page.width;
 doc.rect(0,0,w,86).fill(BRAND.crimsonHex);
 doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('SGDPU',40,24);
 doc.fontSize(9).font('Helvetica').text('Sistema para la Gestión de Disponibilidad de Parqueaderos USCO',40,48);
 doc.fontSize(13).font('Helvetica-Bold').text(title,40,64);
 doc.fillColor(BRAND.dark).fontSize(9).font('Helvetica');
 doc.text(subtitle||'',40,98);
 doc.text(`Generado: ${generadoEl()}`,40,112);
 doc.moveDown(2);
 doc.y=136;
}
function sectionTitle(doc,text,{newPage=false}={}){
 if(newPage) doc.addPage();
 else if(doc.y>doc.page.height-doc.page.margins.bottom-40) doc.addPage();
 const y=doc.y;
 doc.rect(40,y,4,16).fill(BRAND.goldRgb);
 doc.fillColor(BRAND.dark).font('Helvetica-Bold').fontSize(12).text(text,50,y-1);
 doc.moveDown(0.6);
}
function finishPdf(doc){
 const range=doc.bufferedPageRange();
 for(let i=range.start;i<range.start+range.count;i++){
  doc.switchToPage(i);
  const w=doc.page.width,h=doc.page.height;
  // pdfkit calcula si un texto "cabe" comparando contra el margen inferior de
  // la página; al escribir tan cerca del borde, considera que no cabe y llama
  // addPage() (agregando una página en blanco al FINAL del documento, no en la
  // página actual) — por cada una de las 2 líneas del pie, en cada una de las
  // páginas reales. Anular el margen inferior mientras se escribe el pie evita
  // ese recálculo; se restaura enseguida para no afectar el resto del flujo.
  const bottomMargin=doc.page.margins.bottom;
  doc.page.margins.bottom=0;
  doc.fontSize(8).fillColor('#888888')
   .text(`SGDPU · Generado ${generadoEl()}`,40,h-30,{width:w-160,align:'left'})
   .text(`Página ${i-range.start+1} de ${range.count}`,w-160,h-30,{width:120,align:'right'});
  doc.page.margins.bottom=bottomMargin;
 }
 doc.end();
}

// Tabla simple con encabezado repetido en cada página y filas alternadas.
function drawTable(doc,cols,rows){
 const left=doc.page.margins.left;
 const usable=doc.page.width-doc.page.margins.left-doc.page.margins.right;
 const fixed=cols.reduce((s,c)=>s+(c.width||0),0);
 const flexCols=cols.filter(c=>!c.width);
 const flexWidth=flexCols.length?(usable-fixed)/flexCols.length:0;
 const widths=cols.map(c=>c.width||flexWidth);
 const rowH=18;
 function header(){
  const y=doc.y;
  doc.rect(left,y,usable,rowH).fill(BRAND.goldRgb);
  let x=left;
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
  cols.forEach((c,i)=>{doc.text(c.label,x+4,y+5,{width:widths[i]-8,align:c.align||'left'});x+=widths[i];});
  doc.y=y+rowH;
 }
 header();
 rows.forEach((r,idx)=>{
  if(doc.y+rowH>doc.page.height-doc.page.margins.bottom-30){doc.addPage();header();}
  const y=doc.y;
  if(idx%2===1){doc.rect(left,y,usable,rowH).fill(BRAND.lightRowHex);}
  let x=left;
  doc.fillColor(BRAND.dark).font('Helvetica').fontSize(8.5);
  cols.forEach((c,i)=>{
   const raw=r[c.key]; const val=c.fmt?c.fmt(raw):(raw??'—');
   doc.text(String(val),x+4,y+5,{width:widths[i]-8,align:c.align||'left'});
   x+=widths[i];
  });
  doc.y=y+rowH;
 });
}

// Gráfica de barras horizontales agrupadas (1 o varias series) hecha con
// primitivas de pdfkit, para conservar el lenguaje visual de "barras" también
// en el PDF exportado en vez de solo texto/listas.
function drawHorizontalBarChart(doc,{categories,series,maxLabelWidth=120,barHeight=12,gap=4}){
 const left=doc.page.margins.left;
 const usable=doc.page.width-doc.page.margins.left-doc.page.margins.right;
 const chartLeft=left+maxLabelWidth+8;
 const chartWidth=usable-maxLabelWidth-8-46; // deja espacio para el valor numérico a la derecha
 const maxVal=Math.max(1,...series.flatMap(s=>s.values));
 const groupHeight=series.length*(barHeight+gap);

 categories.forEach((cat,ci)=>{
  if(doc.y+groupHeight>doc.page.height-doc.page.margins.bottom-30) doc.addPage();
  const groupTop=doc.y;
  series.forEach((s,si)=>{
   const y=groupTop+si*(barHeight+gap);
   const val=s.values[ci]||0;
   const w=Math.round((val/maxVal)*chartWidth);
   if(si===0){
    doc.fillColor(BRAND.dark).font('Helvetica').fontSize(8.5)
     .text(String(cat),left,groupTop+((groupHeight-10)/2),{width:maxLabelWidth,align:'right'});
   }
   const color=typeof s.colorAt==='function'?s.colorAt(ci):s.color;
   doc.rect(chartLeft,y,Math.max(w,1),barHeight).fill(color);
   doc.fillColor(BRAND.dark).fontSize(8).text(String(val),chartLeft+w+6,y+2,{width:40});
  });
  doc.y=groupTop+groupHeight+2;
 });
}
function drawLegend(doc,items){
 let x=doc.page.margins.left;
 const y=doc.y;
 items.forEach(it=>{
  doc.rect(x,y+2,9,9).fill(it.color);
  doc.fillColor(BRAND.dark).font('Helvetica').fontSize(8.5).text(it.label,x+13,y,{width:100});
  x+=13+ (it.label.length*4.2) + 18;
 });
 doc.moveDown(1.4);
}

router.get('/stats-excel', async (req,res)=>{
 const {hours,byParking,trends,label}=await statsData(req);
 const wb=new ExcelJS.Workbook();
 wb.creator='SGDPU'; wb.created=new Date();

 const ws1=wb.addWorksheet('Horas de mayor actividad',{views:[{state:'frozen',ySplit:4}]});
 styleTitleSheet(ws1,'SGDPU — Horas de mayor actividad',`Periodo: ${label} · Generado: ${generadoEl()}`,2);
 const hr1=ws1.getRow(4); hr1.values=['Hora','Movimientos']; styleHeaderRow(hr1);
 ws1.getColumn(1).width=12; ws1.getColumn(2).width=16;
 const picoTotal=Math.max(0,...hours.map(h=>h.total));
 hours.forEach(h=>{
  const row=ws1.addRow([`${String(h.hora).padStart(2,'0')}:00`,h.total]);
  if(h.total===picoTotal&&picoTotal>0) row.eachCell(c=>c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+BRAND.gold}});
 });
 styleDataRows(ws1,5,4+hours.length);

 const ws2=wb.addWorksheet('Movimientos por parqueadero',{views:[{state:'frozen',ySplit:4}]});
 styleTitleSheet(ws2,'SGDPU — Movimientos por parqueadero',`Periodo: ${label} · Generado: ${generadoEl()}`,4);
 const hr2=ws2.getRow(4); hr2.values=['Parqueadero','Movimientos','Entradas','Salidas']; styleHeaderRow(hr2);
 ws2.getColumn(1).width=26; ws2.getColumn(2).width=14; ws2.getColumn(3).width=12; ws2.getColumn(4).width=12;
 byParking.forEach(p=>ws2.addRow([p.nombre,p.movimientos,p.entradas,p.salidas]));
 styleDataRows(ws2,5,4+byParking.length);
 const totalRow=ws2.addRow(['Total',byParking.reduce((s,p)=>s+p.movimientos,0),byParking.reduce((s,p)=>s+p.entradas,0),byParking.reduce((s,p)=>s+p.salidas,0)]);
 totalRow.font={bold:true}; totalRow.eachCell(c=>c.border={top:{style:'double'}});

 const ws3=wb.addWorksheet('Tendencia diaria',{views:[{state:'frozen',ySplit:4}]});
 styleTitleSheet(ws3,'SGDPU — Tendencia diaria',`Periodo: ${label} · Generado: ${generadoEl()}`,3);
 const hr3=ws3.getRow(4); hr3.values=['Fecha','Entradas','Salidas']; styleHeaderRow(hr3);
 ws3.getColumn(1).width=14; ws3.getColumn(2).width=12; ws3.getColumn(3).width=12;
 trends.forEach(t=>{
  const row=ws3.addRow([formatFecha(t.fecha),t.entradas,t.salidas]);
  row.getCell(2).font={color:{argb:'FF'+BRAND.green}}; row.getCell(3).font={color:{argb:'FF'+BRAND.red}};
 });
 styleDataRows(ws3,5,4+trends.length);

 res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 res.setHeader('Content-Disposition',`attachment; filename="sgdpu_estadisticas_${label.replace(/\s+/g,'_')}.xlsx"`);
 await wb.xlsx.write(res); res.end();
});

router.get('/stats-pdf', async (req,res)=>{
 const {hours,byParking,trends,label}=await statsData(req);
 res.setHeader('Content-Type','application/pdf');
 res.setHeader('Content-Disposition',`attachment; filename="sgdpu_estadisticas_${label.replace(/\s+/g,'_')}.pdf"`);
 const doc=new PDFDocument({margin:40,bufferPages:true}); doc.pipe(res);
 drawCoverHeader(doc,'Estadísticas y reportes',`Periodo: ${label}`);

 sectionTitle(doc,'Horas de mayor actividad',{newPage:true});
 if(hours.length){
  const picoTotal=Math.max(...hours.map(h=>h.total));
  const picoHora=hours.find(h=>h.total===picoTotal)?.hora;
  doc.fillColor('#666666').font('Helvetica').fontSize(8.5)
   .text(`Hora de mayor actividad: ${String(picoHora).padStart(2,'0')}:00 con ${picoTotal} movimientos (barra dorada).`,doc.page.margins.left,doc.y,{width:doc.page.width-doc.page.margins.left-doc.page.margins.right});
  doc.moveDown(0.4);
  drawHorizontalBarChart(doc,{
   categories:hours.map(h=>`${String(h.hora).padStart(2,'0')}:00`),
   series:[{values:hours.map(h=>h.total),colorAt:i=>hours[i].total===picoTotal?BRAND.goldRgb:BRAND.crimsonHex}],
  });
 } else doc.font('Helvetica').fontSize(9).fillColor(BRAND.dark).text('Sin datos para el periodo seleccionado.',doc.page.margins.left,doc.y);
 doc.moveDown(0.8);

 sectionTitle(doc,'Movimientos por parqueadero',{newPage:true});
 if(byParking.length){
  drawLegend(doc,[{label:'Entradas',color:BRAND.greenHex},{label:'Salidas',color:BRAND.crimsonHex}]);
  drawHorizontalBarChart(doc,{
   categories:byParking.map(p=>p.nombre),
   series:[
    {values:byParking.map(p=>p.entradas),color:BRAND.greenHex},
    {values:byParking.map(p=>p.salidas),color:BRAND.crimsonHex},
   ],
   maxLabelWidth:130,
  });
 } else doc.font('Helvetica').fontSize(9).fillColor(BRAND.dark).text('Sin datos para el periodo seleccionado.',doc.page.margins.left,doc.y);
 doc.moveDown(0.8);

 sectionTitle(doc,'Tendencia diaria',{newPage:true});
 if(trends.length){
  drawLegend(doc,[{label:'Entradas',color:BRAND.greenHex},{label:'Salidas',color:BRAND.crimsonHex}]);
  drawHorizontalBarChart(doc,{
   categories:trends.map(t=>formatFecha(t.fecha)),
   series:[
    {values:trends.map(t=>t.entradas),color:BRAND.greenHex},
    {values:trends.map(t=>t.salidas),color:BRAND.crimsonHex},
   ],
   maxLabelWidth:70,
  });
 } else doc.font('Helvetica').fontSize(9).fillColor(BRAND.dark).text('Sin datos para el periodo seleccionado.',doc.page.margins.left,doc.y);

 finishPdf(doc);
});

export default router;
