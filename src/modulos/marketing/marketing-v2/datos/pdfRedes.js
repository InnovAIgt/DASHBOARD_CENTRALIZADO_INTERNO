// Canales de marketing · Redes sociales · PDF de la vista actual (botón «PDF» de la barra de Redes).
// Misma herramienta compartida del portal que Mailing (dashboard-pdf.js, se carga con cargarHerramientaPdf de
// pdfMailing.js, sin modificarla). Estructura: .report-shell > .header + .module-summary + section[data-pdf-module].
// Respeta los filtros (país, marca, red, mes; formato y estado en Publicaciones). El dinero va por moneda, nunca sumado.
// Si los datos son de ejemplo, el reporte lo dice arriba.
import { numero, pct } from './calculos.js'
import { alcancePorMarca, dinero, ESTADOS, nombreCampana, filtrarRedes, FORMATOS, hechasYProgramadas, MARCAS, metricasCuentas, nombreMes, REDES, resumenPublicaciones, seguidores, separarReclutamiento, TEXTO_IG_SIN_PROGRAMADAS, totalesAnuncios } from './redes.js'
import { ordenarPublicaciones, pautaPorCampana, programadoVsPublicado } from './redesVista.js'
import { CSS_PDF_EXTRA, estimadorLeadsPdf, htmlLeadsRedes, htmlTarjetasAnuncios, leadsDeMarcaPdf, leadsDelReporte, REGLA_LEADS_CAMPANA, textoLeadsEst } from './pdfRedesExtra.js'

export const MODULOS_PDF_REDES = [
  { id: 'resumen', name: 'Resumen', description: 'Publicaciones, alcance, interacciones, seguidores, leads de Redes (embudo y tarjetas), tabla por país y marca con leads.' },
  { id: 'publicaciones', name: 'Publicaciones', description: 'Todas las publicaciones del mes con estado, alcance, interacciones y tasa.' },
  { id: 'anuncios', name: 'Anuncios', description: 'Campañas con gasto, mensajes, costo por mensaje y leads estimados; presupuestos, plataformas y segmentaciones con su lectura.' },
]
const CASO = { A: 'Plan del mes', B: 'Programadas de Facebook (API)', C: 'Sin programadas (solo publicado)' }

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const tabla = (encabezados, filas) => `<table><thead><tr>${encabezados.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${filas.length ? filas.join('') : `<tr><td colspan="${encabezados.length}">Sin datos con los filtros actuales.</td></tr>`}</tbody></table>`

/** Chips de filtros para la ventana de la herramienta y para el encabezado. */
export function chipsFiltrosRedes(filtros) {
  return [
    { label: 'Mes', value: nombreMes(filtros.mes) },
    { label: 'País', value: filtros.pais || 'GT y SV' },
    { label: 'Marca', value: filtros.marca ? MARCAS[filtros.marca]?.corto ?? filtros.marca : 'Todas' },
    { label: 'Red', value: filtros.red ? REDES[filtros.red] : 'Facebook e Instagram' },
    ...(filtros.formato ? [{ label: 'Formato', value: FORMATOS[filtros.formato] ?? filtros.formato }] : []),
    ...(filtros.estado ? [{ label: 'Estado', value: ESTADOS[filtros.estado] ?? filtros.estado }] : []),
  ]
}

export const nombreArchivoPdfRedes = (filtros, ahora = new Date()) => `Redes_${filtros.mes || 'mes'}_${filtros.pais || 'GT-SV'}_${ahora.toISOString().slice(0, 10)}.pdf`

/**
 * HTML del reporte. datos = estado de useRedesDatos; items = de armarProgramado; caso = A | B | C; leadsRedes = de
 * useLeadsRedes (solo se usan conteos); detalle = /anuncios-detalle del mes (las 3 tarjetas y los leads por campaña).
 */
export function construirReporteRedes({ seleccion, datos, items, caso, filtros, origen, leadsRedes = null, detalle = null, ahora = new Date() }) {
  const f = { ...filtros, formato: '', estado: '' }
  const base = filtrarRedes(items, f)
  const r = resumenPublicaciones(base)
  const conPlan = caso !== 'C'
  const marcas = Object.keys(MARCAS).filter((m) => (!filtros.pais || MARCAS[m].pais === filtros.pais) && (!filtros.marca || m === filtros.marca))
  const cuentas = filtrarRedes(datos.cuentas, { ...f, mes: '' })
  const { marketing: anuncios, reclutamiento } = separarReclutamiento(filtrarRedes(datos.anuncios, { ...f, red: '' }))
  const t = totalesAnuncios(anuncios)
  const tRec = totalesAnuncios(reclutamiento)
  const mc = metricasCuentas(cuentas, filtros.mes)
  const alcMarca = alcancePorMarca(cuentas, filtros.mes, null, marcas)
  const chips = chipsFiltrosRedes(filtros)
  const modulos = MODULOS_PDF_REDES.filter((m) => seleccion.includes(m.id)).map((m) => m.name).join(' · ')
  const fechaEmision = `${ahora.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Guatemala' })} a las ${ahora.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala' })}`
  const kpi = (lbl, num, sub) => `<div class="period-kpi"><div class="lbl">${esc(lbl)}</div><div class="num">${esc(num)}</div><div class="sub">${esc(sub)}</div></div>`
  const porMoneda = (campo) => t.porMoneda.map((m) => dinero(m[campo], m.moneda)).join(' · ') || '—'
  const leads = leadsDelReporte(leadsRedes, filtros)
  const unaMoneda = t.porMoneda.length === 1 ? t.porMoneda[0] : null

  const resumen = `<section data-pdf-module="resumen"><h2>1. Resumen · ${esc(nombreMes(filtros.mes))}</h2>
    <div class="period-kpis">
      ${kpi('Publicaciones', conPlan ? `${numero(r.cumplidas)} de ${numero(r.aFecha)}` : numero(r.publicadas), conPlan ? `${pct(r.cumplimiento)} cumplido · ${numero(r.programadas)} por venir` : 'publicadas · sin programadas')}
      ${kpi('Alcance', mc ? numero(mc.alcanceDiario) : '—', 'suma de alcance diario')}
      ${kpi('Interacciones', numero(r.interacciones), `tasa ${pct(r.tasa)}`)}
      ${kpi('Seguidores', numero(seguidores(cuentas)), `${numero(cuentas.length)} cuentas`)}
      ${kpi('Inversión', porMoneda('gastado'), `${numero(t.campanas)} campañas${tRec.campanas ? ` · reclutamiento aparte: ${tRec.porMoneda.map((m) => dinero(m.gastado, m.moneda)).join(' · ')}` : ''}`)}
      ${kpi('Mensajes', numero(t.mensajes), `${porMoneda('costoMensaje')} c/u`)}
    </div>
    ${tabla(['País', 'Marca', 'Facebook hechas', 'Facebook programadas', 'Instagram hechas', 'Instagram programadas', 'Total hechas', 'Leads calificados'],
      hechasYProgramadas(base, marcas).flatMap((pa) => [...pa.marcas, ...(pa.marcas.length > 1 ? [{ ...pa.total, marca: '' }] : [])].map((x) => `<tr><td>${esc(pa.nombre)}</td><td>${esc(x.marca ? MARCAS[x.marca].corto : `Total ${pa.nombre}`)}</td><td>${numero(x.fbHechas)}</td><td>${numero(x.fbProgramadas)}</td><td>${numero(x.igHechas)}</td><td>${x.igProgramadas === null ? esc(TEXTO_IG_SIN_PROGRAMADAS) : numero(x.igProgramadas)}</td><td>${numero(x.hechas)}</td><td>${esc(leadsDeMarcaPdf(leads, x.marca, pa.pais, !x.marca, pa.marcas.map((y) => y.marca)))}</td></tr>`)))}
    <p class="nota">Leads calificados: origen «PostIAlo Redes Sociales» (Prospekt), por país y mes. En El Salvador, la marca sale de la publicación estimada; si no se sabe, «sin marca».</p>
    ${htmlLeadsRedes({ leads, alcance: mc?.alcanceDiario ?? 0, mensajes: t.mensajes, gasto: unaMoneda?.gastado ?? 0, moneda: unaMoneda?.moneda ?? 'USD', filtros })}
    <p class="nota">Alcance = suma del alcance diario de las cuentas (una persona puede contarse más de una vez). Fechas en hora de Guatemala y El Salvador (UTC−6).</p>
    <p class="nota">¿Cumplimos lo programado? Caso: <b>${esc(CASO[caso] ?? caso)}</b>.${conPlan ? '' : ' Sin semáforo: no hay programadas para comparar.'}</p>
    ${tabla(['Marca', 'País', conPlan ? 'Salieron / programadas' : 'Publicadas', 'Cumplimiento', 'Alcance (suma diaria)', 'Interacciones', 'Tasa'],
      marcas.map((m) => {
        const s = resumenPublicaciones(base.filter((p) => p.marca === m))
        const pv = programadoVsPublicado(base, [m])[0]
        return `<tr><td>${esc(MARCAS[m].nombre)}</td><td>${esc(MARCAS[m].pais)}</td><td>${conPlan ? `${numero(pv.publicadas)} / ${numero(pv.programadas)}` : numero(s.publicadas)}</td><td>${conPlan ? esc(pct(s.cumplimiento)) : '—'}</td><td>${numero(alcMarca[m] ?? 0)}</td><td>${numero(s.interacciones)}</td><td>${esc(pct(s.tasa))}</td></tr>`
      }))}</section>`

  const lista = ordenarPublicaciones(filtrarRedes(items, filtros), 'fecha', 'asc')
  const publicaciones = `<section data-pdf-module="publicaciones"><h2>2. Publicaciones (${numero(lista.length)})</h2>
    ${tabla(['Fecha', 'Marca', 'Red', 'Publicación', 'Formato', 'Estado', 'Alcance', 'Interacciones', 'Tasa'],
      lista.map((p) => `<tr><td>${esc(`${p.fecha.slice(8, 10)}/${p.fecha.slice(5, 7)}`)}</td><td>${esc(MARCAS[p.marca]?.corto ?? p.marca)}</td><td>${esc(REDES[p.red] ?? p.red)}</td><td>${esc(p.titulo)}${p.fueraDePlan && conPlan && p.estado === 'publicada' ? ' <i>(fuera de lo programado)</i>' : ''}</td><td>${esc(FORMATOS[p.formato] ?? p.formato)}</td><td>${esc(ESTADOS[p.estado] ?? p.estado)}</td><td>${p.alcance ? numero(p.alcance) : '—'}</td><td>${p.interacciones ? numero(p.interacciones) : '—'}</td><td>${p.alcance ? esc(pct((p.interacciones / p.alcance) * 100)) : '—'}</td></tr>`))}</section>`

  const pauta = pautaPorCampana(anuncios)
  const estimador = estimadorLeadsPdf(detalle, leadsRedes, filtros.mes)
  // Montos sin partirse en dos líneas (US$ y el número juntos).
  const dn = (v, m) => esc(dinero(v, m)).replace(/ /g, '&nbsp;')
  const leadsCampana = (a) => (estimador.est ? estimador.de(String(a.id).split('-')[1], a.gastado) : null)
  const anunciosHtml = `<section data-pdf-module="anuncios"><h2>3. Anuncios (${numero(pauta.length)} campañas)</h2>
    ${tabla(['Campaña', 'Marca', 'Moneda', 'Gastado', 'Alcance', 'Clics', 'CPC', 'Mensajes', 'Costo por mensaje', 'Leads (estimado)', 'Costo por lead'],
      pauta.map((a) => { const n = leadsCampana(a); return `<tr><td>${esc(nombreCampana(a.campana))}</td><td>${esc(MARCAS[a.marca]?.corto ?? a.marca)}</td><td>${esc(a.moneda)}</td><td>${dn(a.gastado, a.moneda)}</td><td>${numero(a.alcance)}</td><td>${numero(a.clics)}</td><td>${dn(a.clics ? a.gastado / a.clics : null, a.moneda)}</td><td>${numero(a.mensajes)}</td><td>${dn(a.costoMensaje, a.moneda)}</td><td>${esc(estimador.est ? textoLeadsEst(n) : '—')}</td><td>${n > 0 ? dn(a.gastado / n, a.moneda) : '—'}</td></tr>` }))}
    <p class="nota"><span class="x-est">estimado</span> ${esc(REGLA_LEADS_CAMPANA)}${estimador.est?.sinCampanaConectada.GT && (!filtros.pais || filtros.pais === 'GT') ? ` Guatemala: ${numero(estimador.est.sinCampanaConectada.GT)} leads sin campaña conectada.` : ''}</p>
    ${htmlTarjetasAnuncios({ detalle, filtros, publicaciones: datos.publicaciones })}
    <p class="nota">Tasas calculadas en el dashboard desde los números de Meta: CPC = gasto ÷ clics; costo por mensaje = gasto ÷ mensajes. Cada cuenta publicitaria usa su moneda y no se suman monedas distintas. El gasto se reparte por la página de cada anuncio.${tRec.campanas ? ` Reclutamiento (aparte, no incluido): ${esc(tRec.porMoneda.map((m) => dinero(m.gastado, m.moneda)).join(' · '))} en ${numero(tRec.campanas)} campañas.` : ''}</p></section>`

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><base href="${esc(`${origen}/`)}"><title>Reporte de Redes sociales - RED Intelfon</title>
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
  .ejemplo { margin: 0 0 10px; padding: 8px 12px; background: #fff4d6; border: 1px dashed #d9a520; border-radius: 6px; color: #7a5a00; font-size: 11px; font-weight: 700; }
  .module-summary { margin: 10px 0 12px; padding: 8px 12px; background: #e8eaf0; border-left: 4px solid #c9364b; border-radius: 4px; color: #8b909e; font-size: 10px; }
  .nota { font-size: 10px; color: #5b6170; margin: 6px 0 10px; }
  h2 { font-size: 13px; text-transform: uppercase; margin: 16px 0 8px; color: #141821; }
  .period-kpis { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 10px; margin-bottom: 10px; }
  .period-kpi { min-width: 0; border: 1px solid #e8eaf0; border-top: 6px solid #141821; border-radius: 8px; padding: 11px 10px; background: #fff; }
  .period-kpi .lbl { font-size: 9px; font-weight: 800; letter-spacing: .1em; color: #8b909e; text-transform: uppercase; }
  .period-kpi .num { font-size: 16px; font-weight: 900; margin-top: 8px; overflow-wrap: anywhere; }
  .period-kpi .sub { font-size: 9px; color: #8b909e; margin-top: 6px; line-height: 1.35; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #141821; color: #fff; text-align: left; padding: 8px 10px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
  td { padding: 7px 10px; border-bottom: 1px solid #e8eaf0; vertical-align: top; overflow-wrap: break-word; }
  tr:nth-child(even) td { background: #f3f4f7; }
  thead { display: table-header-group; } tr { page-break-inside: avoid; }
${CSS_PDF_EXTRA}
</style></head>
<body><div class="report-shell">
  <div class="header"><div class="head-left">
    <img class="logo" src="${esc(`${origen}/assets/img/logo-intelfon.png`)}" alt="RED Intelfon" />
    <div><div class="eyebrow">RED INTELFON · MARKETING</div><div class="title">Reporte de Redes sociales · Canales de marketing</div>
      <div class="filtro">Filtros aplicados: ${esc(chips.map((c) => `${c.label}: ${c.value}`).join(' | '))}</div></div>
  </div><div class="head-right"><div>Fecha de emisión: <b>${esc(fechaEmision)}</b></div><div class="pill">${conPlan ? `Cumplimiento: ${esc(pct(r.cumplimiento))}` : `Publicadas: ${esc(numero(r.publicadas))}`}</div></div></div>
  ${datos.fuente === 'ejemplo' ? '<div class="ejemplo">DATOS DE EJEMPLO · todavía no está conectado a Meta: las cifras son inventadas.</div>' : ''}
  <div class="module-summary"><b>Módulos incluidos:</b> ${esc(modulos)}</div>
  ${seleccion.includes('resumen') ? resumen : ''}
  ${seleccion.includes('publicaciones') ? publicaciones : ''}
  ${seleccion.includes('anuncios') ? anunciosHtml : ''}
</div></body></html>`
}
