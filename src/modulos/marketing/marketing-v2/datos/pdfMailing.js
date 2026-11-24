// Canales de marketing · Mailing · PDF de la vista actual (botón «PDF» de la barra de filtros).
// Usa la herramienta compartida del portal TAL CUAL (no se copia ni se modifica), como Facturación:
//   /assets/js/dashboard-pdf.js  → window.DashboardPdf.openModulePicker (ventana de módulos, páginas y descarga)
//   /assets/js/dashboard-pdf-logo.js y /assets/css/dashboard-pdf.css
// Estructura que pide la herramienta: .report-shell > .header + .module-summary + section[data-pdf-module] (h2 + tabla).
// Con datos reales de las rutas de Mailing y los filtros aplicados. El módulo «Correos por corregir» incluye las
// direcciones (decisión de Keily).
import { textosCampana } from './campana.js'
import { fechaCorta, fechaHora, NOMBRE_CARGO, numero, pct, porcentaje, sumarTotales } from './calculos.js'

const RECURSOS = [
  { tipo: 'link', url: '/assets/css/dashboard-pdf.css' },
  { tipo: 'script', url: '/assets/js/dashboard-pdf-logo.js' },
  { tipo: 'script', url: '/assets/js/dashboard-pdf.js' },
]

/** Carga (una vez) los archivos compartidos de PDF del portal; si ya están (por ejemplo, desde otra pantalla), los reutiliza. */
export function cargarHerramientaPdf() {
  if (typeof window !== 'undefined' && window.DashboardPdf?.openModulePicker) return Promise.resolve(window.DashboardPdf)
  const espera = RECURSOS.map((r) => new Promise((resolve, reject) => {
    const selector = r.tipo === 'link' ? `link[href^="${r.url}"]` : `script[src^="${r.url}"]`
    const existente = document.querySelector(selector)
    if (existente) {
      if (r.url.endsWith('dashboard-pdf.js') && !window.DashboardPdf) existente.addEventListener('load', resolve, { once: true })
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

export const MODULOS_PDF_MAILING = [
  { id: 'generales', name: 'Resultados generales', description: 'Tarjetas principales y calidad de contactos de las campañas filtradas.' },
  { id: 'campanas', name: 'Resultado por campaña', description: 'Asunto, nombre real, cifras y % de entrega de cada campaña.' },
  { id: 'comparar', name: 'Comparar campañas', description: 'Campañas ordenadas por tasa de entrega, con apertura y clic.' },
  { id: 'corregir', name: 'Correos por corregir', description: 'Direcciones a corregir con cliente, ejecutivo, motivo y campaña.' },
]

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const cargo = (c) => NOMBRE_CARGO[c] ?? c ?? 'Sin clasificar'
const campanaHtml = (c, id) => { const t = textosCampana(c, id); return `<b>${esc(t.titulo)}</b><br><span style="color:#7b8797">${esc(t.linea)}</span>` }
const tabla = (encabezados, filas) => `<table><thead><tr>${encabezados.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${filas.length ? filas.join('') : `<tr><td colspan="${encabezados.length}">Sin datos con los filtros actuales.</td></tr>`}</tbody></table>`

/** Chips de filtros (para la ventana del PDF y el encabezado). */
export function chipsFiltros(filtros, campanaElegida) {
  return [
    { label: 'País cliente', value: filtros.pais || 'Todos' },
    { label: 'Período', value: filtros.desde || filtros.hasta ? `${filtros.desde ? fechaCorta(`${filtros.desde}T12:00:00`) : 'inicio'} – ${filtros.hasta ? fechaCorta(`${filtros.hasta}T12:00:00`) : 'hoy'}` : 'Todo' },
    { label: 'Campaña', value: filtros.campana ? textosCampana(campanaElegida, filtros.campana).corto : 'Todas' },
    { label: 'Cargo', value: filtros.cargo ? cargo(filtros.cargo) : 'Todos' },
    { label: 'Asunto', value: filtros.asunto || 'Todos' },
    { label: 'Empresa / cliente', value: filtros.cliente || 'Todas' },
  ]
}

/**
 * HTML del reporte. corregir = filas correo + campaña marcadas CORREGIR (ya con los filtros); nombres = campañas por id.
 * @param {{seleccion: string[], campanas: object[], cuentas: object, corregir: object[], nombres: Record<number, object>, chips: object[], origen: string, ahora?: Date}} p
 */
export function construirReporteMailing({ seleccion, campanas, cuentas, corregir, nombres, chips, origen, ahora = new Date() }) {
  const t = sumarTotales(campanas)
  const enviadas = campanas.filter((c) => c.estado === 'enviada')
  const modulos = MODULOS_PDF_MAILING.filter((m) => seleccion.includes(m.id)).map((m) => m.name).join(' · ')
  const fechaEmision = `${ahora.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Guatemala' })} a las ${ahora.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala' })}`
  const filtrosTxt = chips.map((c) => `${c.label}: ${c.value}`).join(' | ')
  const kpi = (lbl, num, sub) => `<div class="period-kpi"><div class="lbl">${esc(lbl)}</div><div class="num">${esc(num)}</div><div class="sub">${esc(sub)}</div></div>`

  const generales = `<section data-pdf-module="generales"><h2>1. Resultados generales</h2>
    <div class="period-kpis">
      ${kpi('Enviados', numero(t.enviados), `${numero(t.campanas)} campañas`)}
      ${kpi('Entregados', numero(t.entregados), `${pct(t.tasas.entrega)} de los envíos`)}
      ${kpi('Apertura', numero(t.aperturas), `${pct(t.tasas.apertura)} de entregados (incluye automáticas)`)}
      ${kpi('Clic', numero(t.clics), `${pct(t.tasas.clic)} de entregados`)}
      ${kpi('Rebote temporal', numero(t.reboteTemporal), `${pct(t.tasas.reboteTemporal)} de los envíos`)}
      ${kpi('Rebote duro', numero(t.rebotePermanente), `${pct(t.tasas.rebotePermanente)} de los envíos`)}
    </div>
    ${tabla(['Calidad de contactos', 'Valor', 'Detalle'], [
      `<tr><td>Tasa de entrega</td><td>${esc(pct(t.tasas.entrega))}</td><td>Semáforo: ${esc(t.semaforo ?? '—')} (100 % verde · 90 a 99,9 % amarillo · menos de 90 % rojo)</td></tr>`,
      `<tr><td>Correos por corregir</td><td>${esc(cuentas?.corregir != null ? numero(cuentas.corregir) : '—')}</td><td>Direcciones únicas · ${esc(cuentas?.casosCorregir != null ? numero(cuentas.casosCorregir) : '—')} casos (correo + campaña)</td></tr>`,
      `<tr><td>Sin confirmación</td><td>${esc(numero(t.sinConfirmacion))}</td><td>Enviados sin entrega ni rebote informados</td></tr>`,
      `<tr><td>Bajas</td><td>${esc(numero(t.bajas))}</td><td>Se dieron de baja de la lista</td></tr>`,
      `<tr><td>Marcados como spam</td><td>${esc(numero(t.quejas))}</td><td>Quejas de los destinatarios</td></tr>`,
    ])}</section>`

  const porFecha = [...enviadas].sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0))
  const campanasHtml = `<section data-pdf-module="campanas"><h2>2. Resultado por campaña</h2>
    ${tabla(['Campaña', 'Cargo', 'Enviados', 'Entregados', 'Aperturas', 'Clics', 'Rebote temporal', 'Rebote duro', '% Entrega'],
      porFecha.map((c) => `<tr><td>${campanaHtml(c)}</td><td>${esc(cargo(c.cargo))}</td><td>${numero(c.totales.enviados)}</td><td>${numero(c.totales.entregados)}</td><td>${numero(c.totales.aperturas)}</td><td>${numero(c.totales.clics)}</td><td>${numero(c.totales.reboteTemporal)}</td><td>${numero(c.totales.rebotePermanente)}</td><td>${esc(pct(c.tasas.entrega))}</td></tr>`))}</section>`

  const porEntrega = [...enviadas].sort((a, b) => (b.tasas.entrega ?? -1) - (a.tasas.entrega ?? -1))
  const comparar = `<section data-pdf-module="comparar"><h2>3. Comparar campañas (por tasa de entrega)</h2>
    ${tabla(['#', 'Campaña', 'Cargo', 'Envíos', '% Entrega', '% Apertura', '% Clic', '% Rebotes'],
      porEntrega.map((c, i) => `<tr><td>${i + 1}</td><td>${campanaHtml(c)}</td><td>${esc(cargo(c.cargo))}</td><td>${numero(c.totales.enviados)}</td><td>${esc(pct(c.tasas.entrega))}</td><td>${esc(pct(c.tasas.apertura))}</td><td>${esc(pct(c.tasas.clic))}</td><td>${esc(pct(porcentaje(c.totales.reboteTemporal + c.totales.rebotePermanente, c.totales.enviados)))}</td></tr>`))}</section>`

  const empresas = (f) => [...(f.clientes?.length ? f.clientes : f.posibles ?? [])]
  const corregirHtml = `<section data-pdf-module="corregir"><h2>4. Correos por corregir (${numero(new Set(corregir.map((f) => String(f.correo).toLowerCase())).size)} direcciones · ${numero(corregir.length)} casos)</h2>
    ${tabla(['Dirección de correo', 'Cliente', 'Ejecutivo de ventas', 'Motivo técnico', 'Resultado final', 'Campaña', 'Fecha rebote'],
      corregir.map((f) => `<tr><td>${esc(f.correo)}</td><td>${esc(empresas(f).map((e) => e.cliente).join(' / ') || 'Sin identificar')}${!f.clientes?.length && f.posibles?.length ? ' (posible por dominio)' : ''}</td><td>${esc([...new Set(empresas(f).map((e) => e.ejecutivo).filter(Boolean))].join(' / ') || 'Sin identificar')}</td><td>${esc(f.motivoTecnico ?? 'Pendiente de verificar')}</td><td>${esc(f.estadoTexto)}</td><td>${campanaHtml(nombres[f.campana_id], f.campana_id)}</td><td>${esc(fechaHora(f.fechaRebote))}</td></tr>`))}</section>`

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><base href="${esc(`${origen}/`)}"><title>Reporte de Mailing - RED Intelfon</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Segoe UI", Roboto, Arial, sans-serif; margin: 0; background: #e8eaf0; color: #242837; font-size: 12px; }
  .report-shell { width: 100%; margin: 0 auto; padding: 12px; overflow: hidden; }
  .header { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 4px solid #c9364b; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; background: #141821; color: #fff; }
  .head-left { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1; }
  .logo { height: 54px; width: auto; max-width: 150px; object-fit: contain; }
  .eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .08em; color: #c9364b; text-transform: uppercase; }
  .title { font-size: 20px; font-weight: 800; color: #fff; margin: 2px 0; }
  .filtro { font-size: 11px; color: #cbd5e1; overflow-wrap: anywhere; }
  .head-right { flex: 0 0 180px; text-align: right; font-size: 11px; color: #cbd5e1; }
  .pill { display: inline-block; margin-top: 6px; background: #c9364b; color: #fff; font-weight: 800; padding: 6px 14px; border-radius: 8px; font-size: 12px; }
  .module-summary { margin: 10px 0 12px; padding: 8px 12px; background: #e8eaf0; border-left: 4px solid #c9364b; border-radius: 4px; color: #8b909e; font-size: 10px; }
  h2 { font-size: 13px; text-transform: uppercase; margin: 16px 0 8px; color: #141821; }
  .period-kpis { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 10px; margin-bottom: 10px; }
  .period-kpi { min-width: 0; border: 1px solid #e8eaf0; border-top: 6px solid #141821; border-radius: 8px; padding: 11px 10px; background: #fff; }
  .period-kpi .lbl { font-size: 9px; font-weight: 800; letter-spacing: .1em; color: #8b909e; text-transform: uppercase; }
  .period-kpi .num { font-size: 18px; font-weight: 900; margin-top: 8px; white-space: nowrap; }
  .period-kpi .sub { font-size: 9px; color: #8b909e; margin-top: 6px; line-height: 1.35; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #141821; color: #fff; text-align: left; padding: 8px 10px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
  td { padding: 7px 10px; border-bottom: 1px solid #e8eaf0; vertical-align: top; overflow-wrap: anywhere; }
  tr:nth-child(even) td { background: #f3f4f7; }
  thead { display: table-header-group; } tr { page-break-inside: avoid; }
</style></head>
<body><div class="report-shell">
  <div class="header"><div class="head-left">
    <img class="logo" src="${esc(`${origen}/assets/img/logo-intelfon.png`)}" alt="RED Intelfon" />
    <div><div class="eyebrow">RED INTELFON · MARKETING</div><div class="title">Reporte de Mailing · Canales de marketing</div>
      <div class="filtro">Filtros aplicados: ${esc(filtrosTxt)}</div></div>
  </div><div class="head-right"><div>Fecha de emisión: <b>${esc(fechaEmision)}</b></div><div class="pill">Entrega: ${esc(pct(t.tasas.entrega))}</div></div></div>
  <div class="module-summary"><b>Módulos incluidos:</b> ${esc(modulos)}</div>
  ${seleccion.includes('generales') ? generales : ''}
  ${seleccion.includes('campanas') ? campanasHtml : ''}
  ${seleccion.includes('comparar') ? comparar : ''}
  ${seleccion.includes('corregir') ? corregirHtml : ''}
</div></body></html>`
}

/** Nombre del archivo: Mailing_<país>_<fecha>.pdf */
export const nombreArchivoPdf = (filtros, ahora = new Date()) => `Mailing_${filtros.pais || 'GT-SV'}_${ahora.toISOString().slice(0, 10)}.pdf`
