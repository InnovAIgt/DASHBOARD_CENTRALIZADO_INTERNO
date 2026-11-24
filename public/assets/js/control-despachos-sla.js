import { calcularSla, ESTADO, TIPO } from './despachos-reglas.js';
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = value => Number(value || 0).toLocaleString('es-GT', { maximumFractionDigits: 2 });
const pct = value => Number(value || 0).toLocaleString('es-GT', { maximumFractionDigits: 2 }) + '%';
const amount = (value, currency) => new Intl.NumberFormat('es-GT', { style:'currency', currency }).format(Number(value || 0));
const date = value => value ? value.split('-').reverse().join('/') : 'Sin fecha';
const colors = { [ESTADO.VENCIDO]:'#d44960', [ESTADO.POR_VENCER]:'#d4a921', [ESTADO.EN_TIEMPO]:'#40b896' };
const pill = value => '<span class="ds-pill ' + ({[ESTADO.VENCIDO]:'late',[ESTADO.POR_VENCER]:'soon',[ESTADO.EN_TIEMPO]:'ontime'}[value] || '') + '">' + escape(value) + '</span>';
const flag = country => '<img class="ds-flag" src="../../assets/flags/' + country.toLowerCase() + '.svg" alt=""> ' + country;
const key = doc => [doc.pais,doc.tipo,doc.docEntry,doc.documento].join(':');
const state = { data:null, country:'combined', priority:'', loading:false, error:'', pages:{STR:1,Reserva:1}, open:new Set(), filtered:[], request:0 };
function resetPages() { state.pages = {STR:1,Reserva:1}; }
function selectedCountries() { return (state.data?.paises || []).filter(p => state.country === 'combined' || p.codigo === state.country); }
function baseDocuments() {
  const start=$('dsStart').value, end=$('dsEnd').value, type=$('dsType').value, query=$('dsSearch').value.trim().toLocaleLowerCase('es');
  return selectedCountries().filter(p=>p.ok).flatMap(p=>p.documentos).filter(doc=> (!start || doc.fecha>=start) && (!end || doc.fecha<=end) && (!type || doc.tipo===type) && (!query || [doc.documento,doc.cliente,doc.codigoCliente,doc.bodegas,...doc.articulos.flatMap(a=>[a.codigo,a.descripcion])].join(' ').toLocaleLowerCase('es').includes(query))).sort((a,b)=>b.diasActivos-a.diasActivos||a.pais.localeCompare(b.pais)||a.documento.localeCompare(b.documento));
}
function showStatus() {
  const status=$('dsStatus');status.className='ds-status';
  if(state.loading) { status.textContent=state.data?'Mostrando la última consulta mientras se actualizan los documentos…':'Consultando STR y reservas de GT y SV. La consulta puede tardar hasta dos minutos.';return; }
  if(state.error) { status.classList.add('is-error');status.textContent=state.error+(state.data?' Se conserva la última consulta disponible.':'');return; }
  const countries=selectedCountries(), failed=countries.filter(p=>!p.ok);
  if(failed.length) { status.classList.add('is-partial');status.textContent='Consulta incompleta. '+failed.map(p=>p.codigo+': '+p.error).join(' · ')+'. Los indicadores solo incluyen los países con respuesta correcta.';return; }
  status.textContent=countries.map(p=>p.codigo+': '+(p.strSinDatos?'STR sin datos en origen; ':'')+(p.facturasSinDatos?'facturas sin datos en origen; ':'')+num(p.documentos.length)+' documentos pendientes en el universo acumulativo').join(' · ');
}
function render() {
  showStatus();
  const available=selectedCountries().some(p=>p.ok), base=baseDocuments(), sla=calcularSla(base), suffix=selectedCountries().some(p=>!p.ok)?' · parcial':'';
  state.filtered=base.filter(doc=>!state.priority||doc.estado===state.priority);
  const values={dsTotal:sla.total,dsUnits:sla.unidades,dsReserves:sla.reservas,dsTransfers:sla.str,dsLate:sla.vencidas,dsSoon:sla.porVencer,dsOnTime:sla.enTiempo};
  Object.entries(values).forEach(([id,value])=>$(id).textContent=available?num(value):'—');
  $('dsSla').textContent=available?pct(sla.porcentaje):'—';
  $('dsFormula').textContent=available?(sla.total?num(sla.dentroDeSla)+' dentro del plazo / '+num(sla.total)+' evaluados'+suffix:'Sin pendientes · 100% por regla del reporte'):'Sin consulta válida para evaluar';
  $('dsTotalSub').textContent='STR + reservas según filtros'+suffix;
  $('dsScope').textContent='Documentos emitidos del '+date($('dsStart').value)+' al '+date($('dsEnd').value)+'. Días hábiles calculados al corte '+date(state.data?.corte)+'.'+suffix;
  $('dsUpdated').textContent=state.data?'Última consulta: '+new Date(state.data.actualizado).toLocaleString('es-GT'):'';
  $('dsListScope').textContent=available?num(state.filtered.length)+' documentos en tablas'+(state.priority?' · '+state.priority:' · todos los plazos')+'. El SLA usa '+num(base.length)+' evaluados.':'Sin documentos disponibles para mostrar.';
  $('dsClearState').hidden=!state.priority;
  document.querySelectorAll('[data-state]').forEach(button=>button.setAttribute('aria-pressed',String(state.priority===button.dataset.state)));
  document.querySelectorAll('[data-country]').forEach(button=>{button.classList.toggle('is-active',state.country===button.dataset.country);button.setAttribute('aria-pressed',String(state.country===button.dataset.country));});
  $('dsExport').disabled=!state.filtered.length||state.loading;
  $('dsDistribution').innerHTML=available&&sla.total ? [[ESTADO.VENCIDO,sla.vencidas],[ESTADO.POR_VENCER,sla.porVencer],[ESTADO.EN_TIEMPO,sla.enTiempo]].map(([label,count])=>'<div class="ds-bar"><div><span>'+escape(label)+'</span><strong>'+num(count)+' · '+pct(count/sla.total*100)+'</strong></div><div class="ds-track"><i style="background:'+colors[label]+';width:'+(count/sla.total*100)+'%"></i></div></div>').join(''):'<p class="ds-empty">'+(available?'No hay pendientes en este período.':'Sin datos para calcular la distribución.')+'</p>';
  $('dsCountrySummary').innerHTML=selectedCountries().map(country=>{
    if(!country.ok)return '<div class="ds-country"><strong>'+flag(country.codigo)+' · consulta pendiente</strong><p>'+escape(country.error)+'</p></div>';
    const countryRows=base.filter(d=>d.pais===country.codigo),s=calcularSla(countryRows);
    return '<div class="ds-country"><strong>'+flag(country.codigo)+' · SLA '+pct(s.porcentaje)+'</strong><p>'+num(s.total)+' documentos · '+num(s.vencidas)+' vencidos de '+num(s.total)+' evaluados'+(s.total?' ('+pct(s.vencidas/s.total*100)+')':'')+'<br>'+num(s.unidades)+' unidades · '+num(s.str)+' STR · '+num(s.reservas)+' reservas<br>Neto en reservas: '+amount(s.monto,country.moneda)+(s.total?'':' · sin pendientes')+'</p></div>';
  }).join('');
  $('dsAudit').textContent=selectedCountries().filter(p=>p.ok).map(p=>p.codigo+': '+num(p.consultadas.facturas)+' facturas consultadas y '+num(p.consultadas.lineasSTR)+' líneas STR. Descartes de facturas por tipo: '+num(p.descartes.tipoFactura)+'. Fuera del período: '+num(p.descartes.fueraDePeriodo)+'.').join(' ');
  renderTable(TIPO.STR);renderTable(TIPO.RESERVA);
}
function renderTable(type) {
  const rows=state.filtered.filter(doc=>doc.tipo===type),isStr=type===TIPO.STR,host=$(isStr?'dsStrTable':'dsReserveTable'),count=$(isStr?'dsStrCount':'dsReserveCount');
  count.textContent=num(rows.length)+' documentos';
  if(!rows.length){const selected=selectedCountries();const unavailable=selected.every(p=>!p.ok);host.innerHTML='<p class="ds-empty">'+(state.loading&&!state.data?'Consultando documentos…':unavailable?'No hay una consulta válida para este país.':isStr&&selected.every(p=>p.strSinDatos)?'La API no tiene datos de STR para los países seleccionados.':'No hay '+(isStr?'solicitudes de traslado':'reservas pendientes')+' con estos filtros.')+'</p>';return;}
  const size=Number($('dsPageSize').value),pages=Math.ceil(rows.length/size);state.pages[type]=Math.min(Math.max(1,state.pages[type]),pages);const page=state.pages[type];
  host.innerHTML='<div class="ds-table-scroll"><table class="ds-table"><thead><tr><th>Documento</th><th>Cliente</th><th>País</th><th>Fecha documento</th><th>Unidades</th><th>Días hábiles</th><th>Plazo</th><th>'+(isStr?'Origen → destino':'Neto sin impuestos')+'</th><th>Detalle</th></tr></thead><tbody>'+rows.slice((page-1)*size,page*size).map(doc=>{
    const id=key(doc),opened=state.open.has(id),domId='ds-detail-'+encodeURIComponent(id);
    return '<tr><td><strong>'+escape(doc.documento)+'</strong></td><td>'+escape(doc.cliente)+'</td><td>'+flag(doc.pais)+'</td><td>'+date(doc.fecha)+'</td><td>'+num(doc.unidades)+'</td><td>'+num(doc.diasActivos)+'</td><td>'+pill(doc.estado)+'</td><td>'+(isStr?escape(doc.bodegas||'Sin dato'):amount(doc.total,doc.moneda))+'</td><td><button type="button" class="ds-button" data-doc="'+escape(id)+'" aria-expanded="'+opened+'" aria-controls="'+domId+'">'+(opened?'Ocultar':'Ver detalle')+'</button></td></tr><tr id="'+domId+'" '+(opened?'':'hidden')+'><td colspan="9">'+(opened?detail(doc):'')+'</td></tr>';
  }).join('')+'</tbody></table></div><div class="ds-pagination"><span>Página '+page+' de '+pages+' · '+num(rows.length)+' documentos</span><button type="button" class="ds-button" data-page-type="'+type+'" data-page="'+(page-1)+'" '+(page<=1?'disabled':'')+'>Anterior</button><button type="button" class="ds-button" data-page-type="'+type+'" data-page="'+(page+1)+'" '+(page>=pages?'disabled':'')+'>Siguiente</button></div>';
}
function detail(doc) {
  const isStr=doc.tipo===TIPO.STR;
  const fields=[['Tipo',doc.tipo],['Documento',doc.documento],['Cliente',doc.cliente],['Código cliente',doc.codigoCliente||'Sin dato'],['Fecha documento',date(doc.fecha)],['Días hábiles',num(doc.diasActivos)],['Estado del plazo',doc.estado],['Unidades',num(doc.unidades)],...(isStr?[['Origen → destino',doc.bodegas||'Sin dato'],['Tipo de solicitud',doc.tipoSolicitud||'Sin dato']]:[['Estado de factura',doc.estatus||'Sin dato'],['Identificador interno',doc.docEntry||'Sin dato'],['Neto de artículos',amount(doc.total,doc.moneda)]]),['Fecha real de despacho','API pendiente']];
  return '<section class="ds-detail"><h3>'+escape(doc.tipo)+' '+escape(doc.documento)+'</h3><div class="ds-detail-grid">'+fields.map(([label,value])=>'<div><span>'+escape(label)+'</span><strong>'+escape(value)+'</strong></div>').join('')+'</div><h4>Artículos</h4>'+(doc.articulos.length?'<div class="ds-table-scroll"><table class="ds-table"><thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th>'+(isStr?'':'<th>Total neto línea</th>')+'</tr></thead><tbody>'+doc.articulos.map(a=>'<tr><td>'+escape(a.codigo)+'</td><td>'+escape(a.descripcion)+'</td><td>'+num(a.cantidad)+'</td>'+(isStr?'':'<td>'+amount(a.total,doc.moneda)+'</td>')+'</tr>').join('')+'</tbody></table></div>':'<p class="ds-muted">Este documento no trae artículos.</p>')+'</section>';
}
async function load() {
  if(state.loading)return;state.loading=true;state.error='';const request=++state.request;$('dsRefresh').disabled=true;showStatus();
  try {
    const response=await fetch('/api/bodega/despachos?pais=combined',{cache:'no-store',signal:AbortSignal.timeout(130000)});
    const payload=await response.json();
    if(!response.ok||!Array.isArray(payload.paises)||!payload.paises.some(p=>p.ok))throw new Error(payload.error||payload.paises?.filter(p=>!p.ok).map(p=>p.codigo+': '+p.error).join(' · ')||'No se pudo consultar el reporte.');
    if(request!==state.request)return;
    state.data=payload;
    $('dsStart').min=payload.desde;$('dsStart').max=payload.corte;$('dsEnd').min=payload.desde;$('dsEnd').max=payload.corte;
    if(!$('dsEnd').value||$('dsEnd').dataset.auto==='true'){$('dsEnd').value=payload.corte;$('dsEnd').dataset.auto='true';}
    resetPages();
  } catch(error) { state.error=error.name==='TimeoutError'?'La consulta tardó más de lo esperado. Podés reintentar.':error.message; }
  finally { state.loading=false;$('dsRefresh').disabled=false;render(); }
}
function exportDocuments() {
  try { window.BodegaExcelExport.exportTable({headers:['País','Tipo','Documento','Cliente','Código cliente','Fecha','Días hábiles','Plazo','Unidades','Origen → destino','Neto reservas','Moneda'],rows:state.filtered.map(d=>[d.pais,d.tipo,d.documento,d.cliente,d.codigoCliente,d.fecha,d.diasActivos,d.estado,d.unidades,d.bodegas,d.tipo===TIPO.RESERVA?d.total:'',d.moneda]),sheetName:'Despachos',filename:'control-despachos-'+state.data.corte+'.xlsx',numericColumns:[6,8,10],title:'Control de despachos · STR y reservas',subtitle:'Corte '+state.data.corte+' · SLA base '+pct(calcularSla(baseDocuments()).porcentaje)+' · tabla '+(state.priority||'todos los plazos')}); }
  catch(error) { $('dsStatus').textContent=error.message;$('dsStatus').classList.add('is-error'); }
}
document.addEventListener('click',event=>{
  const country=event.target.closest('[data-country]');if(country){state.country=country.dataset.country;resetPages();render();return;}
  const priority=event.target.closest('[data-state]');if(priority){state.priority=state.priority===priority.dataset.state?'':priority.dataset.state;resetPages();render();return;}
  const page=event.target.closest('[data-page-type]');if(page){state.pages[page.dataset.pageType]=Number(page.dataset.page);renderTable(page.dataset.pageType);return;}
  const toggle=event.target.closest('[data-doc]');if(toggle){const id=toggle.dataset.doc;state.open.has(id)?state.open.delete(id):state.open.add(id);const doc=state.filtered.find(d=>key(d)===id);if(doc)renderTable(doc.tipo);}
});
$('dsRefresh').addEventListener('click',load);$('dsExport').addEventListener('click',exportDocuments);
$('dsClearState').addEventListener('click',()=>{state.priority='';resetPages();render();});
['dsType','dsSearch','dsPageSize'].forEach(id=>$(id).addEventListener(id==='dsSearch'?'input':'change',()=>{resetPages();render();}));
$('dsStart').addEventListener('change',()=>{if($('dsEnd').value&&$('dsStart').value>$('dsEnd').value)$('dsEnd').value=$('dsStart').value;resetPages();render();});
$('dsEnd').addEventListener('change',()=>{$('dsEnd').dataset.auto='false';if($('dsStart').value>$('dsEnd').value)$('dsStart').value=$('dsEnd').value;resetPages();render();});
$('dsReset').addEventListener('click',()=>{state.country='combined';state.priority='';$('dsStart').value=state.data?.desde||'2026-10-01';$('dsEnd').value=state.data?.corte||'';$('dsEnd').dataset.auto='true';$('dsType').value='';$('dsSearch').value='';resetPages();render();});
load();setInterval(load,300000);
