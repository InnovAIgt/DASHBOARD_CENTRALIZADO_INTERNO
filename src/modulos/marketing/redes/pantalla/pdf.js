// Redes sociales · descarga en PDF con módulos (igual que Activaciones y el Flujo de ventas).
//
// Usa la herramienta compartida del portal TAL CUAL (no se copia ni se modifica):
//   /assets/js/dashboard-pdf.js       → window.DashboardPdf.openModulePicker (ventana "¿Qué módulos deseas incluir?")
//   /assets/js/dashboard-pdf-logo.js  → logo embebido
//   /assets/css/dashboard-pdf.css     → estilos de la ventana y del botón (.dashboard-pdf-…)
// Si otro dashboard ya los cargó, se reutilizan (se buscan por su dirección, no se cargan dos veces).
// La plantilla del reporte es una COPIA de la del Flujo de ventas v2 (flujo-ventas-v2/pantalla/pdf.js),
// con el contenido de Redes sociales. Las cifras salen de logica/calculos.js (las mismas de la pantalla).
import {
  ESTADOS, filasInforme, hallazgoRedes, leadsPorMes, META_MENSUAL, metaPorMarcaMes, MARCAS, mesesVisibles,
  pautaPorMarca, porMarca, porPais, porRed, totales,
} from '../logica/calculos.js'
import { dinero, dineroCorto, entero, fechaCorta, mesLargo, porcentaje } from '../logica/formato.js'

const RECURSOS = [
  { tipo: 'link', url: '/assets/css/dashboard-pdf.css' },
  { tipo: 'script', url: '/assets/js/dashboard-pdf-logo.js' },
  { tipo: 'script', url: '/assets/js/dashboard-pdf.js' },
]

const existente = (r) => [...document.querySelectorAll(r.tipo === 'link' ? 'link[href]' : 'script[src]')]
  .find((el) => new URL(el.getAttribute(r.tipo === 'link' ? 'href' : 'src'), window.location.origin).pathname === r.url)

/** Carga (una vez) los archivos compartidos de PDF del portal. Resuelve cuando DashboardPdf existe. */
export function cargarHerramientaPdf() {
  if (window.DashboardPdf?.openModulePicker && existente(RECURSOS[0])) return Promise.resolve(window.DashboardPdf)
  const espera = RECURSOS.map((r) => new Promise((resolve, reject) => {
    const ya = existente(r)
    if (ya) {
      if (r.url.endsWith('dashboard-pdf.js') && !window.DashboardPdf) ya.addEventListener('load', resolve, { once: true })
      else resolve()
      return
    }
    const el = document.createElement(r.tipo)
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
  { id: 'resumen', name: 'Resumen', description: 'Indicadores, meta de 14 al mes, leads por mes, resultados por país, por marca y Facebook vs. Instagram.' },
  { id: 'informe', name: 'Informe detallado', description: 'Detalle de publicaciones por red con sus resultados, costos y estado.' },
]

export const TOPE_FILAS_INFORME = 300

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const mesTitulo = (m) => mesLargo(m).replace(/^./, (l) => l.toUpperCase())

export function nombreArchivoPdf(filtros) {
  return `Reporte_redes_sociales_${filtros.pais ?? 'GT-SV'}_${filtros.desde || 'inicio'}_${filtros.hasta || hoyISO()}.pdf`
}

const kpi = (lbl, num, sub, color) => `<div class="period-kpi" style="border-top-color:${color} !important;"><div class="lbl">${esc(lbl)}</div><div class="num" style="color:${color} !important;">${esc(num)}</div><div class="sub">${esc(sub)}</div></div>`
const TEXTO_META = { cumplio: () => '✓ cumplió', faltan: (c) => `faltan ${c.faltan}`, sin_posts: () => 'sin posts', inicio: (c) => `inicio · ${c.n}`, en_curso: (c) => `en curso · van ${c.n}` }
const CLASE_META = { cumplio: 'b-ok', faltan: 'b-near', sin_posts: '', inicio: '', en_curso: '' }

export function seccionesReporte({ datos, filas, filtros, informe }) {
  const { publicaciones } = datos
  const t = totales(filas, publicaciones)
  const meses = mesesVisibles(datos.meses, filtros)
  const marcas = MARCAS.filter((m) => !filtros.marca || filtros.marca.includes(m.clave)).filter((m) => !filtros.pais || m.pais === filtros.pais)

  // 01 Resumen · indicadores, meta y leads por mes
  const desglose = pautaPorMarca(filas).map((m) => `${m.clave === 'datared' ? 'Datared' : m.clave.toUpperCase()} ${dineroCorto(m.pauta)}`).join(' · ')
  const kpis = [
    kpi('Publicaciones', entero(t.publicaciones), `${entero(t.hechas)} hechas · ${entero(t.programadas)} programadas · meta ${META_MENSUAL} por marca al mes`, '#4f8fd8'),
    kpi('Leads', entero(t.leads), 'Mensajes recibidos', '#151821'),
    kpi('Calificados', entero(t.calificados), `${porcentaje(t.pctCalificados)} de los leads · ${entero(t.noCalificados)} no calificados`, '#4f8fd8'),
    kpi('Cierres', entero(t.cierres), `${entero(t.unidades)} unidades vendidas`, '#2f8f76'),
    kpi('Pauta invertida', dinero(t.pauta), desglose, '#b58900'),
    kpi('Costo por lead calificado', dinero(t.costoCalificado), `${dinero(t.pauta)} ÷ ${entero(t.calificados)}`, '#b58900'),
  ].join('')
  const grid = metaPorMarcaMes(filas, { ...datos, meses, marcas })
  const filasMeta = grid.map((m) => `<tr><td><b>${esc(m.nombre)}</b> <span style="color:#8b909e;">${esc(m.pais)}</span></td>${m.celdas.map((c) => `<td class="c">${c.n ? `<b>${c.n}</b><br>` : ''}<span class="badge ${CLASE_META[c.estado]}">${esc(TEXTO_META[c.estado](c))}</span></td>`).join('')}</tr>`).join('')
  const lm = leadsPorMes(filas, meses)
  const filasLeads = lm.map((m) => m.sinDatos
    ? `<tr><td>${esc(mesTitulo(m.mes))}</td><td class="c" colspan="4" style="color:#8b909e;">sin datos</td></tr>`
    : `<tr><td>${esc(mesTitulo(m.mes))}</td><td class="c">${entero(m.leads)}</td><td class="c">${entero(m.calificados)}</td><td class="c">${entero(m.noCalificados)}</td><td class="c">${entero(m.cierres)}</td></tr>`).join('')

  const resumen1 = `<section data-pdf-module="resumen">
  <h2>01 · Resumen — indicadores del período</h2>
  <div class="period-kpis">${kpis}</div>
  <h2>Meta: ${META_MENSUAL} publicaciones al mes por marca <span class="nota-h2">Facebook + Instagram de un mismo post cuentan como 1 · inicio = primer mes de la marca (no cuenta como incumplido)</span></h2>
  <table><thead><tr><th>Marca</th>${meses.map((m) => `<th class="c">${esc(mesTitulo(m))}</th>`).join('')}</tr></thead><tbody>${filasMeta || '<tr><td class="c">Sin datos</td></tr>'}</tbody></table>
  <h2>Leads generados por mes</h2>
  <table><thead><tr><th>Mes</th><th class="c">Leads</th><th class="c">Calificados</th><th class="c">No calificados</th><th class="c">Cierres</th></tr></thead><tbody>${filasLeads || '<tr><td colspan="5" class="c">Sin meses</td></tr>'}</tbody></table>
  </section>`

  // 01 Resumen · país, marca y redes
  const { paises, total } = porPais(filas, publicaciones)
  const filaPais = (p, nombre, marcasTxt) => `<tr><td><b>${esc(nombre)}</b></td><td>${esc(marcasTxt)}</td><td class="c">${entero(p.hechas)}</td><td class="c">${entero(p.programadas)}</td><td class="c">${entero(p.leads)}</td><td class="c">${entero(p.calificados)}</td><td class="c">${entero(p.noCalificados)}</td><td class="c">${porcentaje(p.pctCalificados)}</td></tr>`
  const filasMarca = porMarca(filas, publicaciones).map((m) => `<tr><td><b>${esc(m.nombre)}</b></td><td class="c">${esc(m.pais)}</td><td class="c">${entero(m.publicaciones)}</td><td class="c">${entero(m.leads)}</td><td class="c">${entero(m.calificados)}</td><td class="c">${entero(m.noCalificados)}</td><td class="c">${entero(m.cierres)} · ${entero(m.unidades)}</td><td class="c">${dinero(m.pauta)}</td><td class="c">${m.calificados ? dinero(m.costoCalificado) : '—'}</td></tr>`).join('')
  const redes = porRed(filas, publicaciones)
  const filasRed = redes.map((r) => `<tr><td><b>${esc(r.red)}</b></td><td class="c">${entero(r.filas)}</td><td class="c">${entero(r.alcance)}</td><td class="c">${entero(r.leads)}</td><td class="c">${entero(r.calificados)}</td></tr>`).join('')
  const resumen2 = `<section data-pdf-module="resumen">
  <h2>Resultados por país <span class="nota-h2">El Salvador = RED El Salvador + Datared · Programadas = fecha posterior a hoy</span></h2>
  <table><thead><tr><th>País</th><th>Marcas</th><th class="c">Hechas</th><th class="c">Programadas</th><th class="c">Leads</th><th class="c">Calificados</th><th class="c">No calificados</th><th class="c">% calificados</th></tr></thead>
  <tbody>${paises.map((p) => filaPais(p, `${p.nombre} (${p.clave})`, p.marcas.join(' · '))).join('')}</tbody>
  <tfoot><tr class="tot">${filaPais(total, 'Total', '').replace(/^<tr>|<\/tr>$/g, '')}</tr></tfoot></table>
  <h2>Resultados por marca</h2>
  <table><thead><tr><th>Marca</th><th class="c">País</th><th class="c">Publicaciones</th><th class="c">Leads</th><th class="c">Calificados</th><th class="c">No calificados</th><th class="c">Cierres · unid.</th><th class="c">Pauta</th><th class="c">Pauta por lead calif.</th></tr></thead><tbody>${filasMarca}</tbody></table>
  <h2>Facebook vs. Instagram</h2>
  <table><thead><tr><th>Red</th><th class="c">Filas</th><th class="c">Alcance</th><th class="c">Leads</th><th class="c">Calificados</th></tr></thead><tbody>${filasRed}</tbody></table>
  <p class="nota">${esc(hallazgoRedes(redes))}</p>
  </section>`

  // 02 Informe detallado: vista y búsqueda de la pestaña Informe; tope 300 filas
  const todas = filasInforme(filas, informe)
  const visibles = todas.slice(0, TOPE_FILAS_INFORME)
  const filaInf = (f) => `<tr><td class="c">${esc(fechaCorta(f.fecha))}</td><td>${esc(f.marca)}</td><td>${esc(f.red)}</td><td><b>${esc(f.campana)}</b>${f.advertencias.length ? ' <span class="badge b-near">⚠ revisar</span>' : ''}</td>
    <td class="c">${dineroCorto(f.pauta)}</td><td class="c">${entero(f.alcance)}</td><td class="c">${entero(f.leads)}</td><td class="c">${entero(f.calificados)}</td><td class="c">${f.noCalificados !== null && f.noCalificados < 0 ? `<span class="badge b-near">⚠ ${entero(f.noCalificados)}</span>` : entero(f.noCalificados)}</td>
    <td class="c">${dinero(f.costoLead)}</td><td class="c">${entero(f.cierres)}</td><td class="c">${entero(f.unidades)}</td><td class="c">${esc(ESTADOS[f.estadoFila].etiqueta)}</td></tr>`
  const nota = todas.length > TOPE_FILAS_INFORME ? ` <span class="nota-h2">Se muestran las primeras ${entero(TOPE_FILAS_INFORME)} de ${entero(todas.length)}; el detalle completo está en Descargar Excel</span>` : ''
  const busq = (informe.busqueda ?? '').trim()
  const informeSec = `<section data-pdf-module="informe">
  <h2>02 · Informe detallado — vista: ${esc(informe.etiquetaVista)}${busq ? ` · búsqueda: "${esc(busq)}"` : ''} (${entero(todas.length)} filas)${nota}</h2>
  <table><thead><tr><th class="c">Fecha</th><th>Marca</th><th>Red</th><th>Publicación</th><th class="c">Pauta</th><th class="c">Alcance</th><th class="c">Leads</th><th class="c">Calif.</th><th class="c">No calif.</th><th class="c">Costo/lead</th><th class="c">Cierres</th><th class="c">Unid.</th><th class="c">Estado</th></tr></thead>
  <tbody>${visibles.map(filaInf).join('') || '<tr><td colspan="13" class="c">Ninguna fila coincide con la vista o la búsqueda</td></tr>'}</tbody></table>
  <p class="nota">No calificados = leads − calificados · Costos calculados con la pauta (no se usan los del Excel).</p>
  </section>`

  return { resumen: resumen1 + resumen2, informe: informeSec, totales: t }
}

/** HTML completo del reporte (misma plantilla que el reporte del Flujo de ventas y Activaciones). */
export function construirReporte({ seleccion, datos, filas, filtros, textos, informe, actualizado }) {
  const nombres = Object.fromEntries(MODULOS_PDF.map((m) => [m.id, m.name]))
  const modulos = seleccion.map((id) => nombres[id]).filter(Boolean).join(' · ')
  const s = seccionesReporte({ datos, filas, filtros, informe })
  const ahora = new Date()
  const fechaEmision = `${ahora.toLocaleDateString('es-SV', { year: 'numeric', month: 'long', day: 'numeric' })} a las ${ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`
  const base = `${window.location.origin}/`
  const logo = new URL('/assets/img/logo-intelfon.png', window.location.origin).href
  const detalle = [`Marca: ${textos.marca}`, `Red: ${textos.red}`, `Publicaciones: ${entero(s.totales.publicaciones)}`, `Actualizado: ${actualizado ?? 'sin fecha'}`].join(' · ')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <base href="${esc(base)}">
  <title>Reporte de Redes sociales - RED Intelfon</title>
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
    .head-right { flex: 0 0 190px; text-align: right; font-size: 11px; color: #cbd5e1; }
    .pill { display: inline-block; margin-top: 6px; background: #c43c50; color: #fff; font-weight: 800; padding: 6px 14px; border-radius: 8px; font-size: 12px; }
    .module-summary { margin: 10px 0 12px; padding: 8px 12px; background: #e8eaf0; border-left: 4px solid #c43c50; border-radius: 4px; color: #8b909e; font-size: 10px; }
    h2 { font-size: 13px; text-transform: uppercase; margin: 16px 0 8px; color: #151821; border-bottom: 1px solid #e8eaf0; padding-bottom: 4px; }
    .nota-h2 { display: block; margin-top: 3px; font-size: 9px; font-weight: 600; text-transform: none; color: #8b909e; }
    .period-kpis { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 10px; }
    .period-kpi { min-width: 0; overflow: hidden; border: 1px solid #e8eaf0; border-top: 6px solid #151821; border-radius: 8px; padding: 11px 10px; background: #fff; page-break-inside: avoid; }
    .period-kpi .lbl { font-size: 9px; font-weight: 800; letter-spacing: .1em; color: #8b909e; text-transform: uppercase; }
    .period-kpi .num { font-size: 18px; font-weight: 900; margin-top: 8px; white-space: nowrap; }
    .period-kpi .sub { font-size: 9px; color: #8b909e; margin-top: 6px; line-height: 1.35; }
    .nota { margin: 8px 0 0; font-size: 9px; color: #8b909e; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #151821; color: #fff; text-align: left; padding: 8px 10px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
    td { padding: 7px 10px; border-bottom: 1px solid #e8eaf0; }
    tr:nth-child(even) td { background: #e8eaf0; }
    .tot td { font-weight: 800; background: #fff !important; border-top: 2px solid #151821; }
    .c { text-align: center; } th.c { text-align: center; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #6b7280; }
    .b-ok { background: #dcfce7; color: #15803d; }
    .b-near { background: #fef3c7; color: #b45309; }
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
      <div class="title">Reporte de Redes sociales</div>
      <div class="filtro">Filtros aplicados: <b>${esc(textos.periodo)}</b> | País: <b>${esc(textos.pais)}</b><br>${esc(detalle)}</div>
    </div>
  </div><div class="head-right"><div>Fecha de Emisión: <b>${esc(fechaEmision)}</b></div>
    <div class="pill">Costo por lead calificado: ${esc(dinero(s.totales.costoCalificado))}</div></div></div>
  <div class="module-summary"><b>Módulos incluidos:</b> ${esc(modulos)}</div>
  ${seleccion.includes('resumen') ? s.resumen : ''}
  ${seleccion.includes('informe') ? s.informe : ''}
  </div>
</body>
</html>`
}
