// Flujo de ventas v2 · descarga en PDF (4.2).
//
// Usa la herramienta compartida del portal TAL CUAL (no se copia ni se modifica):
//   /assets/js/dashboard-pdf.js       → window.DashboardPdf.openModulePicker (ventana de módulos,
//                                        páginas, numeración y descarga con html2canvas + jsPDF)
//   /assets/js/dashboard-pdf-logo.js  → logo embebido (solo hace falta al abrir desde archivo local)
//   /assets/css/dashboard-pdf.css     → estilos de la ventana y del botón (.dashboard-pdf-…)
// Se agregan a la página del portal una sola vez cuando se abre la v2 (no se toca el portal).
// La plantilla del reporte replica la de Activaciones (exportActToPDF en
// public/dashboards/activaciones/activaciones.html, solo se leyó) con el contenido de la v2.
// Nunca incluye el teléfono del cliente.
import { formatNumber, PIPELINE_STAGES, qualificationLabel } from '../utils/analytics.js'
import { conversionCalificados, datosVistaGeneral, tarjetasEjecutivos } from './datos.js'

// Mismos valores que comunes.jsx (se repiten aquí para que este archivo no dependa de pantallas).
const CODIGO_PAIS = { Guatemala: 'GT', 'El Salvador': 'SV' }
const formatearRatio = (valor) => `${((valor || 0) * 100).toFixed(1)}%`
import { buscarFilas, filasInforme, ordenarFilas, semaforo, textoCelda, VISTAS } from './informeDatos.js'

const RECURSOS = [
  { id: 'fv2-pdf-css', tipo: 'link', url: '/assets/css/dashboard-pdf.css' },
  { id: 'fv2-pdf-logo', tipo: 'script', url: '/assets/js/dashboard-pdf-logo.js' },
  { id: 'fv2-pdf-js', tipo: 'script', url: '/assets/js/dashboard-pdf.js' },
]

/** Carga (una vez) los archivos compartidos de PDF del portal. Resuelve cuando DashboardPdf existe. */
export function cargarHerramientaPdf() {
  const espera = RECURSOS.map((r) => new Promise((resolve, reject) => {
    const existente = document.getElementById(r.id)
    if (existente) {
      if (r.tipo === 'script' && r.id === 'fv2-pdf-js' && !window.DashboardPdf) existente.addEventListener('load', resolve, { once: true })
      else resolve()
      return
    }
    const el = document.createElement(r.tipo)
    el.id = r.id
    if (r.tipo === 'link') { el.rel = 'stylesheet'; el.href = r.url } else { el.src = r.url; el.async = false }
    el.addEventListener('load', resolve, { once: true })
    el.addEventListener('error', () => reject(new Error(`No se pudo cargar ${r.url}`)), { once: true })
    document.head.appendChild(el)
  }))
  return Promise.all(espera).then(() => {
    if (!window.DashboardPdf?.openModulePicker) throw new Error('La herramienta de PDF del portal no está disponible.')
    return window.DashboardPdf
  })
}

export const MODULOS_PDF = [
  { id: 'resumen', name: 'Resumen', description: 'Tarjetas por país, indicadores, leads por mes y embudo por etapa.' },
  { id: 'ejecutivos', name: 'Ejecutivos', description: 'Ventas, conversión, unidades y seguimientos de cada ejecutivo.' },
  { id: 'informe', name: 'Informe detallado', description: 'Detalle de leads con su etapa, estado y resultado.' },
]

export const TOPE_FILAS_INFORME = 300

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const aDMA = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mesLargo = (m) => { const [y, mm] = m.split('-').map(Number); return `${MESES[mm - 1].replace(/^./, (l) => l.toUpperCase())} ${y}` }

// ---------- Textos de filtros (chips de la ventana y encabezado del reporte) ----------
export function textosFiltros({ filters, periodo, total }) {
  const pais = filters.filterPais == null || filters.filterPais.length === 2
    ? 'Todos los países'
    : filters.filterPais.map((p) => `${p} (${CODIGO_PAIS[p] ?? p})`).join(', ')
  const periodoTxt = periodo.desde || periodo.hasta ? `${aDMA(periodo.desde) || 'Sin límite'} – ${aDMA(periodo.hasta) || 'Sin límite'}` : 'Sin límite'
  const tipo = filters.filterTipoLead == null ? 'Todos' : filters.filterTipoLead.map(qualificationLabel).join(', ') || 'Ninguno'
  const ejec = filters.filterEjecutivo == null ? 'Todos' : filters.filterEjecutivo.length === 1 ? filters.filterEjecutivo[0] : `${filters.filterEjecutivo.length} seleccionados`
  return {
    pais,
    periodo: periodoTxt,
    tipo,
    ejecutivos: ejec,
    chips: [
      { label: 'País', value: pais },
      { label: 'Período', value: periodoTxt },
      { label: 'Tipo de lead', value: tipo },
      { label: 'Ejecutivos', value: ejec, tooltip: filters.filterEjecutivo?.length > 1 ? filters.filterEjecutivo.join(', ') : undefined },
      { label: 'Leads', value: formatNumber(total) },
    ],
  }
}

export function nombreArchivoPdf({ filters, periodo }) {
  const pais = filters.filterPais?.length === 1 ? CODIGO_PAIS[filters.filterPais[0]] : 'GT-SV'
  return `Reporte_flujo_ventas_${pais}_${periodo.desde || 'inicio'}_${periodo.hasta || hoyISO()}.pdf`
}

// ---------- Contenido de cada módulo (mismos cálculos que la pantalla) ----------
// style="… !important" en las tarjetas: la herramienta compartida pinta de rojo algunas tarjetas
// por posición; así se respeta la regla de colores (rojo solo para lo vencido, D12).
const kpi = (lbl, num, sub, color) => `<div class="period-kpi" style="border-top-color:${color} !important;"><div class="lbl">${esc(lbl)}</div><div class="num" style="color:${color} !important;">${esc(num)}</div><div class="sub">${esc(sub)}</div></div>`

export function seccionesReporte({ leads, summary, baseEjecutivos, informe }) {
  const datos = datosVistaGeneral(leads)
  const conv = conversionCalificados(leads)

  // 01 Resumen · página 1: países, indicadores y leads por mes
  const paises = datos.countries.map((c) => `<div class="box country"><div><div class="name">${esc(c.country)} (${esc(CODIGO_PAIS[c.country])})</div>
      <div class="sub">${formatNumber(c.total)} leads · ${formatNumber(c.qualified)} calificados · ${formatNumber(c.won)} ganados · ${c.won ? formatNumber(Math.round(c.avgUnits)) : '—'} u/cierre</div></div>
      <div><div class="pct" style="color:#4f8fd8;">${esc(formatearRatio(c.conversion.ratio))}</div><div class="tag" style="color:#4f8fd8;">Conversión de calificados</div></div></div>`).join('')
  const kpis = [
    kpi('Total leads', formatNumber(summary.total), `${formatNumber(summary.open)} abiertos`, '#151821'),
    kpi('Calificados', formatNumber(summary.qualified), `${formatNumber(summary.unqualified)} no calificados`, '#4f8fd8'),
    kpi('Ganados', formatNumber(summary.won), `${formatNumber(conv.ganadosCalificados)} de calificados · ${formatNumber(conv.ganadosNoCalificados)} de no calificados`, '#2f8f76'),
    kpi('Conversión de calificados', formatearRatio(conv.ratio), `${formatNumber(conv.ganadosCalificados)} ganados calificados ÷ ${formatNumber(conv.calificados)} calificados`, '#4f8fd8'),
    kpi('Unidades vendidas', formatNumber(summary.units), 'En leads ganados', '#151821'),
    kpi('Unidades por cierre', summary.won ? formatNumber(Math.round(summary.avgUnits)) : '—', summary.won ? `${formatNumber(summary.units)} unidades ÷ ${formatNumber(summary.won)} ganados` : 'Sin ganados', '#6b7280'),
  ].join('')
  const filasMes = datos.months.length
    ? datos.months.map((m) => `<tr><td>${esc(mesLargo(m.month))}</td><td class="c">${formatNumber(m.total)}</td><td class="c">${formatNumber(m.qualified)}</td><td class="c">${formatNumber(m.noCalificados)}</td><td class="c">${formatNumber(m.won)}</td><td class="c">${formatNumber(m.units)}</td><td class="c">${esc(formatearRatio(m.conversion.ratio))}</td></tr>`).join('')
    : '<tr><td colspan="7" class="c">Sin meses con datos</td></tr>'
  const resumen1 = `<section data-pdf-module="resumen">
  <h2>01 · Resumen — tarjetas por país e indicadores</h2>
  <div class="grid2">${paises}</div>
  <h2>Indicadores del período</h2>
  <div class="period-kpis">${kpis}</div>
  <h2>Leads por mes (ganados por fecha de cierre; el resto por fecha de creación)</h2>
  <table><thead><tr><th>Mes</th><th class="c">Leads</th><th class="c">Calificados</th><th class="c">No calificados</th><th class="c">Ganados</th><th class="c">Unidades</th><th class="c">Conv. calificados</th></tr></thead><tbody>${filasMes}</tbody></table>
  </section>`

  // 01 Resumen · página 2: embudo por etapa
  const filasEmbudo = datos.embudo.etapas.map((e) => {
    const caida = e.stage === datos.embudo.mayorCaida
    return `<tr><td>${e.stage}</td><td>${esc(e.label)}${caida ? ' <span class="badge b-near">Mayor caída</span>' : ''}</td><td class="c">${formatNumber(e.llegaron)}</td>
      <td class="c">${e.entrada == null ? 'inicio' : esc(formatearRatio(e.entrada))}</td><td class="c">${formatNumber(e.hoy)}</td>
      <td class="c">${e.hoyVencidos ? `<span class="badge b-venc">${formatNumber(e.hoyVencidos)} vencidos</span>` : '—'}</td>
      <td>${e.mejor ? `${esc(e.mejor.name)} (${esc(formatearRatio(e.mejor.ratio))})` : '—'}</td></tr>`
  }).join('')
  const resumen2 = `<section data-pdf-module="resumen">
  <h2>01 · Resumen — embudo de ventas por etapa</h2>
  <table><thead><tr><th>#</th><th>Etapa</th><th class="c">Llegaron</th><th class="c">% de paso</th><th class="c">Están hoy</th><th class="c">Gestión vencida</th><th>Mejor ejecutivo</th></tr></thead><tbody>${filasEmbudo}</tbody></table>
  <p class="nota">Etapa estimada: los leads perdidos se ubican en la última etapa con datos registrados por el vendedor. "% de paso" = leads que llegaron desde la etapa anterior. "Mejor" = mayor % de paso a la siguiente etapa (mínimo 5 leads; en Cierre, % que se ganó).</p>
  </section>`

  // 02 Ejecutivos
  const { tarjetas, equipo } = tarjetasEjecutivos(leads, baseEjecutivos)
  const filasEjec = tarjetas.map((t) => `<tr><td>${t.posicion ? `#${t.posicion}` : '—'}</td><td><b>${esc(t.name)}</b>${t.sinLeads ? ' <span style="color:#8b909e;">(sin leads en el período)</span>' : ''}</td><td class="c">${esc(CODIGO_PAIS[t.country] ?? t.country ?? '')}</td>
    <td class="c">${formatNumber(t.qualified)}</td><td class="c">${formatNumber(t.conversion.ganadosCalificados)}</td><td class="c">${t.conversion.ganadosNoCalificados ? `+${formatNumber(t.conversion.ganadosNoCalificados)}` : '—'}</td>
    <td class="c">${t.qualified ? esc(formatearRatio(t.conversion.ratio)) : '—'}</td><td class="c">${formatNumber(t.units)}</td>
    <td class="c">${t.vencidos.length ? `<span class="badge b-venc">${formatNumber(t.vencidos.length)}</span>` : 'al día'}</td></tr>`).join('')
  const ejecutivos = `<section data-pdf-module="ejecutivos">
  <h2>02 · Ejecutivos — ventas, conversión, unidades y seguimientos</h2>
  <table><thead><tr><th>Pos.</th><th>Ejecutivo</th><th class="c">País</th><th class="c">Calificados</th><th class="c">Ventas</th><th class="c">+No calificados</th><th class="c">Conv. calificados</th><th class="c">Unidades</th><th class="c">Vencidos</th></tr></thead>
  <tbody>${filasEjec || '<tr><td colspan="9" class="c">Sin ejecutivos con los filtros actuales</td></tr>'}</tbody>
  <tfoot><tr class="tot"><td></td><td><b>Equipo</b></td><td></td><td class="c">${formatNumber(equipo.calificados)}</td><td class="c">${formatNumber(equipo.ventas)}</td>
    <td class="c">${formatNumber(summary.won - equipo.ventas)}</td><td class="c">${esc(formatearRatio(equipo.ratio))}</td><td class="c">${formatNumber(equipo.unidades)}</td><td class="c">${formatNumber(equipo.vencidos)}</td></tr></tfoot></table>
  </section>`

  // 03 Informe detallado: vista rápida + búsqueda de la pestaña Informe; 10 columnas; tope 300 filas
  const vista = VISTAS.find((v) => v.key === informe.vistaKey) ?? VISTAS[0]
  const todas = ordenarFilas(buscarFilas(filasInforme(leads).filter((f) => vista.filtro(f.lead)), informe.busqueda ?? ''), 'fCreacion', 'desc')
  const visibles = todas.slice(0, TOPE_FILAS_INFORME)
  const filaInf = (f) => {
    const s = semaforo(f.lead)
    const gestion = f.v.proximaGestion ? textoCelda({ tipo: 'fecha' }, f.v.proximaGestion) : '—'
    const clase = s === 'vencida' ? 'b-venc' : s === 'hoy' ? 'b-near' : s === 'a_tiempo' ? 'b-ok' : ''
    const resultado = [f.v.resultadoVenta, f.v.motivoPerdida].filter(Boolean).join(' · ') || '—'
    return `<tr><td><b>${esc(f.v.cliente)}</b><br><span style="color:#8b909e;">${esc(f.v.codigo)}</span></td><td>${esc(f.v.ejecutivo)}</td><td class="c">${esc(CODIGO_PAIS[f.v.pais] ?? f.v.pais)}</td>
      <td class="c">${esc(f.v.calificacion)}</td><td>${f.v.etapa ? `${f.v.etapa} · ${esc(PIPELINE_STAGES[f.v.etapa - 1])}` : '—'}</td><td class="c">${esc(f.v.estado)}</td>
      <td class="c">${esc(textoCelda({ tipo: 'fecha' }, f.v.fCreacion) || '—')}</td><td class="c">${clase ? `<span class="badge ${clase}">${esc(s === 'vencida' ? `Vencida · ${gestion}` : s === 'hoy' ? 'Hoy' : gestion)}</span>` : esc(gestion)}</td>
      <td class="c">${f.v.unidades ? formatNumber(f.v.unidades) : '—'}</td><td>${esc(resultado)}</td></tr>`
  }
  const nota = todas.length > TOPE_FILAS_INFORME
    ? ` <span class="nota-h2">Se muestran los primeros ${formatNumber(TOPE_FILAS_INFORME)} de ${formatNumber(todas.length)}; el detalle completo está en Descargar Excel</span>`
    : ''
  const busq = (informe.busqueda ?? '').trim()
  const informeSec = `<section data-pdf-module="informe">
  <h2>03 · Informe detallado — vista: ${esc(vista.label)}${busq ? ` · búsqueda: "${esc(busq)}"` : ''} (${formatNumber(todas.length)} leads)${nota}</h2>
  <table><thead><tr><th>Cliente</th><th>Ejecutivo</th><th class="c">País</th><th class="c">Calificación</th><th>Etapa</th><th class="c">Estado</th><th class="c">Creación</th><th class="c">Próxima gestión</th><th class="c">Unid.</th><th>Resultado / motivo</th></tr></thead>
  <tbody>${visibles.map(filaInf).join('') || '<tr><td colspan="10" class="c">Ningún lead coincide con la vista o la búsqueda</td></tr>'}</tbody></table>
  </section>`

  return { resumen: resumen1 + resumen2, ejecutivos, informe: informeSec, conversion: conv, filasInforme: todas.length, filasInformeEnPdf: visibles.length }
}

/** HTML completo del reporte (misma plantilla que el reporte de Activaciones). */
export function construirReporte({ seleccion, leads, summary, baseEjecutivos, filters, periodo, informe }) {
  const nombres = Object.fromEntries(MODULOS_PDF.map((m) => [m.id, m.name]))
  const modulos = seleccion.map((id) => nombres[id]).filter(Boolean).join(' · ')
  const f = textosFiltros({ filters, periodo, total: leads.length })
  const s = seccionesReporte({ leads, summary, baseEjecutivos, informe })
  const ahora = new Date()
  const fechaEmision = `${ahora.toLocaleDateString('es-SV', { year: 'numeric', month: 'long', day: 'numeric' })} a las ${ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`
  const base = `${window.location.origin}/`
  const logo = new URL('/assets/img/logo-intelfon.png', window.location.origin).href
  const detalle = [`Tipo de lead: ${f.tipo}`, `Ejecutivos: ${f.ejecutivos}`, `Leads: ${formatNumber(leads.length)}`].join(' · ')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <base href="${esc(base)}">
  <title>Reporte de Flujo de Ventas - RED Intelfon</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; background: #e8eaf0; color: #242837; font-size: 12px; }
    .report-shell { width: 100%; max-width: 100%; margin: 0 auto; padding: 12px; overflow: hidden; }
    .header { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 4px solid #c43c50; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; background: #151821; color: #fff; }
    .head-left { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1; }
    .head-left > div { min-width: 0; }
    .logo { height: 54px; width: auto; max-width: 150px; object-fit: contain; }
    .eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .08em; color: #c43c50; text-transform: uppercase; }
    .title { font-size: 20px; font-weight: 800; color: #fff; margin: 2px 0; }
    .filtro { font-size: 11px; color: #cbd5e1; overflow-wrap: anywhere; }
    .head-right { flex: 0 0 180px; text-align: right; font-size: 11px; color: #cbd5e1; }
    .pill { display: inline-block; margin-top: 6px; background: #c43c50; color: #fff; font-weight: 800; padding: 6px 14px; border-radius: 8px; font-size: 12px; }
    .module-summary { margin: 10px 0 12px; padding: 8px 12px; background: #e8eaf0; border-left: 4px solid #c43c50; border-radius: 4px; color: #8b909e; font-size: 10px; }
    h2 { font-size: 13px; text-transform: uppercase; margin: 16px 0 8px; color: #151821; border-bottom: 1px solid #e8eaf0; padding-bottom: 4px; }
    .nota-h2 { display: block; margin-top: 3px; font-size: 9px; font-weight: 600; text-transform: none; color: #8b909e; }
    .period-kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
    .period-kpi { min-width: 0; overflow: hidden; border: 1px solid #e8eaf0; border-top: 6px solid #151821; border-radius: 8px; padding: 11px 10px; background: #fff; page-break-inside: avoid; }
    .period-kpi .lbl { font-size: 9px; font-weight: 800; letter-spacing: .1em; color: #8b909e; text-transform: uppercase; }
    .period-kpi .num { font-size: 18px; font-weight: 900; margin-top: 8px; white-space: nowrap; }
    .period-kpi .sub { font-size: 9px; color: #8b909e; margin-top: 6px; line-height: 1.35; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
    .box { border: 1px solid #e8eaf0; border-radius: 8px; padding: 12px 14px; }
    .country { display: flex; justify-content: space-between; align-items: center; }
    .country .name { font-size: 13px; font-weight: 800; }
    .country .sub { font-size: 11px; color: #8b909e; margin-top: 2px; }
    .country .pct { font-size: 24px; font-weight: 900; text-align: right; line-height: 1; }
    .country .tag { font-size: 10px; font-weight: 800; text-align: right; margin-top: 3px; }
    .nota { margin: 8px 0 0; font-size: 9px; color: #8b909e; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #151821; color: #fff; text-align: left; padding: 8px 10px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
    td { padding: 7px 10px; border-bottom: 1px solid #e8eaf0; }
    tr:nth-child(even) td { background: #e8eaf0; }
    .c { text-align: center; } th.c { text-align: center; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; }
    .b-ok { background: #dcfce7; color: #15803d; }
    .b-near { background: #fef3c7; color: #b45309; }
    .b-venc { background: #fee2e2; color: #c43c50; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    @media print { body { margin: 10mm; } }
  </style>
</head>
<body>
  <div class="report-shell">
  <div class="header"><div class="head-left">
    <img class="logo" id="logoImg" src="${esc(logo)}" alt="RED Intelfon" />
    <div><div class="eyebrow">RED INTELFON · MARKETING</div>
      <div class="title">Reporte de Flujo de Ventas</div>
      <div class="filtro">Filtros aplicados: <b>${esc(f.periodo)}</b> | País: <b>${esc(f.pais)}</b><br>${esc(detalle)}</div>
    </div>
  </div><div class="head-right"><div>Fecha de Emisión: <b>${esc(fechaEmision)}</b></div>
    <div class="pill">Conversión de calificados: ${esc(formatearRatio(s.conversion.ratio))}</div></div></div>
  <div class="module-summary"><b>Módulos incluidos:</b> ${esc(modulos)}</div>
  ${seleccion.includes('resumen') ? s.resumen : ''}
  ${seleccion.includes('ejecutivos') ? s.ejecutivos : ''}
  ${seleccion.includes('informe') ? s.informe : ''}
  </div>
</body>
</html>`
}
