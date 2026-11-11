'use strict';
// ── MÓDULO MSO — Vista general, Optimización y Reclamos M2M ─────────────────
// Réplica del dashboard MSO (kpi.red.com.sv) en estilo Intelfon.
// Requiere del HTML: activeTab, fmt. Todo pasa por el proxy local (server.js).

// ── CONFIG ──────────────────────────────────────────────────────────────────
// La define sims-plan.html; apunta al proxy desplegado del repo mso-api-proxy.
const MSO_BASE = window.MSO_API_BASE || 'http://localhost:3000/api/mso';
const EP = {
  simRes : MSO_BASE + '/simcards/resumen',
  simEvo : MSO_BASE + '/simcards/evolucion',
  simDet : MSO_BASE + '/simcards/detalle',
  simFil : MSO_BASE + '/simcards/filtros',
  recRes : MSO_BASE + '/reclamos/resumen',
  recCli : MSO_BASE + '/reclamos/clientes',
  recCas : MSO_BASE + '/reclamos/casos',
  recFil : MSO_BASE + '/reclamos/filtros',
  recResp: MSO_BASE + '/reclamos/responsables',
  recEvo : MSO_BASE + '/reclamos/evolucion',
  recCaso    : id => `${MSO_BASE}/reclamos/casos/${encodeURIComponent(id)}`,
  recCasoSims: id => `${MSO_BASE}/reclamos/casos/${encodeURIComponent(id)}/sims`,
};
const OPT_LIMIT = 50;

const STATUS_META = {
  'CAMBIOS'          : { label:'Cambios',    color:'#d95f6e', grad:'linear-gradient(180deg,#d95f6e,#c43c50)', pill:'mso-pill-cambios' },
  'MANTENER'         : { label:'Mantener',   color:'#4f8fd8', grad:'linear-gradient(180deg,#4f8fd8,#4f8fd8)', pill:'mso-pill-mantener' },
  'REVISION-MANTENER': { label:'Revisión',   color:'#c59600', grad:'linear-gradient(180deg,#c59600,#c59600)', pill:'mso-pill-revision' },
  'STOCK'            : { label:'Stock',      color:'#7fb0f0', grad:'linear-gradient(180deg,#7fb0f0,#4f8fd8)', pill:'mso-pill-stock' },
  'REEMPLAZOS'       : { label:'Reemplazos', color:'#d95f6e', grad:'linear-gradient(180deg,#d95f6e,#c43c50)', pill:'mso-pill-reemplazos' },
};

// ── ESTADO ──────────────────────────────────────────────────────────────────
const msoState = {
  // Filtros globales SIM Cards
  operador:'', pais:'', cliente:'', bolsa:'',
  filterOptions:null, resumen:null, evoRows:[],
  // Optimización
  optView:'bajar', optPage:1, optTotal:0, optSort:'client',
  downClient:'', upClient:'',
  allStatus:'', allSubStatus:'', allDirection:'',
  optAllRows:[], optRows:[], optClientes:[],
  // Reclamos
  recPais:'', recEtapa:'', recPeriodo:'', recResponsable:'', recFilterOptions:null,
};
let _resLoaded = false, _optLoaded = false, _recLoaded = false;

// ── UTILIDADES ──────────────────────────────────────────────────────────────
const fmtN    = n => Number(n || 0).toLocaleString('es-GT');
const num     = v => Number(v || 0);
const pctOrNA = v => (v == null ? 'N/A' : `${fmtN(Math.round(Number(v) * 10) / 10)}%`);
const capMb   = mb => { const v = num(mb); if (!v) return '—'; return v >= 1024 ? `${fmtN(v / 1024)} GB` : `${fmtN(v)} MB`; };
const datef   = v => { if (!v) return '—'; const m = String(v).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v).slice(0, 10); };
const esc     = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
const gEl     = id => document.getElementById(id);
const setTx   = (id, t) => { const e = gEl(id); if (e) e.textContent = t; };
const vShow   = (id, v) => { const e = gEl(id); if (e) e.style.display = v ? '' : 'none'; };
const clientVal  = c => String(c?.cod_cliente || c?.cliente || c || '');
const clientName = c => String(c?.cliente || c?.cliente_nombre || c || '');

function showErr(id, msg) { const e = gEl(id); if (e) { e.textContent = '⚠ ' + msg; e.style.display = ''; } }
function clearErr(id)     { vShow(id, false); }

// ── ESTADO "CONSULTANDO LA API" ─────────────────────────────────────────────
// Marca las secciones cuyos datos se están pidiendo, para que se vea cuál carga.
const BUSY = {
  resumen : ['globalKpiGrid', 'msoOpCardsPanel', 'msoStatusPanel', 'msoEvoPanel', 'msoPaisPanel', 'msoTopClientesPanel'],
  opt     : ['optKpis', 'optTableCard'],
  reclamos: ['recKpisPanel', 'recSlaPanel', 'recIndicadoresPanel', 'recClientesPanel', 'recCasosPanel', 'recResponsablesCard'],
};
function setBusy(ids, on) {
  ids.forEach(id => {
    const el = gEl(id);
    if (!el) return;
    el.classList.toggle('mso-busy', on);
    if (on) el.setAttribute('aria-busy', 'true'); else el.removeAttribute('aria-busy');
  });
}
// ═══════════════════════════════════════════════════════════════════════════
// ANIMACIONES — reveal en viewport bidireccional (igual que bodega) + gráficas
// ═══════════════════════════════════════════════════════════════════════════
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nextFrame = fn => requestAnimationFrame(() => requestAnimationFrame(fn));

// Barras y líneas: vuelven a cero al salir del viewport y crecen al entrar
// o cuando cambian los datos (guía §07: "draw / fill").
function resetCharts(root) {
  root.querySelectorAll('[data-w]').forEach(el => { el.style.width = '0%'; });
  root.querySelectorAll('[data-h]').forEach(el => el.style.setProperty('--bar-height', '0%'));
  root.querySelectorAll('.line-chart').forEach(el => el.classList.remove('chart-play'));
}
function playCharts(root) {
  if (REDUCED_MOTION) {
    root.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w; });
    root.querySelectorAll('[data-h]').forEach(el => el.style.setProperty('--bar-height', el.dataset.h));
    return;
  }
  nextFrame(() => {
    root.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w; });
    root.querySelectorAll('[data-h]').forEach(el => el.style.setProperty('--bar-height', el.dataset.h));
    root.querySelectorAll('.line-chart').forEach(el => { el.classList.remove('chart-play'); void el.offsetWidth; el.classList.add('chart-play'); });
  });
}
// Tras un render con datos nuevos: si el bloque está a la vista anima ya;
// si no, queda en cero y el observer lo anima al entrar.
function animateCharts(root) {
  if (!root) return;
  resetCharts(root);
  const host = root.closest('.reveal-hidden, .reveal-visible');
  if (!host || host.classList.contains('reveal-visible') || REDUCED_MOTION) playCharts(root);
}

const revealObs = REDUCED_MOTION ? null : new IntersectionObserver(entries => {
  entries.forEach(({ target: el, isIntersecting }) => {
    clearTimeout(el._revealTimer);
    if (isIntersecting) {
      const delay = el.dataset.revealDelay || '0s';
      el.style.transitionDelay = delay;
      el.classList.replace('reveal-hidden', 'reveal-visible');
      playCharts(el);
      // Se quita el retraso al terminar, para que el hover no quede demorado.
      el._revealTimer = setTimeout(() => { el.style.transitionDelay = ''; }, parseFloat(delay) * 1000 + 650);
    } else {
      el.style.transitionDelay = '0s';
      el.classList.replace('reveal-visible', 'reveal-hidden');
      resetCharts(el);
    }
  });
}, { rootMargin: '0px 0px -40px 0px' });

function markReveal(el, delay) {
  if (el.dataset.reveal) return;          // ya registrado
  el.dataset.reveal = '1';
  el.dataset.revealDelay = `${delay}s`;
  el.classList.add('reveal-hidden');
  nextFrame(() => revealObs.observe(el)); // pinta opacity:0 antes de observar
}

// Registra todo lo nuevo en el DOM. Es idempotente: se llama después de cada render.
function registerReveal() {
  if (!revealObs) return;
  document.querySelectorAll('.kpi-grid').forEach(g =>
    g.querySelectorAll(':scope > .kpi').forEach((el, i) => markReveal(el, +(i * 0.08).toFixed(2))));
  document.querySelectorAll('.op-cards-grid').forEach(g =>
    g.querySelectorAll(':scope > .op-card').forEach((el, i) => markReveal(el, +(i * 0.06).toFixed(2))));
  document.querySelectorAll('.card, .tabs, .filter-bar').forEach(el => markReveal(el, 0));
}
function setSync() {
  syncBusy(false);
}

// ── "Actualizado …": fecha en que MSO generó los datos (fecha_generacion de la API) ──
// No es la hora de la consulta: solo cambia cuando MSO genera información nueva, y es
// la misma para todos los que abran el dashboard. Se muestra en la pastilla bajo el
// título, en el pie "Última sincronización" y en la fecha del portal.
let fechaDatos = null;
// MSO sella fecha_generacion con la hora local de Guatemala pero la etiqueta como UTC
// ("...T07:42:00Z"): new Date() le restaria 6 h y mostraria la 1 a. m. en vez de las 7.
// Por eso una "Z" pelada se ignora y se leen los campos del texto tal cual.
// Un offset explicito ("...-06:00") si es confiable y se respeta, para que esto siga
// funcionando si algun dia MSO corrige la API.
function parseFechaMso(v) {
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m || /[+-]\d{2}:?\d{2}$/.test(s)) { const d = new Date(s); return isNaN(d) ? null : d; }
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  return isNaN(d) ? null : d;
}
async function cargarFechaDatos() {
  try {
    const fila = unwrap(await msoGet(EP.simDet, { limit: 1, offset: 0 })).rows[0];
    const f = fila && fila.fecha_generacion ? parseFechaMso(fila.fecha_generacion) : null;
    if (f) { fechaDatos = f; mostrarFechaDatos(); }
  } catch (e) { /* sin fecha: se conserva la que ya se mostraba */ }
}
function textoFechaDatos(f) {
  const hora = f.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  const fecha = f.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fecha}, ${hora}`;
}
// Pastilla con semáforo, igual que en Servicio al cliente (assets/js/ultima-actualizacion.js):
// verde hasta 24 h, ámbar hasta 48 h y roja después.
function pintarPastillaFecha(pill) {
  if (!pill || !fechaDatos || pill.classList.contains('std-sync-busy') || pill.classList.contains('std-sync-error')) return;
  const iso = fechaDatos.toISOString();
  const pintada = pill.querySelector('.ult-act') && pill.dataset.fecha === iso;
  if (pintada || (!pill.querySelector('.ult-act') && !/^Actualizado /.test(pill.textContent))) return;
  pill.dataset.fecha = iso;
  if (typeof window.pintarUltimaActualizacion === 'function') window.pintarUltimaActualizacion(pill, { fecha: iso, estado: 'exitoso' });
  else pill.textContent = 'Actualizado ' + textoFechaDatos(fechaDatos);
}
function mostrarFechaDatos() {
  if (!fechaDatos) return;
  pintarPastillaFecha(document.querySelector('.std-sync'));
  setTx('pageSync', 'Actualizado ' + textoFechaDatos(fechaDatos));
  setTx('footerTime', textoFechaDatos(fechaDatos));
  if (window.parent !== window) {
    try { window.parent.postMessage({ tipo: 'intelfon-datos-actualizados', fecha: fechaDatos.toISOString() }, '*'); } catch (e) { /* sin portal */ }
  }
}
// estandar.js escribe "Actualizado <hora de la consulta>" al terminar cada consulta
// (y le avisa esa hora al portal): se reemplaza por la pastilla con la fecha de los datos.
// La pastilla va en el extremo derecho del encabezado, después de "Actualizar datos".
new MutationObserver(() => {
  const pill = document.querySelector('.std-sync');
  const acciones = document.querySelector('.mso-header-actions');
  if (pill && acciones && acciones.lastElementChild !== pill) acciones.appendChild(pill);
  pintarPastillaFecha(pill);
}).observe(document.body, { childList: true, subtree: true, characterData: true });

// Resalta el aviso de estado mientras se está consultando la API.
function syncBusy(on, msg) {
  const el = gEl('pageSync');
  if (!el) return;
  el.classList.toggle('mso-sync-busy', on);
  if (on && msg) el.textContent = msg;
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ── FETCH ───────────────────────────────────────────────────────────────────
// forceRefresh: el servidor ignora su caché y vuelve a consultar MSO.
let forceRefresh = false;

async function msoGet(url, params = {}, intento = 1) {
  const u = new URL(url, window.location.origin);
  Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) u.searchParams.set(k, String(v)); });
  if (forceRefresh) u.searchParams.set('refresh', '1');
  // El segundo intento espera más: cubre el caso de un proxy que se durmió.
  const timeoutMs = intento === 1 ? 30000 : 75000;
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r    = await fetch(u.toString(), { signal: ctrl.signal });
    const body = await r.json().catch(() => ({}));
    if (r.status >= 502 && r.status <= 504 && intento === 1) return msoGet(url, params, 2);
    if (!r.ok || body.ok === false) throw new Error(body.detalle || body.error || `HTTP ${r.status}`);
    return body;
  } catch (e) {
    const red = e.name === 'AbortError' || e.name === 'TypeError';
    if (red && intento === 1) return msoGet(url, params, 2);
    if (e.name === 'AbortError') throw new Error(`Timeout de ${timeoutMs / 1000} s consultando la API MSO`);
    throw e;
  } finally { clearTimeout(tid); }
}

function unwrap(body) {
  const d    = body?.data !== undefined ? body.data : (body || {});
  const rows = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
  return {
    total   : num(body?.total ?? d?.total ?? rows.length),
    rows,
    kpis    : d?.kpis || {},
    por_op  : Array.isArray(d?.por_operador)        ? d.por_operador         : [],
    por_pais: Array.isArray(d?.por_pais)            ? d.por_pais             : [],
    clientes: Array.isArray(d?.clientes_mas_cambios) ? d.clientes_mas_cambios : [],
    raw     : d,
  };
}

function globalParams(extra = {}) {
  const p = {};
  if (msoState.operador) p.operador = msoState.operador;
  if (msoState.pais)     p.pais     = msoState.pais;
  if (msoState.cliente)  p.cliente  = msoState.cliente;
  if (msoState.bolsa)    p.bolsa    = msoState.bolsa;
  return { ...p, ...extra };
}

// La primera página trae el total; el resto se pide en paralelo (de 4 en 4)
// y se arma en orden. onProgress(cargadas, total) es opcional.
async function fetchAllDetail(params, onProgress) {
  const limit = 2000;
  const first = unwrap(await msoGet(EP.simDet, { ...params, limit, offset: 0 }));
  const total = first.total || first.rows.length;
  if (first.rows.length < limit || first.rows.length >= total) return first.rows;
  const offsets = [];
  for (let o = limit; o < total; o += limit) offsets.push(o);
  const pages = new Array(offsets.length);
  let next = 0, loaded = first.rows.length;
  onProgress?.(loaded, total);
  const worker = async () => {
    while (next < offsets.length) {
      const i = next++;
      pages[i] = unwrap(await msoGet(EP.simDet, { ...params, limit, offset: offsets[i] })).rows;
      loaded += pages[i].length;
      onProgress?.(loaded, total);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, offsets.length) }, worker));
  return first.rows.concat(...pages);
}

// ── TABS ────────────────────────────────────────────────────────────────────
function switchTab(tabKey) {
  activeTab = tabKey;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey));
  ['resumen-mso', 'opt-mso', 'reclamos-mso', 'informe-mso'].forEach(id => vShow('tab-' + id, id === tabKey));
  if (tabKey === 'resumen-mso'  && !_resLoaded) loadResumen();
  if (tabKey === 'resumen-mso'  &&  _resLoaded) renderEvo();
  if (tabKey === 'opt-mso'      && !_optLoaded) loadOpt();
  if (tabKey === 'reclamos-mso' && !_recLoaded) loadReclamos();
  if (tabKey === 'informe-mso') loadInforme();
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTROS GLOBALES
// ═══════════════════════════════════════════════════════════════════════════
const BOLSA_LABEL = { BOLSA: 'En bolsa · M2M', FUERA_BOLSA: 'Fuera de bolsa' };
const clientOption = c => ({ value: clientVal(c), label: clientName(c) || 'SIN CLIENTE', sub: [c.cod_cliente, c.pais].filter(Boolean).join(' · ') });

// Operaciones (Todos · GT · SV): marca el botón activo del grupo indicado.
function syncOpButtons(scope, value) {
  document.querySelectorAll(`[data-op-scope="${scope}"] .op-btn`).forEach(b => {
    const v = scope === 'mso' ? b.dataset.msoPais : b.dataset.recPais;
    b.classList.toggle('active', v === (value || ''));
  });
}

let msoXF = null;
function globalColumns() {
  const f = msoState.filterOptions || {};
  const bolsas = (f.bolsa && f.bolsa.length) ? f.bolsa : ['BOLSA', 'FUERA_BOLSA'];
  return [
    { key: 'operador', label: 'Operador', options: (f.operadores || []).map(v => ({ value: String(v), label: String(v) })), selected: selOf(msoState.operador) },
    { key: 'bolsa',    label: 'Bolsa',    options: bolsas.map(v => ({ value: String(v), label: BOLSA_LABEL[v] || String(v) })), selected: selOf(msoState.bolsa) },
    { key: 'cliente',  label: 'Cliente',  options: (f.clientes || []).map(clientOption), selected: selOf(msoState.cliente) },
  ];
}
function renderGlobalFilterChips() {
  const f = msoState.filterOptions || {};
  syncOpButtons('mso', msoState.pais);
  msoXF?.update(globalColumns());
}
// Como en Excel, un filtro no altera la selección de otra columna: las listas de
// Operador/Bolsa/Cliente se respetan tal cual (la API ya calcula las opciones de
// cada columna sin su propio filtro). Solo Operaciones se limpia si el país
// no existe en el contexto, como antes.
function sanitizeGlobalFilters() {
  const f = msoState.filterOptions || {};
  if (msoState.pais && !(f.paises || []).map(String).includes(msoState.pais)) { msoState.pais = ''; return true; }
  return false;
}
async function onGlobalFilterChange() {
  msoState.optPage = 1; msoState.downClient = ''; msoState.upClient = '';
  _optLoaded = false;
  renderGlobalFilterChips();
  const tasks = [loadResumen()];
  if (activeTab === 'opt-mso') tasks.push(loadOpt());
  await Promise.all(tasks);
}
function clearGlobalFilters() {
  msoState.operador = ''; msoState.pais = ''; msoState.cliente = ''; msoState.bolsa = '';
  onGlobalFilterChange();
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — VISTA GENERAL
// ═══════════════════════════════════════════════════════════════════════════
async function loadResumen(retry = true) {
  vShow('msoResLoader', !_resLoaded); clearErr('msoResError');
  setBusy(BUSY.resumen, true);
  try {
    const params = globalParams();
    const [filR, sumR, evoR] = await Promise.allSettled([
      msoGet(EP.simFil, params),
      msoGet(EP.simRes, params),
      msoGet(EP.simEvo),
      cargarFechaDatos(),
    ]);
    if (filR.status === 'fulfilled') {
      msoState.filterOptions = filR.value?.data || filR.value || {};
      if (sanitizeGlobalFilters() && retry) { renderGlobalFilterChips(); return await loadResumen(false); }
      renderGlobalFilterChips();
    }
    if (sumR.status === 'fulfilled') renderResumen(sumR.value);
    else showErr('msoResError', 'Resumen: ' + (sumR.reason?.message || 'sin respuesta'));
    if (evoR.status === 'fulfilled') { msoState.evoRows = mapEvoRows(evoR.value); renderEvo(); }
    _resLoaded = true;
    registerReveal();
    setSync();
  } catch (e) { showErr('msoResError', e.message); }
  finally    { vShow('msoResLoader', false); setBusy(BUSY.resumen, false); }
}

function popRow(label, value, cls, attrs) {
  return `<button type="button" class="kpi-pop-row ${cls}" ${attrs}><span>${label}</span><b>${fmtN(value)}</b></button>`;
}

// KPIs de SIM Cards a partir de la respuesta de /simcards/resumen.
// Los usan la Vista general y el PDF (sims-pdf.js), para que muestren las mismas cifras.
function simKpis(u) {
  const k = Object.keys(u.kpis).length ? u.kpis : (u.raw?.kpis || u.raw || {});
  return {
    k,
    total   : num(k.simcards_consolidadas ?? k.total),
    stock   : num(k.stock),
    mantener: num(k.mantener),
    revision: num(k.revision ?? k['revision-mantener']),
    reemp   : num(k.reemplazos),
    cambios : num(k.cambios),
    bajar   : num(k.bajar_plan ?? k.bajar),
    subir   : num(k.subir_plan ?? k.subir),
  };
}

function renderResumen(body) {
  const u = unwrap(body);
  const { k, total, stock, mantener, revision, reemp, cambios, bajar, subir } = simKpis(u);
  msoState.resumen = { total, stock, mantener, revision, reemp, cambios, bajar, subir };

  setTx('mkTotal',      fmtN(total));
  setTx('mkStock',      fmtN(stock));
  setTx('mkMantener',   fmtN(mantener));
  setTx('mkRevision',   fmtN(revision));
  setTx('mkReemplazos', fmtN(reemp));
  setTx('mkCambios',    fmtN(cambios));
  setTx('mkCambiosSub', `↓ ${fmtN(bajar)} bajar · ↑ ${fmtN(subir)} subir`);
  setTx('optCountBajar', fmtN(bajar));
  setTx('optCountSubir', fmtN(subir));

  const cPop = gEl('mkCambiosPopover');
  if (cPop) cPop.innerHTML = `<div class="kpi-pop-title">Cambios por acción y bolsa</div>` +
    popRow('↓ Bajar · En bolsa',       k.bajar_bolsa,       'mso-d', 'data-drill-dir="BAJAR_PLAN" data-drill-pool="BOLSA"') +
    popRow('↓ Bajar · Fuera de bolsa', k.bajar_fuera_bolsa, 'mso-d', 'data-drill-dir="BAJAR_PLAN" data-drill-pool="FUERA_BOLSA"') +
    popRow('↑ Subir · En bolsa',       k.subir_bolsa,       'mso-u', 'data-drill-dir="SUBIR_PLAN" data-drill-pool="BOLSA"') +
    popRow('↑ Subir · Fuera de bolsa', k.subir_fuera_bolsa, 'mso-u', 'data-drill-dir="SUBIR_PLAN" data-drill-pool="FUERA_BOLSA"');

  const rPop = gEl('mkRevisionPopover');
  if (rPop) rPop.innerHTML = `<div class="kpi-pop-title">Distribución de revisión</div>` +
    popRow('• En bolsa · M2M',   k.revision_bolsa,       'mso-r', 'data-drill-status="REVISION-MANTENER" data-drill-pool="BOLSA"') +
    popRow('• Fuera de bolsa',   k.revision_fuera_bolsa, 'mso-r', 'data-drill-status="REVISION-MANTENER" data-drill-pool="FUERA_BOLSA"');

  // Por operador
  const opCont = gEl('msoOpCards');
  if (opCont) {
    const ops = [...u.por_op].sort((a, b) => num(b.total ?? b.simcards_consolidadas) - num(a.total ?? a.simcards_consolidadas));
    const opSum = ops.reduce((s, o) => s + num(o.total ?? o.simcards_consolidadas), 0) || total || 1;
    opCont.innerHTML = ops.map((o, i) => {
      const nombre = o.operador || o.nombre || 'Operadora';
      const t = num(o.total ?? o.simcards_consolidadas), pct = ((t / opSum) * 100).toFixed(1);
      return `<div class="op-card" data-op-jump="${esc(nombre)}" title="Ver detalle de ${esc(nombre)}">
        <div class="op-card-header"><div class="op-card-name">${esc(nombre)}</div><span class="op-card-pct">${pct}%</span></div>
        <div class="op-card-total" style="color:${COLORS[i % COLORS.length]}">${fmtN(t)}</div>
        <div class="op-card-sub">SIMs consolidadas</div>
        <div class="bar-track"><div class="bar-fill" data-w="${pct}%" style="width:0%;background:${COLORS[i % COLORS.length]}"></div></div>
        <div class="op-metrics">
          <span>Cambios<b>${fmtN(o.cambios)}</b></span>
          <span>↓ Bajar<b>${fmtN(o.bajar ?? o.bajar_plan)}</b></span>
          <span>↑ Subir<b>${fmtN(o.subir ?? o.subir_plan)}</b></span>
        </div>
      </div>`;
    }).join('') || '<p class="mso-empty">Sin información de operadores.</p>';
  }

  // Distribución por estado (barras verticales)
  renderStatusChart([
    ['CAMBIOS', cambios], ['MANTENER', mantener], ['REVISION-MANTENER', revision], ['STOCK', stock], ['REEMPLAZOS', reemp],
  ].sort((a, b) => b[1] - a[1]));

  // Cambios por país
  const paisCont = gEl('msoPaisCards');
  if (paisCont) {
    paisCont.innerHTML = u.por_pais.map(p => {
      const nombre = p.pais || p.pais_nombre || '—';
      return `<div class="op-card op-card-row" data-pais-jump="${esc(nombre)}" title="Ver detalle de ${esc(nombre)}">
        <div><div class="op-card-name">${esc(nombre)}</div><div class="op-card-total">${fmtN(p.total ?? p.simcards_consolidadas)}</div></div>
        <div class="op-metrics">
          <span>Cambios<b>${fmtN(p.cambios)}</b></span>
          <span>↓ Bajar<b>${fmtN(p.bajar ?? p.bajar_plan)}</b></span>
          <span>↑ Subir<b>${fmtN(p.subir ?? p.subir_plan)}</b></span>
        </div>
      </div>`;
    }).join('') || '<p class="mso-empty">Sin información por país.</p>';
  }

  // Top clientes
  const cliCont = gEl('msoTopClientes');
  if (cliCont) {
    cliCont.innerHTML = u.clientes.length
      ? u.clientes.slice(0, 10).map(c => `<tr>
          <td><div class="cell-main">${esc(c.cliente_nombre || c.cliente || 'SIN CLIENTE')}</div><div class="cell-sub">${esc(c.cod_cliente || '')}</div></td>
          <td>${esc(c.pais || '—')}</td>
          <td style="text-align:right;font-family:var(--mono)"><b>${fmtN(c.cambios)}</b></td>
          <td style="text-align:right"><button class="filter-chip mso-mini" data-client-jump="${esc(clientVal(c))}">Ver</button></td>
        </tr>`).join('')
      : `<tr><td colspan="4" class="mso-empty-cell">Sin cambios para los filtros actuales.</td></tr>`;
  }
}

function renderStatusChart(entries) {
  const cont = gEl('msoStatusChart'); if (!cont) return;
  const max = Math.max(1, ...entries.map(e => e[1]));
  cont.innerHTML = entries.map(([st, v]) => {
    const m = STATUS_META[st] || { label: st, grad: 'linear-gradient(180deg,#4f8fd8,#4f8fd8)' };
    const h = Math.max(2.5, (v / max) * 100).toFixed(1);
    return `<div class="vertical-bar" data-kpi-status="${esc(st)}" title="${esc(m.label)}: ${fmtN(v)}">
      <b class="bar-value">${fmtN(v)}</b>
      <div class="bar-column"><span data-h="${h}%" style="--bar-height:0%;background:${m.grad}"></span></div>
      <label>${esc(m.label)}</label>
    </div>`;
  }).join('');
  animateCharts(cont);
  const leg = gEl('msoStatusLegend');
  if (leg) leg.innerHTML = entries.map(([st, v]) => {
    const m = STATUS_META[st] || { label: st, color: '#4f8fd8' };
    return `<span><i style="background:${m.color}"></i>${esc(m.label)}</span>`;
  }).join('');
}

// ── Evolución (línea SVG con área, 3 series y tooltip) ────────────────────
const EVO_SERIES = [
  { key:'cambios', label:'Total cambios',  cls:'',     color:'#d95f6e' },
  { key:'bolsa',   label:'En bolsa · M2M', cls:'cyan', color:'#4f8fd8' },
  { key:'fuera',   label:'Fuera de bolsa', cls:'blue', color:'#7fb0f0' },
];
function mapEvoRows(body) {
  return unwrap(body).rows.map(r => ({
    label    : String(r.fecha || '').slice(8, 10),
    fullLabel: datef(r.fecha),
    cambios  : num(r.cambios),
    bolsa    : num(r.bajar_bolsa) + num(r.subir_bolsa),
    fuera    : num(r.bajar_fuera_bolsa) + num(r.subir_fuera_bolsa),
  }));
}
function renderEvo() {
  const cont = gEl('msoEvoChart'); if (!cont) return;
  const rows = msoState.evoRows;
  const leg  = gEl('msoEvoLegend');
  if (leg) leg.innerHTML = EVO_SERIES.map(s => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('');

  if (!rows.length) {
    cont.innerHTML = '<p class="mso-empty" style="text-align:center;padding-top:80px">El histórico comenzará a registrarse desde esta versión.</p>';
    const hs = gEl('msoHistorySummary'); if (hs) hs.innerHTML = '<b>Histórico pendiente</b><span>Se registrará una fotografía diaria.</span>';
    return;
  }

  const W = Math.max(360, cont.clientWidth || 720), H = 240, L = 48, R = 14, T = 16, B = 30;
  const cw = W - L - R, ch = H - T - B;
  const max  = Math.max(1, ...rows.flatMap(r => EVO_SERIES.map(s => r[s.key])));
  const xFor = i => rows.length === 1 ? L + cw / 2 : L + cw * i / (rows.length - 1);
  const yFor = v => T + ch - (v / max) * ch;

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const y = T + ch * i / 4, val = Math.round(max - max * i / 4);
    grid += `<line class="chart-grid" x1="${L}" x2="${W - R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="chart-axis" x="${L - 7}" y="${(y + 3.5).toFixed(1)}" text-anchor="end">${fmtN(val)}</text>`;
  }
  const every = Math.max(1, Math.ceil(rows.length / 8));
  let xl = '';
  rows.forEach((r, i) => { if (i % every !== 0 && i !== rows.length - 1) return; xl += `<text class="chart-axis" x="${xFor(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(r.label)}</text>`; });

  const pts  = s => rows.map((r, i) => `${xFor(i).toFixed(1)},${yFor(r[s.key]).toFixed(1)}`).join(' ');
  const base = (T + ch).toFixed(1);
  const area = `M${xFor(0).toFixed(1)},${base} L${pts(EVO_SERIES[0]).split(' ').join(' L')} L${xFor(rows.length - 1).toFixed(1)},${base} Z`;
  const lines = EVO_SERIES.map(s => `<polyline class="chart-line ${s.cls}" points="${pts(s)}"/>`).join('');
  const dots  = rows.map((r, i) => `<circle class="chart-point" cx="${xFor(i).toFixed(1)}" cy="${yFor(r.cambios).toFixed(1)}" r="3"/>`).join('');

  cont.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de SIM Cards en cambios">${grid}<path class="chart-area" d="${area}"/>${lines}${dots}${xl}</svg><div class="chart-tooltip" id="msoEvoTip"></div>`;
  animateCharts(cont.parentElement);

  const svg = cont.querySelector('svg'), tip = gEl('msoEvoTip');
  svg.onmousemove = ev => {
    const rect = svg.getBoundingClientRect();
    const mx = (ev.clientX - rect.left) / rect.width * W;
    let idx = 0, min = Infinity;
    rows.forEach((_, i) => { const d = Math.abs(xFor(i) - mx); if (d < min) { min = d; idx = i; } });
    const row = rows[idx];
    tip.innerHTML = `<strong>${esc(row.fullLabel)}</strong>` + EVO_SERIES.map(s => `<span><i style="background:${s.color}"></i>${s.label}<b>${fmtN(row[s.key])}</b></span>`).join('');
    const px = xFor(idx) / W * rect.width;
    tip.style.left = `${Math.min(rect.width - 175, Math.max(4, px - 82))}px`;
    tip.style.top  = '4px';
    tip.classList.add('open');
  };
  svg.onmouseleave = () => tip.classList.remove('open');

  const initial = rows[0].cambios, current = rows[rows.length - 1].cambios;
  const red = initial - current, pct = initial ? Math.abs(red) / initial * 100 : 0;
  const cls = red > 0 ? 'good' : red < 0 ? 'bad' : 'neutral';
  const firstLabel = rows[0].label === '01' ? 'Inicio de mes' : `Primer registro ${rows[0].fullLabel}`;
  const variation  = red > 0 ? `↓ ${fmtN(red)} (${pct.toFixed(1)}%)` : red < 0 ? `↑ ${fmtN(-red)} (${pct.toFixed(1)}%)` : 'Sin variación';
  const hs = gEl('msoHistorySummary');
  if (hs) hs.innerHTML = `<b>${fmtN(initial)} → ${fmtN(current)}</b><span>${firstLabel} · Actual</span><em class="${cls}">${variation}</em>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — OPTIMIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════
function syncOptViewUI() {
  const v = msoState.optView;
  document.querySelectorAll('[data-opt-view]').forEach(b => b.classList.toggle('active', b.dataset.optView === v));
  vShow('optKpis', v !== 'todas');
  setTx('optTableTitle', { bajar:'SIM Cards para bajar plan', subir:'SIM Cards para subir plan', todas:'Consulta completa de SIM Cards' }[v]);
}

// Filtros de Optimización: en Bajar/Subir se filtra por cliente (en el navegador,
// sobre las SIM ya descargadas); en Todas por Status, Acción y Sub-status (API).
let optXF = null;
let optTodasOptions = { status: [], sub_status: [], acciones: [] };
const paneClientKey = () => (msoState.optView === 'bajar' ? 'downClient' : 'upClient');
const dirLabel = v => (v === 'BAJAR_PLAN' ? '↓ Bajar plan' : v === 'SUBIR_PLAN' ? '↑ Subir plan' : v);
function optColumns() {
  if (msoState.optView === 'todas') {
    const o = optTodasOptions;
    return [
      { key: 'allStatus',    label: 'Status',     options: o.status.map(v => ({ value: String(v), label: (STATUS_META[v] || {}).label || String(v) })), selected: selOf(msoState.allStatus) },
      { key: 'allDirection', label: 'Acción',     options: o.acciones.map(v => ({ value: String(v), label: dirLabel(v) })), selected: selOf(msoState.allDirection) },
      { key: 'allSubStatus', label: 'Sub-status', options: o.sub_status.map(v => ({ value: String(v), label: String(v) })), selected: selOf(msoState.allSubStatus) },
    ];
  }
  return [
    { key: paneClientKey(), label: 'Cliente', options: msoState.optClientes.map(c => ({ ...clientOption(c), count: c.total })), selected: selOf(msoState[paneClientKey()]) },
  ];
}
function renderOptFilters() { optXF?.update(optColumns()); }
function clearOptFilters() {
  msoState.downClient = ''; msoState.upClient = '';
  msoState.allStatus = ''; msoState.allSubStatus = ''; msoState.allDirection = '';
  msoState.optPage = 1;
  loadOpt();
}
function groupClients(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r.cod_cliente || ''}|${r.cliente || ''}|${r.pais || ''}`;
    if (!map.has(key)) map.set(key, { cliente: r.cliente || 'SIN CLIENTE', cod_cliente: r.cod_cliente || '', pais: r.pais || '', total: 0 });
    map.get(key).total += 1;
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.cliente.localeCompare(b.cliente));
}
function sortRows(rows, sort) {
  const c = [...rows];
  if (sort === 'operator')    c.sort((a, b) => String(a.operador).localeCompare(String(b.operador)) || String(a.cliente).localeCompare(String(b.cliente)));
  else if (sort === 'consumption') c.sort((a, b) => num(b.promedio_mes2y3) - num(a.promedio_mes2y3));
  else c.sort((a, b) => String(a.cliente).localeCompare(String(b.cliente)) || String(a.operador).localeCompare(String(b.operador)));
  return c;
}

async function loadOpt() {
  clearErr('msoOptError'); syncOptViewUI();
  const tbody = gEl('optTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="mso-empty-cell">Cargando…</td></tr>';
  const view = msoState.optView;
  setBusy(BUSY.opt, true);
  try {
    if (view === 'todas') {
      const base = globalParams({ status: msoState.allStatus, sub_status: msoState.allSubStatus, accion: msoState.allDirection });
      const [detR, filR] = await Promise.allSettled([
        msoGet(EP.simDet, { ...base, limit: OPT_LIMIT, offset: (msoState.optPage - 1) * OPT_LIMIT }),
        msoGet(EP.simFil, base),
      ]);
      if (filR.status === 'fulfilled') renderOptTodasChips(filR.value?.data || filR.value || {});
      if (detR.status !== 'fulfilled') throw detR.reason;
      const u = unwrap(detR.value);
      msoState.optTotal = u.total;
      msoState.optRows  = sortRows(u.rows, msoState.optSort);
    } else {
      const accion = view === 'bajar' ? 'BAJAR_PLAN' : 'SUBIR_PLAN';
      const all = await fetchAllDetail(globalParams({ status: 'CAMBIOS', accion }));
      msoState.optAllRows  = all;
      msoState.optClientes = groupClients(all);
      const rows = filterPaneClients(all);
      renderOptKpis(rows, msoState.optClientes.length, view);
      const sorted = sortRows(rows, msoState.optSort);
      msoState.optTotal = sorted.length;
      const start = (msoState.optPage - 1) * OPT_LIMIT;
      msoState.optRows = sorted.slice(start, start + OPT_LIMIT);
    }
    renderOptFilters();
    renderOptTable(msoState.optRows);
    renderOptPag();
    _optLoaded = true;
    registerReveal();
  } catch (e) {
    showErr('msoOptError', e.message);
    if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="mso-empty-cell">Error al cargar datos.</td></tr>';
  } finally {
    setBusy(BUSY.opt, false);
  }
}

function renderOptKpis(rows, nClientes, view) {
  const isDown = view === 'bajar';
  const t100 = rows.filter(r => num(r.capacidad_destino_mb) === 100).length;
  const t1   = rows.filter(r => num(r.capacidad_destino_mb) === 1024).length;
  const el = gEl('optKpis'); if (!el) return;
  el.innerHTML = [
    [isDown ? 'Candidatas a bajar' : 'Candidatas a subir', rows.length, isDown ? 'Sub-status BAJAR_*' : 'Sub-status SUBIR_*', isDown ? 'mso-yellow' : 'mso-green'],
    ['Clientes',      nClientes, 'Con candidatas', ''],
    ['Destino 100 MB', t100, 'Capacidad objetivo', 'mso-cyan'],
    ['Destino 1 GB',   t1,   'Capacidad objetivo', 'mso-blue'],
  ].map(([l, v, h, c]) => `<div class="kpi"><div class="kpi-label">${l}</div><div class="kpi-value ${c}">${fmtN(v)}</div><div class="kpi-sub">${h}</div></div>`).join('');
}

// Opciones de la vista Todas (la selección del usuario se respeta tal cual).
function renderOptTodasChips(d) {
  optTodasOptions = {
    status    : (d.status     || []).map(String),
    sub_status: (d.sub_status || []).map(String),
    acciones  : ((d.acciones && d.acciones.length) ? d.acciones : ['BAJAR_PLAN', 'SUBIR_PLAN']).map(String),
  };
}
function filterPaneClients(all) {
  const set = new Set(listOf(msoState[paneClientKey()]));
  return set.size ? all.filter(r => set.has(clientVal(r))) : all;
}

const statusPill = st => { const m = STATUS_META[String(st || '').toUpperCase()]; return m ? `<span class="pill ${m.pill}">${esc(m.label)}</span>` : `<span class="pill pill-muted">${esc(st || '—')}</span>`; };
const actionBadge = (dir, sub) => {
  const d = String(dir || '').toUpperCase();
  if (d === 'BAJAR_PLAN') return `<span class="pill mso-pill-down">↓ ${esc(sub || 'BAJAR')}</span>`;
  if (d === 'SUBIR_PLAN') return `<span class="pill mso-pill-up">↑ ${esc(sub || 'SUBIR')}</span>`;
  return `<span class="cell-sub">${esc(sub || '—')}</span>`;
};

function renderOptTable(rows) {
  const isTodas = msoState.optView === 'todas';
  setTx('optTableCaption', `${fmtN(msoState.optTotal)} registros · página ${msoState.optPage}`);
  const head = isTodas
    ? ['Operador / País', 'Cliente', 'Línea / SIM', 'Plan', 'Corte 2', 'Corte 3', 'Promedio M2+M3', 'Status', 'Sub status', 'Anexo', 'Validación']
    : ['Operador / País', 'Cliente', 'Línea / SIM', 'Plan actual', 'Promedio M2+M3', 'Acción', 'Destino', 'Anexo', 'Asociación'];
  gEl('optTableHead').innerHTML = head.map(h => `<th>${h}</th>`).join('');
  const body = gEl('optTableBody');
  if (!rows.length) { body.innerHTML = `<tr><td colspan="${head.length}" class="mso-empty-cell">Sin resultados para estos filtros.</td></tr>`; return; }

  body.innerHTML = rows.map(r => {
    const op   = `<div class="cell-main">${esc(r.operador || '—')}</div><span class="pill pill-muted">${esc(r.pais || r.pais_codigo || '')}</span>`;
    const cli  = `<div class="cell-main">${esc(r.cliente || 'SIN CLIENTE')}</div><div class="cell-sub">${esc(r.cod_cliente || '')}</div>`;
    const sim  = `<div class="cell-main mono">${esc(r.linea || r.sim_15 || r.iccid_15 || '—')}</div><div class="cell-sub mono">SIM ${esc(r.sim || r.iccid || r.sim_15 || '—')}</div>`;
    const plan = `<div class="cell-main">${esc(r.plan_actual || r.plan_jasper || '—')}</div><div class="cell-sub">${capMb(r.plan_actual_mb)}</div>`;
    const avg  = `<div class="cell-main mono">${fmtN(r.promedio_mes2y3)} MB</div><div class="cell-sub">C2 ${fmtN(r.corte_2_mb)} · C3 ${fmtN(r.corte_3_mb)}</div>`;
    if (isTodas) {
      return `<tr><td>${op}</td><td>${cli}</td><td>${sim}</td><td>${plan}</td>
        <td class="mono">${fmtN(r.corte_2_mb)} MB</td><td class="mono">${fmtN(r.corte_3_mb)} MB</td><td class="mono"><b>${fmtN(r.promedio_mes2y3)} MB</b></td>
        <td>${statusPill(r.status)}</td><td>${actionBadge(r.direccion_cambio || r.accion, r.sub_status)}</td>
        <td>${esc(r.anexo || '—')}</td><td><div class="cell-sub">${esc(r.validacion_cambio_asociacion || '—')}</div></td></tr>`;
    }
    return `<tr><td>${op}</td><td>${cli}</td><td>${sim}</td><td>${plan}</td><td>${avg}</td>
      <td>${actionBadge(r.direccion_cambio || r.accion, r.sub_status)}</td>
      <td><div class="cell-main mono">${capMb(r.capacidad_destino_mb)}</div><div class="cell-sub">${esc(r.tipo_cambio_sugerido || '')}</div></td>
      <td><div class="cell-main">${esc(r.anexo || '—')}</div><div class="cell-sub">${esc(r.status_anexo || '')}</div></td>
      <td><div class="cell-main">${datef(r.fecha_asociacion_sim)}</div><div class="cell-sub">${esc(r.validacion_cambio_asociacion || '—')}</div></td></tr>`;
  }).join('');
}

function renderOptPag() {
  const pages = Math.max(1, Math.ceil(msoState.optTotal / OPT_LIMIT));
  const el = gEl('optPagination'); if (!el) return;
  el.innerHTML = `
    <button class="filter-chip mso-mini${msoState.optPage <= 1 ? ' disabled' : ''}" data-opt-page="prev">← Anterior</button>
    <span class="mso-pag-info">Página <b>${msoState.optPage}</b> de ${fmtN(pages)}</span>
    <button class="filter-chip mso-mini${msoState.optPage >= pages ? ' disabled' : ''}" data-opt-page="next">Siguiente →</button>
    <span class="mso-pag-info" style="margin-left:auto">${fmtN(msoState.optTotal)} registros</span>`;
}

function exportOptCsv() {
  const isTodas = msoState.optView === 'todas';
  let rows = msoState.optRows;
  if (!isTodas) rows = sortRows(filterPaneClients(msoState.optAllRows), msoState.optSort);
  if (!rows.length) return;
  const cols = ['operador', 'pais', 'cliente', 'cod_cliente', 'linea', 'sim', 'sim_15', 'plan_actual', 'plan_actual_mb', 'corte_2_mb', 'corte_3_mb', 'promedio_mes2y3', 'status', 'sub_status', 'direccion_cambio', 'capacidad_destino_mb', 'tipo_cambio_sugerido', 'anexo', 'status_anexo', 'fecha_asociacion_sim', 'validacion_cambio_asociacion'];
  const q = v => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cols.join(';'), ...rows.map(r => cols.map(c => q(r[c])).join(';'))].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mso_simcards_${msoState.optView}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Navegación drill-down (KPIs, popovers, tarjetas, "Ver")
function goOpt(view, o = {}) {
  msoState.optView = view; msoState.optPage = 1;
  msoState.downClient = ''; msoState.upClient = '';
  msoState.allStatus = o.status || ''; msoState.allSubStatus = ''; msoState.allDirection = o.dir || '';
  let globalChanged = false;
  if (o.bolsa    !== undefined && o.bolsa    !== msoState.bolsa)    { msoState.bolsa    = o.bolsa;    globalChanged = true; }
  if (o.operador !== undefined && o.operador !== msoState.operador) { msoState.operador = o.operador; globalChanged = true; }
  if (o.pais     !== undefined && o.pais     !== msoState.pais)     { msoState.pais     = o.pais;     globalChanged = true; }
  if (o.cliente  !== undefined && o.cliente  !== msoState.cliente)  { msoState.cliente  = o.cliente;  globalChanged = true; }
  renderGlobalFilterChips();
  _optLoaded = false;
  switchTab('opt-mso');
  if (globalChanged) loadResumen();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — RECLAMOS M2M → 1 GB
// ═══════════════════════════════════════════════════════════════════════════
const etapaLabel = v => ({ EN_PLAZO:'En plazo', ESCALAMIENTO_1:'Escalamiento 1', ESCALAMIENTO_2:'Escalamiento 2', FINALIZADO:'Finalizado', REINGRESO:'Reingreso' })[v] || v || '—';
const etapaPill  = v => {
  const e = String(v || '').toUpperCase();
  const cls = e.includes('ESCALAMIENTO_2') ? 'mso-pill-esc2' : e.includes('ESCALAMIENTO_1') ? 'mso-pill-esc1' : e === 'EN_PLAZO' ? 'mso-pill-ok' : e === 'FINALIZADO' ? 'pill-muted' : e === 'REINGRESO' ? 'mso-pill-esc2' : 'pill-muted';
  return `<span class="pill ${cls}">${esc(etapaLabel(e))}</span>`;
};

// La API de reclamos acepta un solo valor por filtro (una lista devuelve 0).
function recParams() {
  const params = {};
  if (msoState.recPais)        params.pais        = msoState.recPais;
  if (msoState.recEtapa)       params.etapa       = msoState.recEtapa;
  if (msoState.recPeriodo)     params.periodo     = msoState.recPeriodo;
  if (msoState.recResponsable) params.responsable = msoState.recResponsable;
  return params;
}

async function loadReclamos() {
  vShow('msoRecLoader', !_recLoaded); clearErr('msoRecError');
  setBusy(BUSY.reclamos, true);
  const params = recParams();
  try {
    const [filR, sumR, cliR, casR, respR] = await Promise.allSettled([
      msoGet(EP.recFil,  params),
      msoGet(EP.recRes,  params),
      msoGet(EP.recCli,  params),
      msoGet(EP.recCas,  params),
      msoGet(EP.recResp, params),
    ]);
    if (filR.status === 'fulfilled') { msoState.recFilterOptions = filR.value?.data || filR.value || {}; renderRecFilterChips(); }
    if (sumR.status === 'fulfilled') renderRecKpis(sumR.value);
    else showErr('msoRecError', 'Resumen: ' + (sumR.reason?.message || 'sin respuesta'));
    if (cliR.status  === 'fulfilled') renderRecClientes(cliR.value);
    if (casR.status  === 'fulfilled') renderRecCasos(casR.value);
    if (respR.status === 'fulfilled') renderRecResponsables(respR.value);
    _recLoaded = true;
    registerReveal();
    setSync();
  } catch (e) { showErr('msoRecError', e.message); }
  finally    { vShow('msoRecLoader', false); setBusy(BUSY.reclamos, false); }
}

let recXF = null;
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const periodoLabel = p => { const m = String(p).match(/^(\d{4})-(\d{2})$/); return m ? `${MESES[+m[2] - 1]} ${m[1]}` : String(p); };
function renderRecFilterChips() {
  const f = msoState.recFilterOptions || {};
  const etapas = (f.etapas || []).map(String);
  const resps  = f.responsables || [];
  const periodos = (f.periodos || []).map(String).sort().reverse();
  syncOpButtons('rec', msoState.recPais);

  const sel = gEl('recPeriodo');
  if (sel) {
    sel.innerHTML = '<option value="">Todos los meses</option>' +
      periodos.map(p => `<option value="${esc(p)}">${esc(periodoLabel(p))}</option>`).join('');
    sel.value = periodos.includes(msoState.recPeriodo) ? msoState.recPeriodo : '';
  }

  recXF?.update([
    { key: 'recEtapa', label: 'Etapa SLA', single: true, options: etapas.map(v => ({ value: v, label: etapaLabel(v) })), selected: selOf(msoState.recEtapa) },
    { key: 'recResponsable', label: 'Responsable', single: true,
      options: resps.map(r => ({ value: String(r.id), label: r.nombre || r.id, sub: [r.email, r.pais].filter(Boolean).join(' · ') })),
      selected: selOf(msoState.recResponsable) },
  ]);
}
function clearRecFilters() {
  msoState.recPais = ''; msoState.recEtapa = ''; msoState.recPeriodo = ''; msoState.recResponsable = '';
  loadReclamos();
}

// KPIs de Reclamos M2M a partir de /reclamos/resumen (pestaña Reclamos y PDF).
const recKpis = u => (Object.keys(u.kpis).length ? u.kpis : (u.raw || {}));

function renderRecKpis(body) {
  const s = recKpis(unwrap(body));
  setTx('rkCandidatas',          fmtN(s.sims_total));
  setTx('rkExcluidas',           fmtN(s.sims_excluidas));
  setTx('rkPendientes',          fmtN(s.sims_pendientes));
  setTx('rkReingresos',          fmtN(s.reingresos));
  setTx('slaTotal',              fmtN(s.reclamos_total));
  setTx('slaAbiertos',           fmtN(s.reclamos_abiertos));
  setTx('slaEnPlazo',            fmtN(s.en_plazo));
  setTx('slaEsc1',               fmtN(s.escalamiento_1));
  setTx('slaEsc2',               fmtN(s.escalamiento_2));
  setTx('slaFinalizados',        fmtN(s.finalizados));
  setTx('rkCambiosRealizados',   fmtN(s.cambios_realizados));
  setTx('rkCambiosNoRealizados', fmtN(s.cambios_no_realizados));
  setTx('rkSLAPct',              pctOrNA(s.cumplimiento_sla_pct));
  setTx('rkEfectPct',            pctOrNA(s.efectividad_postcierre_pct));
}

function renderRecClientes(body) {
  const rows = unwrap(body).rows;
  setTx('rkClientes', fmtN(rows.length));
  setTx('recClientesCaption', `${fmtN(rows.length)} clientes · SIM candidatas, excluidas y pendientes de ingreso`);
  const cont = gEl('recClientesTable'); if (!cont) return;
  cont.innerHTML = rows.length ? rows.map(c => {
    const pend = num(c.sims_pendientes), tot = num(c.sims_total);
    const pill = pend > 0 ? ['mso-pill-ok', 'PENDIENTE DE INGRESO'] : !c.cliente_id ? ['mso-pill-esc2', 'SIN CÓDIGO'] : tot > 0 ? ['pill-muted', 'YA INGRESADO'] : ['mso-pill-esc1', 'SIN SIM'];
    return `<tr>
      <td><div class="cell-main">${esc(c.cliente_nombre || 'SIN CLIENTE')}</div><div class="cell-sub">${esc(c.cliente_id || 'SIN CÓDIGO')}</div></td>
      <td>${esc(c.pais_nombre || c.pais || '—')}</td>
      <td class="mono" style="text-align:right">${fmtN(tot)}</td>
      <td class="mono" style="text-align:right">${fmtN(c.sims_excluidas)}</td>
      <td class="mono" style="text-align:right"><b>${fmtN(pend)}</b></td>
      <td><span class="pill ${pill[0]}">${pill[1]}</span></td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" class="mso-empty-cell">Sin clientes para los filtros seleccionados.</td></tr>';
}

function renderRecCasos(body) {
  const rows = unwrap(body).rows.slice().sort((a, b) => num(a.prioridad) - num(b.prioridad) || num(b.dias_abierto) - num(a.dias_abierto));
  const cont = gEl('recCasosTable'); if (!cont) return;
  cont.innerHTML = rows.length ? rows.map(c => {
    const dias  = num(c.dias_abierto);
    const rowCls = c.es_reingreso ? 'mso-row-reingreso' : c.etapa_sla === 'ESCALAMIENTO_2' ? 'mso-row-esc2' : c.etapa_sla === 'ESCALAMIENTO_1' ? 'mso-row-esc1' : '';
    const reing = c.es_reingreso ? `<div class="cell-sub mso-red">Reingreso · intento ${fmtN(c.intento)}${c.case_id_origen ? ` · origen ${esc(c.case_id_origen)}` : ''}</div>` : '<div class="cell-sub">Reclamo inicial</div>';
    return `<tr class="${rowCls}">
      <td><div class="cell-main mono">${esc(c.case_id || '—')}</div>${reing}</td>
      <td><div class="cell-main">${esc(c.cliente_nombre || 'Cliente no disponible')}</div><div class="cell-sub">${esc(c.cliente_id || '')}</div></td>
      <td>${esc(c.pais_nombre || c.pais || '—')}</td>
      <td>${esc(c.estado || '—')}</td>
      <td><div class="cell-main">${esc(c.agente_nombre || 'Sin agente')}</div><div class="cell-sub">${esc(c.agente_email || '')}</div></td>
      <td>${etapaPill(c.etapa_sla)}</td>
      <td class="mono" style="text-align:right;color:${dias >= 21 ? 'var(--accent-2)' : dias >= 16 ? 'var(--yellow)' : 'inherit'}"><b>${fmtN(dias)}</b></td>
      <td class="mono" style="text-align:right">${fmtN(c.total_sims)}</td>
      <td class="mono" style="text-align:right"><span class="mso-green">${fmtN(c.cambios_realizados)}</span> / <span class="mso-red">${fmtN(c.cambios_no_realizados)}</span></td>
      <td style="text-align:right"><button class="filter-chip mso-mini" data-rec-case="${esc(c.case_id)}">Ver SIM</button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="10" class="mso-empty-cell">Sin reclamos para los filtros seleccionados.</td></tr>';
}

function renderRecResponsables(body) {
  const rows = unwrap(body).rows;
  vShow('recResponsablesCard', rows.length > 0);
  const cont = gEl('recResponsablesTable'); if (!cont || !rows.length) return;
  cont.innerHTML = rows.map(r => `<tr>
    <td><div class="cell-main">${esc(r.agente_nombre || r.agente || 'Sin agente')}</div><div class="cell-sub">${esc(r.agente_email || '')}</div></td>
    <td class="mono" style="text-align:right">${fmtN(r.reclamos_total ?? r.reclamos)}</td>
    <td class="mono" style="text-align:right">${fmtN(r.reclamos_abiertos ?? r.abiertos)}</td>
    <td class="mono" style="text-align:right;color:var(--yellow)">${fmtN(r.escalamiento_1)}</td>
    <td class="mono" style="text-align:right;color:var(--accent-2)">${fmtN(r.escalamiento_2)}</td>
    <td class="mono" style="text-align:right">${fmtN(r.reclamos_finalizados ?? r.finalizados)}</td>
    <td class="mono" style="text-align:right">${fmtN(r.sims_total ?? r.sims)}</td>
  </tr>`).join('');
}

// ── Detalle de reclamo (modal) ─────────────────────────────────────────────
function simOperationalState(s, closed) {
  if (String(s.estado_gestion || '').toUpperCase() === 'EXCLUIDA') return 'EXCLUIDA';
  const v = String(s.estado_validacion || '').toUpperCase();
  if (['CAMBIO_REALIZADO', 'CAMBIO_NO_REALIZADO', 'SIN_DATOS_ACTUALES'].includes(v)) return v;
  return closed ? 'PENDIENTE_VALIDACION' : 'EN_RECLAMO';
}
const gestionPill = st => {
  const cls = st === 'CAMBIO_REALIZADO' ? 'mso-pill-ok' : (st === 'EXCLUIDA' || st === 'CAMBIO_NO_REALIZADO') ? 'mso-pill-esc2' : (st === 'PENDIENTE_VALIDACION' || st === 'SIN_DATOS_ACTUALES') ? 'mso-pill-esc1' : 'pill-muted';
  return `<span class="pill ${cls}">${esc(String(st || '—').replace(/_/g, ' '))}</span>`;
};

function openCaseModal() { const m = gEl('recCaseModal'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
function closeCaseModal() { const m = gEl('recCaseModal'); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }

async function openCaseDetail(caseId) {
  setTx('recCaseTitle', caseId); setTx('recCaseMeta', 'Consultando SAC…');
  gEl('recCaseBody').innerHTML = '<div class="sims-loader" style="min-height:140px"><div class="sims-spinner"></div></div>';
  openCaseModal();
  try {
    const b = await msoGet(EP.recCaso(caseId));
    const c = b?.data !== undefined ? b.data : b;
    let sims = Array.isArray(c.sims) ? c.sims : null;
    if (!sims) sims = unwrap(await msoGet(EP.recCasoSims(caseId))).rows;
    renderCaseDetail(c, sims);
  } catch (e) {
    gEl('recCaseBody').innerHTML = `<div class="error-box">⚠ ${esc(e.message)}</div>`;
    setTx('recCaseMeta', 'El caso solicitado no está disponible.');
  }
}

function renderCaseDetail(c, sims) {
  const closed = Boolean(c.finalizado);
  setTx('recCaseTitle', `${c.case_id} · ${c.cliente_nombre || c.cliente_id || 'Cliente'}`);
  setTx('recCaseMeta', `${c.estado || 'Sin lectura SAC'} · ${c.agente_nombre || 'Sin agente'}${c.agente_email ? ` · ${c.agente_email}` : ''} · ${c.pais_nombre || c.pais || ''}`);
  const stats = [
    ['SIM solicitadas',     c.total_sims],
    ['Excluidas',           c.sims_excluidas],
    ['Cambio realizado',    c.cambios_realizados],
    ['Cambio no realizado', c.cambios_no_realizados],
    ['Sin datos actuales',  c.sin_datos_actuales],
  ];
  const alert = closed
    ? '<strong>Reclamo finalizado en SAC.</strong> La validación post-cierre y los reingresos se procesan automáticamente.'
    : `Reclamo en seguimiento · ${etapaPill(c.etapa_sla)} · <b class="mono">${fmtN(c.dias_abierto)}</b> días abierto · creado ${datef(c.fecha_creacion)} · actualizado ${datef(c.fecha_actualizacion)}`;

  gEl('recCaseBody').innerHTML = `
    <div class="mso-stats">${stats.map(([l, v]) => `<div class="mso-stat"><span>${l}</span><b>${fmtN(v)}</b></div>`).join('')}</div>
    <div class="mso-alert">${alert}</div>
    <div class="table-wrap mso-table-tall">
      <table>
        <thead><tr><th>SIM</th><th>Anexo</th><th>Plan</th><th style="text-align:right">Promedio</th><th>Gestión</th><th>Validación</th><th>Asociación actual</th></tr></thead>
        <tbody>${(sims || []).map(s => {
          const st = simOperationalState(s, closed);
          const detail = st === 'EXCLUIDA'
            ? `${s.motivo_exclusion || 'Sin motivo'}${s.observacion_exclusion ? ` · ${s.observacion_exclusion}` : ''}`
            : (s.detalle_validacion || '');
          const validation = st === 'EXCLUIDA' ? 'NO APLICA' : (st === 'PENDIENTE_VALIDACION' ? 'PENDIENTE' : (s.estado_validacion || 'PENDIENTE'));
          const assoc = (s.cliente_actual_validacion || s.anexo_actual_validacion)
            ? `${s.cliente_actual_validacion || 'SIN CLIENTE'} · Anexo ${s.anexo_actual_validacion || '—'}${s.status_anexo_actual ? ` · ${s.status_anexo_actual}` : ''}` : '—';
          return `<tr>
            <td><div class="cell-main mono">${esc(s.sim_15 || s.sim || '—')}</div>${detail ? `<div class="cell-sub">${esc(detail)}</div>` : ''}</td>
            <td>${esc(s.anexo || '—')}</td>
            <td><div class="cell-main">${esc(s.plan_actual || 'M2M')} → ${esc(s.plan_destino || '1GB')}</div><div class="cell-sub">C2 ${fmtN(s.corte_2_mb)} · C3 ${fmtN(s.corte_3_mb)}</div></td>
            <td class="mono" style="text-align:right"><b>${fmtN(s.promedio_mes2y3)} MB</b></td>
            <td>${gestionPill(st)}</td>
            <td>${gestionPill(validation)}</td>
            <td><div class="cell-main">${esc(assoc)}</div>${s.reingreso_case_id ? `<div class="cell-sub">Reingresada en ${esc(s.reingreso_case_id)}</div>` : ''}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="7" class="mso-empty-cell">Sin SIM vinculadas.</td></tr>'}</tbody>
      </table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 — INFORME DETALLADO
// ═══════════════════════════════════════════════════════════════════════════
// Muestra todo lo que devuelven las APIs de SIM Cards y Reclamos M2M, con todas
// sus columnas, y lo descarga en un Excel (una hoja por conjunto de datos).
// No depende de los filtros de arriba: tiene su propia barra (Operaciones + filtros combinados).
const INF_PAGE = 50;
const EXCELJS_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';

// Encabezados legibles; los campos que no estén aquí se muestran con su nombre de la API.
const INF_LABELS = {
  fecha_generacion: 'Fecha de generación', operador: 'Operador', pais: 'País', pais_codigo: 'Código país', pais_nombre: 'País (nombre)',
  linea: 'Línea', sim: 'SIM (ICCID)', sim_15: 'SIM 15', estado_operador: 'Estado en operador', plan_actual: 'Plan actual',
  plan_actual_mb: 'Plan actual (MB)', costo_actual_usd: 'Costo actual (USD)', anexo: 'Anexo', status_anexo: 'Status anexo',
  cliente: 'Cliente', cod_cliente: 'Código cliente', fecha_asociacion_sim: 'Fecha asociación SIM',
  corte_1_fecha: 'Corte 1 · fecha', corte_1_mb: 'Corte 1 (MB)', corte_2_fecha: 'Corte 2 · fecha', corte_2_mb: 'Corte 2 (MB)',
  corte_3_fecha: 'Corte 3 · fecha', corte_3_mb: 'Corte 3 (MB)', promedio_mes2y3: 'Promedio M2+M3 (MB)', promedio_3_cortes_mb: 'Promedio 3 cortes (MB)',
  status_consumo: 'Status consumo', status: 'Status', sub_status: 'Sub-status', tipo_cambio_sugerido: 'Cambio sugerido',
  direccion_cambio: 'Acción', capacidad_destino_mb: 'Capacidad destino (MB)', validacion_cambio_asociacion: 'Validación asociación',
  sup_bloquea_servicio: 'Bloquea servicio', sup_bloquea_facturacion: 'Bloquea facturación', sup_bloquea_ambos: 'Bloquea ambos',
  total: 'Total SIM', cambios: 'Cambios', bajar: 'Bajar plan', subir: 'Subir plan',
  fecha: 'Fecha', simcards_total: 'SIM totales', stock: 'Stock', mantener: 'Mantener', revision: 'Revisión',
  revision_bolsa: 'Revisión en bolsa', revision_fuera_bolsa: 'Revisión fuera de bolsa', reemplazos: 'Reemplazos',
  bajar_bolsa: 'Bajar · en bolsa', bajar_fuera_bolsa: 'Bajar · fuera de bolsa', subir_bolsa: 'Subir · en bolsa', subir_fuera_bolsa: 'Subir · fuera de bolsa',
  case_id: 'Reclamo', periodo: 'Período', cliente_id: 'Código cliente', cliente_nombre: 'Cliente', estado: 'Estado SAC',
  fecha_creacion: 'Fecha creación', fecha_actualizacion: 'Fecha actualización', fecha_fin_resolucion: 'Fecha fin resolución',
  agente_id: 'ID responsable', agente_nombre: 'Responsable', agente_email: 'Correo responsable', dias_abierto: 'Días abierto',
  etapa_sla: 'Etapa SLA', finalizado: 'Finalizado', intento: 'Intento', case_id_origen: 'Reclamo origen', es_reingreso: 'Es reingreso',
  total_sims: 'SIM totales', sims_excluidas: 'SIM excluidas', sims_gestionables: 'SIM gestionables', cambios_realizados: 'Cambios realizados',
  cambios_no_realizados: 'Cambios no realizados', sin_datos_actuales: 'Sin datos actuales', sims_pendientes: 'SIM pendientes',
  escalamiento_1: 'Escalamiento 1', escalamiento_2: 'Escalamiento 2', escalamiento_post_cierre: 'Escalamiento post-cierre',
  prioridad: 'Prioridad', prioridad_nombre: 'Prioridad (nombre)', prioridad_maxima: 'Prioridad máxima',
  reclamos_total: 'Reclamos', reclamos_abiertos: 'Reclamos abiertos', reclamos_finalizados: 'Reclamos finalizados', reingresos: 'Reingresos',
  en_plazo: 'En plazo', sims_total: 'SIM totales', id: 'ID', reclamo_id: 'ID reclamo', plan_destino: 'Plan destino',
  reingreso_case_id: 'Reingresada en', estado_gestion: 'Estado gestión', estado_validacion: 'Estado validación', fecha_validacion: 'Fecha validación',
  cliente_actual_validacion: 'Cliente actual (validación)', anexo_actual_validacion: 'Anexo actual (validación)', status_anexo_actual: 'Status anexo actual',
  detalle_validacion: 'Detalle validación', motivo_exclusion: 'Motivo exclusión', tipo_exclusion: 'Tipo exclusión', observacion_exclusion: 'Observación exclusión',
  fecha_exclusion: 'Fecha exclusión', usuario_exclusion: 'Usuario exclusión', exclusion_id: 'ID exclusión',
  postcierre_auto_procesado_at: 'Post-cierre procesado', postcierre_auto_estado: 'Post-cierre estado', postcierre_auto_error: 'Post-cierre error', created_at: 'Creado',
  reclamos_creados: 'Reclamos creados', reclamos_abiertos_acumulados: 'Reclamos abiertos (acum.)', sims_ingresadas: 'SIM ingresadas',
  sims_finalizadas: 'SIM finalizadas', sims_abiertas_acumuladas: 'SIM abiertas (acum.)',
  simcards_consolidadas: 'SIM consolidadas', bajar_plan: 'Bajar plan', subir_plan: 'Subir plan',
  cumplimiento_sla_pct: 'Cumplimiento SLA (%)', efectividad_postcierre_pct: 'Efectividad post-cierre (%)',
};
const infNorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const infLabel = key => INF_LABELS[key] || String(key).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
// Identificadores que parecen números pero deben quedarse como texto (ICCID de 19 dígitos, códigos…).
const INF_TEXT_KEYS = new Set(['sim', 'sim_15', 'linea', 'anexo', 'anexo_actual_validacion', 'cod_cliente', 'cliente_id', 'case_id', 'case_id_origen', 'reingreso_case_id', 'id', 'reclamo_id', 'exclusion_id', 'agente_id', 'periodo']);

// Tipo de una celda → { excel (valor tipado), fmt (formato Excel), kind }.
// Es barato: se usa para ordenar y para el Excel (cientos de miles de celdas).
function infParse(key, value) {
  if (value === null || value === undefined || value === '') return { excel: null, kind: 'empty' };
  if (typeof value === 'boolean') return { excel: value ? 'Sí' : 'No', kind: 'text' };
  if (typeof value === 'object') return { excel: JSON.stringify(value), kind: 'text' };
  const s = String(value);
  if (!INF_TEXT_KEYS.has(key)) {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (m) {
      if (!m[4] || /T00:00:00(\.0+)?Z$/.test(s)) return { excel: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])), fmt: 'dd/mm/yyyy', kind: 'date' };
      const d = new Date(s);
      // ExcelJS escribe en UTC: se desplaza para que Excel muestre la hora local.
      if (!Number.isNaN(d.getTime())) return { excel: new Date(d.getTime() - d.getTimezoneOffset() * 60000), fmt: 'dd/mm/yyyy hh:mm', kind: 'datetime' };
    }
    // Solo la parte entera limita (más de 15 dígitos perdería precisión en Excel);
    // los decimales largos de la API (ej. "0.00000000000000000000") sí son números.
    if (typeof value === 'number' || (/^-?\d+(\.\d+)?$/.test(s) && s.replace(/^-/, '').split('.')[0].length <= 15)) {
      const n = Number(s);
      return { excel: n, fmt: Number.isInteger(n) ? '#,##0' : '#,##0.00', kind: 'num' };
    }
  }
  return { excel: s, kind: 'text' };
}
// Texto para la tabla (solo las filas visibles: el formato regional es costoso).
function infCell(key, value) {
  const p = infParse(key, value);
  const e = p.excel;
  const text = p.kind === 'empty' ? '—'
    : p.kind === 'num' ? e.toLocaleString('es-GT', { maximumFractionDigits: 2 })
    : p.kind === 'date' ? `${String(e.getUTCDate()).padStart(2, '0')}/${String(e.getUTCMonth() + 1).padStart(2, '0')}/${e.getUTCFullYear()}`
    : p.kind === 'datetime' ? `${String(e.getUTCDate()).padStart(2, '0')}/${String(e.getUTCMonth() + 1).padStart(2, '0')}/${e.getUTCFullYear()} ${String(e.getUTCHours()).padStart(2, '0')}:${String(e.getUTCMinutes()).padStart(2, '0')}`
    : String(e);
  return { ...p, text };
}

// Columnas: todas las claves que trae la API, en el orden en que aparecen.
function infColumns(rows) {
  const cols = []; const seen = new Set();
  rows.forEach(r => Object.keys(r || {}).forEach(k => { if (!seen.has(k)) { seen.add(k); cols.push(k); } }));
  return cols;
}

// Consultas con caché por filtros (se limpia con "Actualizar datos").
const infCache = new Map();
function infCached(key, loader) {
  if (!infCache.has(key)) infCache.set(key, loader().catch(e => { infCache.delete(key); throw e; }));
  return infCache.get(key);
}
// El informe no usa los filtros de arriba ni los de la pestaña Reclamos: tiene su
// propia barra. Operaciones va a la API (pais) para que los totales salgan por país;
// el resto de filtros se aplica sobre las columnas de cada tabla.
const infParams = () => (infState.pais ? { pais: infState.pais } : {});
const simSig = () => JSON.stringify(infParams());
const recSig = simSig;
const infResumenSim = () => infCached('res' + simSig(), async () => unwrap(await msoGet(EP.simRes, infParams())));
const infRecRows = ep => infCached(ep + recSig(), async () => unwrap(await msoGet(ep, infParams())).rows);
const infResumenRec = () => infCached('recres' + recSig(), async () => recKpis(unwrap(await msoGet(EP.recRes, infParams()))));

// Conjuntos de datos del informe (una hoja de Excel cada uno).
const INF_DATASETS = [
  { key: 'sims',        group: 'SIM Cards',    label: 'Detalle de SIM',           sheet: 'SIM Cards',
    load: () => infCached('det' + simSig(), () => fetchAllDetail(infParams(), (n, total) => infProgress(`Detalle de SIM: ${fmtN(n)} de ${fmtN(total)}…`))) },
  { key: 'operadores',  group: 'SIM Cards',    label: 'Por operador',             sheet: 'Por operador',
    load: async () => (await infResumenSim()).por_op },
  { key: 'paises',      group: 'SIM Cards',    label: 'Por país',                 sheet: 'Por país',
    load: async () => (await infResumenSim()).por_pais },
  { key: 'topClientes', group: 'SIM Cards',    label: 'Clientes con más cambios', sheet: 'Clientes más cambios',
    load: async () => (await infResumenSim()).clientes },
  { key: 'evoSim',      group: 'SIM Cards',    label: 'Evolución diaria',         sheet: 'Evolución SIM',
    load: () => infCached('evo', async () => unwrap(await msoGet(EP.simEvo)).rows) },
  { key: 'casos',       group: 'Reclamos M2M', label: 'Casos',                    sheet: 'Reclamos',
    load: () => infRecRows(EP.recCas) },
  { key: 'casoSims',    group: 'Reclamos M2M', label: 'SIM por reclamo',          sheet: 'SIM por reclamo',
    load: () => infCached('cs' + recSig(), loadInfCasoSims) },
  { key: 'recClientes', group: 'Reclamos M2M', label: 'Clientes',                 sheet: 'Reclamos por cliente',
    load: () => infRecRows(EP.recCli) },
  { key: 'responsables',group: 'Reclamos M2M', label: 'Responsables',             sheet: 'Responsables',
    load: () => infRecRows(EP.recResp) },
  { key: 'evoRec',      group: 'Reclamos M2M', label: 'Evolución',                sheet: 'Evolución reclamos',
    load: () => infRecRows(EP.recEvo) },
];

// SIM de cada reclamo: una consulta por caso, de 6 en 6.
async function loadInfCasoSims() {
  const casos = await infRecRows(EP.recCas);
  const out = new Array(casos.length);
  let next = 0;
  const worker = async () => {
    while (next < casos.length) {
      const i = next++, c = casos[i];
      infProgress(`SIM por reclamo ${fmtN(i + 1)} de ${fmtN(casos.length)}…`);
      const sims = unwrap(await msoGet(EP.recCasoSims(c.case_id))).rows;
      out[i] = sims.map(s => ({ case_id: c.case_id, cliente_id: c.cliente_id, cliente_nombre: c.cliente_nombre, pais: c.pais, ...s }));
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, casos.length) }, worker));
  return out.flat();
}

// filters: por conjunto de datos, { columna: [valores] } (como el autofiltro de Excel).
let infXF = null;
// pais: Operaciones de la barra del informe (independiente de los filtros de arriba).
// loaded: conjunto cuyas filas están en rows (vacío mientras carga otro).
const infState = { dataset: 'sims', pais: '', rows: [], cols: [], fcols: [], filters: {}, search: '', sortKey: '', sortDir: 1, page: 1, token: 0, loaded: '' };

// ── Filtros combinados del informe ──────────────────────────────────────────
// Valor de una celda como clave de filtro ('' = vacías, igual que Excel).
const infKey = v => (v === null || v === undefined || v === '') ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
const infKeyLabel = (col, k) => k === '' ? '(Vacías)' : k === 'true' ? 'Sí' : k === 'false' ? 'No' : infCell(col, k).text;
// Códigos repetidos de otra columna con nombre: no aportan como filtro.
const INF_NO_FILTER = new Set(['cod_cliente', 'cliente_id', 'agente_id', 'agente_email', 'pais_codigo', 'pais_nombre']);
// Columnas filtrables: categorías (no fechas ni identificadores únicos); los números solo si tienen pocos valores.
function infFilterColumns(rows, cols) {
  return cols.filter(c => {
    if (INF_NO_FILTER.has(c)) return false;
    const vals = new Set();
    let kinds = '';
    for (const r of rows) {
      const k = infKey(r[c]);
      if (!vals.has(k)) {
        vals.add(k);
        if (vals.size > 1000) return false;
        if (k !== '' && !kinds.includes(infParse(c, r[c]).kind)) kinds += infParse(c, r[c]).kind + ' ';
      }
    }
    if (vals.size < 2 || /date/.test(kinds)) return false;
    return !/num/.test(kinds) || vals.size <= 30;
  });
}
function infApplyFilters(rows, filters, skip) {
  const active = Object.entries(filters || {}).filter(([c, v]) => c !== skip && v && v.length).map(([c, v]) => [c, new Set(v)]);
  return active.length ? rows.filter(r => active.every(([c, set]) => set.has(infKey(r[c])))) : rows;
}
const infCurFilters = () => infState.filters[infState.dataset] || {};
// Opciones de cada columna según las filas que cumplen los demás filtros, con su conteo.
function updateInfXF() {
  const f = infCurFilters();
  infXF?.update(infState.fcols.map(c => {
    const counts = new Map();
    infApplyFilters(infState.rows, f, c).forEach(r => { const k = infKey(r[c]); counts.set(k, (counts.get(k) || 0) + 1); });
    const options = [...counts.entries()]
      .map(([k, n]) => ({ value: k, label: infKeyLabel(c, k), count: n }))
      .sort((a, b) => (a.value === '') - (b.value === '') || a.label.localeCompare(b.label, 'es', { numeric: true }));
    return { key: c, label: infLabel(c), options, selected: f[c] && f[c].length ? f[c] : null };
  }));
}
function describeInfFilters(dsKey) {
  const f = infState.filters[dsKey] || {};
  return Object.entries(f).filter(([, v]) => v && v.length)
    .map(([c, v]) => `${infLabel(c)}: ${v.length <= 3 ? v.map(k => infKeyLabel(c, k)).join(', ') : `${fmtN(v.length)} valores`}`).join(' · ');
}
// Volver a filtros por defecto: Operaciones = Todos y sin filtros en ninguna tabla.
function clearInfFilters() {
  infState.filters = {};
  infState.search = ''; infState.page = 1;
  const s = gEl('infSearch'); if (s) s.value = '';
  if (infState.pais) { infState.pais = ''; return loadInforme(); }
  updateInfXF();
  renderInfTable();
}

function infProgress(msg) {
  const el = gEl('infProgress'); if (!el) return;
  el.hidden = !msg; el.textContent = msg || '';
}
const INF_PAIS_LABEL = { '': 'Todos (GT · SV)', GT: 'Guatemala', SV: 'El Salvador' };
const infPaisLabel = () => INF_PAIS_LABEL[infState.pais] || infState.pais;

function renderInfDatasets() {
  const el = gEl('infDatasets'); if (!el) return;
  const groups = [...new Set(INF_DATASETS.map(d => d.group))];
  el.innerHTML = groups.map(g => `<div class="inf-group"><span class="filter-label">${esc(g)}</span>${
    INF_DATASETS.filter(d => d.group === g).map(d => `<button type="button" class="filter-chip${d.key === infState.dataset ? ' active' : ''}" data-inf-dataset="${d.key}">${esc(d.label)}</button>`).join('')
  }</div>`).join('');
  document.querySelectorAll('[data-inf-pais]').forEach(b => b.classList.toggle('active', b.dataset.infPais === infState.pais));
  setTx('infScope', `Operaciones: ${infPaisLabel()} · los filtros de esta sección solo aplican al informe y al Excel (no dependen de los de arriba).`);
}

async function loadInforme() {
  const ds = INF_DATASETS.find(d => d.key === infState.dataset) || INF_DATASETS[0];
  const token = ++infState.token;
  infState.loaded = '';
  renderInfDatasets();
  clearErr('infError');
  setTx('infTitle', `${ds.group} · ${ds.label}`);
  setTx('infCaption', 'Consultando la API…');
  closeAllXF();
  infState.fcols = []; infXF?.update([]);   // los filtros se arman con las columnas del nuevo conjunto
  gEl('infBody').innerHTML = `<tr><td class="mso-empty-cell">Cargando ${esc(ds.label.toLowerCase())}…</td></tr>`;
  gEl('infHead').innerHTML = '';
  gEl('infPagination').innerHTML = '';
  setBusy(['infTablePanel'], true);
  try {
    const rows = await ds.load();
    if (token !== infState.token) return;            // el usuario cambió de conjunto mientras cargaba
    infState.rows = rows || [];
    infState.cols = infColumns(infState.rows);
    infState.fcols = infFilterColumns(infState.rows, infState.cols);
    infState.page = 1; infState.sortKey = ''; infState.sortDir = 1;
    infState.loaded = ds.key;
    updateInfXF();
    renderInfTable();
  } catch (e) {
    if (token !== infState.token) return;
    showErr('infError', `${ds.label}: ${e.message}`);
    gEl('infBody').innerHTML = '<tr><td class="mso-empty-cell">No se pudo cargar la información.</td></tr>';
    setTx('infCaption', '');
  } finally {
    if (token === infState.token) { setBusy(['infTablePanel'], false); infProgress(''); }
    registerReveal();
  }
}

// Texto de búsqueda por fila con los valores tal como vienen de la API,
// calculado una sola vez (17 mil filas × 34 columnas).
const infRowText = new WeakMap();
const rowText = r => {
  if (!infRowText.has(r)) infRowText.set(r, infNorm(infState.cols.map(c => r[c] ?? '').join(' ')));
  return infRowText.get(r);
};
function infVisibleRows() {
  const q = infNorm(infState.search.trim());
  let rows = infApplyFilters(infState.rows, infCurFilters());
  if (q) rows = rows.filter(r => rowText(r).includes(q));
  if (infState.sortKey) {
    const k = infState.sortKey;
    const keyed = rows.map(r => { const c = infParse(k, r[k]); return [c.excel instanceof Date ? c.excel.getTime() : c.excel, r]; });
    keyed.sort(([x], [y]) => {
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * infState.sortDir;
    });
    rows = keyed.map(([, r]) => r);
  }
  return rows;
}

function renderInfTable() {
  const cols = infState.cols, rows = infVisibleRows();
  const pages = Math.max(1, Math.ceil(rows.length / INF_PAGE));
  infState.page = Math.min(Math.max(1, infState.page), pages);
  const pageRows = rows.slice((infState.page - 1) * INF_PAGE, infState.page * INF_PAGE);
  setTx('infCaption', `${fmtN(rows.length)} registro${rows.length === 1 ? '' : 's'}${rows.length !== infState.rows.length ? ` de ${fmtN(infState.rows.length)}` : ''} · ${fmtN(cols.length)} columnas`);
  gEl('infHead').innerHTML = cols.map(c => {
    const arrow = infState.sortKey === c ? (infState.sortDir > 0 ? ' ▲' : ' ▼') : '';
    return `<th data-inf-sort="${esc(c)}" title="${esc(c)}">${esc(infLabel(c))}${arrow}</th>`;
  }).join('');
  gEl('infBody').innerHTML = pageRows.length
    ? pageRows.map(r => `<tr>${cols.map(c => { const v = infCell(c, r[c]); return `<td class="${typeof v.excel === 'number' ? 'mono inf-num' : ''}">${esc(v.text)}</td>`; }).join('')}</tr>`).join('')
    : `<tr><td colspan="${Math.max(1, cols.length)}" class="mso-empty-cell">Sin registros para los filtros actuales.</td></tr>`;
  gEl('infPagination').innerHTML = `
    <button class="filter-chip mso-mini${infState.page <= 1 ? ' disabled' : ''}" data-inf-page="prev">← Anterior</button>
    <span class="mso-pag-info">Página <b>${infState.page}</b> de ${fmtN(pages)}</span>
    <button class="filter-chip mso-mini${infState.page >= pages ? ' disabled' : ''}" data-inf-page="next">Siguiente →</button>`;
}

// ── Excel ──────────────────────────────────────────────────────────────────
function ensureExcelJS() {
  if (window.ExcelJS) return Promise.resolve();
  if (!window._excelJsPromise) {
    window._excelJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = EXCELJS_URL; s.onload = resolve;
      s.onerror = () => { window._excelJsPromise = null; reject(new Error('No se pudo cargar la librería de Excel')); };
      document.head.appendChild(s);
    });
  }
  return window._excelJsPromise;
}

function addInfSheet(wb, name, rows) {
  const cols = infColumns(rows);
  const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
  if (!cols.length) { ws.addRow(['Sin registros para los filtros aplicados']); return; }
  ws.columns = cols.map(c => ({ header: infLabel(c), key: c }));
  const widths = cols.map(c => infLabel(c).length);
  const fmts = new Array(cols.length).fill(null);
  rows.forEach(r => {
    const cells = cols.map(c => infParse(c, r[c]));
    ws.addRow(cells.map(x => x.excel));
    cells.forEach((x, i) => {
      if (x.fmt && !fmts[i]) fmts[i] = x.fmt;
      if (x.fmt === '#,##0.00' || x.fmt === 'dd/mm/yyyy hh:mm') fmts[i] = x.fmt;   // decimales u hora: la columna los muestra
      const len = x.kind === 'date' ? 10 : x.kind === 'datetime' ? 16 : x.kind === 'num' ? 12 : x.excel ? String(x.excel).length : 1;
      widths[i] = Math.max(widths[i], Math.min(60, len));
    });
  });
  // Formato por columna (más liviano que por celda) y ancho según contenido.
  ws.columns.forEach((col, i) => { col.width = Math.max(10, widths[i] + 2); if (fmts[i]) col.numFmt = fmts[i]; });
  styleInfHeader(ws.getRow(1));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
}
function styleInfHeader(row) {
  row.height = 22;
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF151C2E' } };
    cell.alignment = { vertical: 'middle' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FFEF3E4D' } } };
  });
}

async function downloadInformeExcel() {
  const btn = gEl('btnInfExcel');
  if (btn.classList.contains('is-loading')) return;
  btn.classList.add('is-loading');
  clearErr('infError');
  // El Excel se arma con lo que tiene la API en este momento: se descarta la
  // caché del informe y se pide al proxy que no use la suya (refresh=1).
  infCache.clear();
  forceRefresh = true;
  const generadoEn = new Date();
  try {
    infProgress('Preparando Excel…');
    await ensureExcelJS();
    const data = {};
    for (const [i, ds] of INF_DATASETS.entries()) {
      if (ds.key !== 'casoSims') infProgress(`Consultando ${i + 1} de ${INF_DATASETS.length}: ${ds.label}…`);
      data[ds.key] = await ds.load();
    }
    const [resSim, resRec] = await Promise.all([infResumenSim(), infResumenRec()]);
    forceRefresh = false;
    infProgress('Generando Excel…');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'RED Intelfon · Dashboard MSO';
    wb.created = new Date();

    // Hoja Resumen: filtros aplicados y KPIs de ambas APIs.
    const ws = wb.addWorksheet('Resumen');
    ws.columns = [{ header: 'Indicador', key: 'k', width: 36 }, { header: 'Valor', key: 'v', width: 60 }];
    styleInfHeader(ws.getRow(1));
    const section = title => { const r = ws.addRow([title]); r.font = { bold: true, color: { argb: 'FFEF3E4D' } }; };
    ws.addRow(['Generado', generadoEn.toLocaleString('es-GT')]);
    ws.addRow(['Fuente', 'API MSO (kpi.red.com.sv) vía proxy · consulta en vivo al descargar']);
    ws.addRow(['Operaciones', infPaisLabel()]);
    ws.addRow(['Filtros por hoja', 'Ver "Hojas del informe" (filtros combinados de cada tabla)']);
    section('SIM Cards');
    const k = Object.keys(resSim.kpis).length ? resSim.kpis : (resSim.raw?.kpis || {});
    Object.entries(k).forEach(([key, v]) => { const c = infCell(key, v); const r = ws.addRow([infLabel(key), c.excel]); if (c.fmt) r.getCell(2).numFmt = c.fmt; });
    section('Reclamos M2M');
    Object.entries(resRec || {}).forEach(([key, v]) => {
      if (Array.isArray(v)) { v.forEach(p => ws.addRow([`Prioridad ${p.orden} · ${etapaLabel(p.etapa)}`, Number(p.total) || 0])); return; }
      const c = infCell(key, v); const r = ws.addRow([infLabel(key), c.excel]); if (c.fmt) r.getCell(2).numFmt = c.fmt;
    });
    // Cada hoja respeta los filtros combinados que se eligieron para esa tabla en el informe.
    const sheetRows = {};
    INF_DATASETS.forEach(ds => { sheetRows[ds.key] = infApplyFilters(data[ds.key] || [], infState.filters[ds.key]); });
    section('Hojas del informe');
    INF_DATASETS.forEach(ds => {
      const all = (data[ds.key] || []).length, n = sheetRows[ds.key].length, fx = describeInfFilters(ds.key);
      ws.addRow([ds.sheet, fx ? `${fmtN(n)} de ${fmtN(all)} registros · ${fx}` : `${fmtN(all)} registros`]);
    });

    INF_DATASETS.forEach(ds => addInfSheet(wb, ds.sheet, sheetRows[ds.key]));

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `informe_sims_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    infProgress('');
  } catch (e) {
    showErr('infError', `No se pudo generar el Excel: ${e.message}`);
    infProgress('');
  } finally {
    forceRefresh = false;
    btn.classList.remove('is-loading');
  }
  // La tabla en pantalla pasa a mostrar los mismos datos recién consultados.
  if (activeTab === 'informe-mso') loadInforme();
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTROS COMBINADOS TIPO EXCEL — componente compartido (assets/js/filtros-guia.js)
// ═══════════════════════════════════════════════════════════════════════════
const { createXF, closeAllXF, paintIcons, listOf, selOf, joinSel } = window.FiltrosGuia;

// ═══════════════════════════════════════════════════════════════════════════
// EVENTOS
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('click', e => {
  const t = e.target;

  // ── Filtros globales (Operaciones; el resto va por el panel Filtros)
  const pa = t.closest('[data-mso-pais]');     if (pa)  { msoState.pais = pa.dataset.msoPais;   return onGlobalFilterChange(); }
  if (t.closest('#btnClearFilters')) return clearGlobalFilters();
  if (t.closest('#btnRefresh')) return refreshAll();

  // ── Drill-down desde popovers / KPIs / tarjetas
  const drill = t.closest('[data-drill-pool]');
  if (drill) {
    const dir = drill.dataset.drillDir || '', status = drill.dataset.drillStatus || '', pool = drill.dataset.drillPool || '';
    if (dir) return goOpt(dir === 'BAJAR_PLAN' ? 'bajar' : 'subir', { bolsa: pool });
    return goOpt('todas', { status, bolsa: pool });
  }
  const kpi = t.closest('[data-kpi-status]');
  if (kpi && !t.closest('.mso-kpi-detail')) {
    const status = kpi.dataset.kpiStatus;
    if (status === 'CAMBIOS') return goOpt('todas', { status, bolsa: '' });
    return goOpt('todas', { status, bolsa: '' });
  }
  const opJ = t.closest('[data-op-jump]');       if (opJ) return goOpt('todas', { operador: opJ.dataset.opJump, bolsa: '' });
  const paJ = t.closest('[data-pais-jump]');     if (paJ) return goOpt('todas', { pais: paJ.dataset.paisJump, bolsa: '' });
  const clJ = t.closest('[data-client-jump]');   if (clJ) return goOpt('todas', { cliente: clJ.dataset.clientJump, bolsa: '' });

  // ── Optimización
  const ov = t.closest('[data-opt-view]');
  if (ov) {
    if (ov.dataset.optView === msoState.optView) return;
    msoState.optView = ov.dataset.optView; msoState.optPage = 1;
    msoState.downClient = ''; msoState.upClient = '';
    msoState.allStatus = ''; msoState.allSubStatus = ''; msoState.allDirection = '';
    return loadOpt();
  }
  if (t.closest('#btnClearOptFilters')) return clearOptFilters();
  const pg = t.closest('[data-opt-page]');
  if (pg && !pg.classList.contains('disabled')) {
    const pages = Math.max(1, Math.ceil(msoState.optTotal / OPT_LIMIT));
    if (pg.dataset.optPage === 'prev' && msoState.optPage > 1) msoState.optPage--;
    if (pg.dataset.optPage === 'next' && msoState.optPage < pages) msoState.optPage++;
    return loadOpt();
  }
  if (t.closest('#btnExportCsv')) return exportOptCsv();

  // ── Informe detallado
  const ids = t.closest('[data-inf-dataset]');
  if (ids) { if (ids.dataset.infDataset !== infState.dataset) { infState.dataset = ids.dataset.infDataset; infState.search = ''; gEl('infSearch').value = ''; loadInforme(); } return; }
  const isort = t.closest('[data-inf-sort]');
  if (isort) { const k = isort.dataset.infSort; infState.sortDir = infState.sortKey === k ? -infState.sortDir : 1; infState.sortKey = k; infState.page = 1; return renderInfTable(); }
  const ipg = t.closest('[data-inf-page]');
  if (ipg && !ipg.classList.contains('disabled')) { infState.page += ipg.dataset.infPage === 'next' ? 1 : -1; renderInfTable(); return gEl('infTablePanel')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  if (t.closest('#btnInfExcel')) return downloadInformeExcel();
  if (t.closest('#btnClearInfFilters')) return clearInfFilters();
  const ip = t.closest('[data-inf-pais]');
  if (ip) { if (ip.dataset.infPais !== infState.pais) { infState.pais = ip.dataset.infPais; loadInforme(); } return; }

  // ── Reclamos
  const rp = t.closest('[data-rec-pais]');  if (rp) { msoState.recPais = rp.dataset.recPais; syncOpButtons('rec', msoState.recPais); return loadReclamos(); }
  if (t.closest('#recPeriodoReset'))        { msoState.recPeriodo = ''; return loadReclamos(); }
  if (t.closest('#btnClearRecFilters'))     return clearRecFilters();
  const rc = t.closest('[data-rec-case]');  if (rc) return openCaseDetail(rc.dataset.recCase);
  if (t.closest('#recCaseClose') || t === gEl('recCaseModal')) return closeCaseModal();
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCaseModal(); closeAllXF(); } });
gEl('optSort')?.addEventListener('change', e => { msoState.optSort = e.target.value; msoState.optPage = 1; loadOpt(); });
gEl('recPeriodo')?.addEventListener('change', e => { msoState.recPeriodo = e.target.value; loadReclamos(); });
gEl('infSearch')?.addEventListener('input', debounce(e => { infState.search = e.target.value; infState.page = 1; renderInfTable(); }, 250));
window.addEventListener('resize', debounce(() => { if (activeTab === 'resumen-mso' && _resLoaded) renderEvo(); }, 200));

// ── Filtros combinados de cada pestaña
paintIcons();
msoXF = createXF({
  host: gEl('msoXf'), chipsHost: gEl('msoXfChips'),
  onApply: sel => {
    msoState.operador = joinSel(sel.operador);
    msoState.bolsa    = joinSel(sel.bolsa);
    msoState.cliente  = joinSel(sel.cliente);
    onGlobalFilterChange();
  },
});
optXF = createXF({
  host: gEl('optXf'), chipsHost: gEl('optXfChips'),
  onApply: sel => {
    Object.entries(sel).forEach(([key, v]) => { msoState[key] = joinSel(v); });
    msoState.optPage = 1;
    loadOpt();
  },
});
recXF = createXF({
  host: gEl('recXf'), chipsHost: gEl('recXfChips'),
  onApply: sel => {
    msoState.recEtapa       = joinSel(sel.recEtapa);
    msoState.recResponsable = joinSel(sel.recResponsable);
    loadReclamos();
  },
});
infXF = createXF({
  host: gEl('infXf'), chipsHost: gEl('infXfChips'),
  onApply: sel => {
    const f = {};
    Object.entries(sel).forEach(([c, v]) => { if (v && v.length) f[c] = v; });
    infState.filters[infState.dataset] = f;
    infState.page = 1;
    updateInfXF();
    renderInfTable();
  },
});
renderGlobalFilterChips();
renderOptFilters();
renderRecFilterChips();

// ── REFRESCO ────────────────────────────────────────────────────────────────
async function refreshAll(force = true) {
  const btn = gEl('btnRefresh');
  if (btn?.classList.contains('is-loading')) return;
  btn?.classList.add('is-loading');
  syncBusy(true, 'Consultando la API…');
  forceRefresh = force;
  _resLoaded = _optLoaded = _recLoaded = false;
  infCache.clear();
  try {
    if (activeTab === 'reclamos-mso') await Promise.all([loadReclamos(), cargarFechaDatos()]);
    else if (activeTab === 'informe-mso') await Promise.all([loadResumen(), loadInforme()]);
    else await Promise.all([loadResumen(), activeTab === 'opt-mso' ? loadOpt() : null]);
  } finally {
    forceRefresh = false;
    btn?.classList.remove('is-loading');
  }
}

// Auto-refresco cada 5 min (sin forzar: aprovecha el caché del servidor).
// Se salta mientras la pestaña está en segundo plano.
setInterval(() => { if (!document.hidden) refreshAll(false); }, 5 * 60 * 1000);

// ── DESPERTAR PROXY ─────────────────────────────────────────────────────────
// En el plan gratuito de Render el servicio se duerme sin tráfico y tarda
// 30–60 s en arrancar. Se espera a /api/health con margen amplio antes de
// disparar las consultas reales, que tienen timeout de 30 s.
async function wakeProxy() {
  const healthUrl = MSO_BASE.replace(/\/api\/mso\/?$/, '') + '/api/health';
  const slowTimer = setTimeout(() => syncBusy(true, 'Consultando la API… puede tardar hasta un minuto'), 2500);
  for (let intento = 1; intento <= 3; intento++) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 75000);
    try {
      const r = await fetch(healthUrl, { signal: ctrl.signal, cache: 'no-store' });
      if (r.ok) { clearTimeout(slowTimer); syncBusy(true, 'Cargando datos…'); return true; }
    } catch (_) { /* reintenta */ }
    finally { clearTimeout(tid); }
    await new Promise(res => setTimeout(res, 3000));
  }
  clearTimeout(slowTimer);
  syncBusy(false);
  setTx('pageSync', 'Sin conexión con el servidor de datos');
  showErr('msoResError', 'No fue posible conectar con el servidor de datos. Intentá con "Actualizar datos" en unos segundos.');
  return false;
}

// Carga inicial
(async () => {
  registerReveal();
  syncBusy(true, 'Consultando la API…');
  if (await wakeProxy()) loadResumen();
})();
