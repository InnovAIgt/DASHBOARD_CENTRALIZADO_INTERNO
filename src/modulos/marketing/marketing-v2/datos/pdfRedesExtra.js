// Canales de marketing · Redes sociales · PDF: las piezas nuevas (25/11/2026) que usa pdfRedes.js:
//   · Resumen: bloque «Leads de Redes» (embudo y tarjetas) y la columna de leads de la tabla por país y marca.
//   · Anuncios: leads estimados por campaña y las 3 tarjetas compactas (presupuestos, plataformas y segmentaciones)
//     con su lectura.
// SIN DATOS DE CLIENTES: solo conteos y montos (nunca nombres, teléfonos ni correos). Mismo mes y filtros que la pantalla.
import { numero, pct } from './calculos.js'
import { chipsCompactos, lecturaSegmentaciones, listaPlataformasCompacta } from './anunciosCompacto.js'
import { filtrarDetalle, MIN_MENSAJES, nombreConTexto, plataformasDe, presupuestosDe, segmentosDe } from './anunciosFase2.js'
import { campanasConDias, leadsDeFila, leadsPorCampana, REGLA_LEADS_CAMPANA, textoLeadsEst } from './leadsCampana.js'
import { lecturaPlataformas, resumenPlataformas } from './plataformasDetalle.js'
import { estadoMeta, lecturaPresupuestos, resumenPresupuestos } from './presupuestoDetalle.js'
import { dinero, MARCAS } from './redes.js'
import { costoPorLead, leadsDelMes, leadsPorMarca, resumenLeadsRedes, TEXTO_CERRADOS } from './redesLeads.js'
import { META_COSTO_MENSAJE } from './redesVista.js'

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const PAIS_DE = Object.fromEntries(Object.entries(MARCAS).map(([k, v]) => [k, v.pais]))
const pildora = (costo, mensajes, pocos, meta, d) => (!mensajes ? '—' : pocos ? '<span class="x-pocos">pocos datos</span>'
  : `<span class="x-pild ${meta ? (Math.round(costo * 100) / 100 <= meta ? 'x-ok' : 'x-am') : ''}">${esc(d(costo))}</span>`)

/** Estilos de las piezas nuevas (se agregan al <style> del reporte). Bloques que no se parten entre páginas. */
export const CSS_PDF_EXTRA = `
  .x-bloque { margin: 10px 0; padding: 10px 12px; background: #fff; border: 1px solid #e8eaf0; border-left: 4px solid var(--c, #141821); border-radius: 8px; page-break-inside: avoid; break-inside: avoid; }
  .x-bloque h3 { margin: 0 0 2px; font-size: 12px; color: #141821; }
  .x-bloque .x-sub { margin: 0 0 8px; font-size: 9.5px; color: #8b909e; }
  .x-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .x-fila { display: grid; grid-template-columns: 150px minmax(0, 1fr) 70px; gap: 8px; align-items: center; margin: 4px 0; font-size: 10.5px; }
  .x-fila small { display: block; font-size: 8.5px; color: #8b909e; }
  .x-barra { height: 8px; background: #eef0f4; border-radius: 99px; overflow: hidden; }
  .x-barra i { display: block; height: 100%; border-radius: 99px; }
  .x-num { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
  .x-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .x-kpi { padding: 8px 9px; border: 1px solid #e8eaf0; border-top: 4px solid var(--c, #141821); border-radius: 7px; }
  .x-kpi .lbl { font-size: 8px; font-weight: 800; letter-spacing: .08em; color: #8b909e; text-transform: uppercase; }
  .x-kpi .num { margin-top: 5px; font-size: 15px; font-weight: 900; }
  .x-kpi .sub { margin-top: 4px; font-size: 8.5px; color: #8b909e; }
  .x-pild { display: inline-block; padding: 1px 7px; border-radius: 99px; background: #eef0f4; font-weight: 700; white-space: nowrap; }
  .x-ok { background: #dff5ea; color: #13734a; } .x-am { background: #fbefd2; color: #8a6300; }
  .x-pocos { display: inline-block; padding: 0 6px; border: 1px dashed #a7adbb; border-radius: 99px; font-size: 8.5px; color: #5b6170; white-space: nowrap; }
  .x-lectura { margin: 8px 0 0; padding: 6px 9px; background: #f3f6fb; border-left: 3px solid #4f8fd8; border-radius: 5px; font-size: 10px; color: #3a4150; }
  .x-chips span { display: inline-block; margin: 2px 3px 0 0; padding: 0 6px; background: #eef0f4; border-radius: 99px; font-size: 8.5px; color: #5b6170; }
  .x-est { display: inline-block; padding: 0 5px; background: #fbe3ef; color: #a3346f; border-radius: 99px; font-size: 7.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
  .x-tabla td.n, .x-tabla th.n { text-align: right; font-variant-numeric: tabular-nums; }
`

/** Leads de Redes del mes con los filtros (solo conteos). listos = Prospekt respondió. */
export function leadsDelReporte(leadsRedes, filtros) {
  const listos = leadsRedes?.fuente === 'prospekt'
  return { listos, delMes: listos ? leadsDelMes(leadsRedes.leads, filtros.mes, { pais: filtros.pais, marca: filtros.marca }) : [], noCalificados: leadsRedes?.noCalificados ?? null }
}

/** Celda de leads de una fila de la tabla por país y marca (igual que la pantalla: GT incluye los «sin marca» de GT). */
export function leadsDeMarcaPdf(leads, marca, pais, esTotal = false, marcasDelPais = []) {
  if (!leads.listos) return 'por conectar'
  const pm = leadsPorMarca(leads.delMes)
  if (esTotal) return `${numero(marcasDelPais.reduce((n, m) => n + (pm[m] ?? 0), 0) + (pm.sinMarca[pais] ?? 0))}${pm.sinMarca[pais] ? ` (${numero(pm.sinMarca[pais])} sin marca)` : ''}`
  return numero(marca === 'gt' ? pm.gt + (pm.sinMarca.GT ?? 0) : pm[marca] ?? 0)
}

/** Bloque «Leads de Redes»: del post al cliente (embudo, escala logarítmica) y las tarjetas del mes. */
export function htmlLeadsRedes({ leads, alcance, mensajes, anuncios = [], moneda, filtros }) {
  if (!leads.listos) return '<div class="x-bloque" style="--c:#d6589b"><h3>Leads de Redes</h3><p class="x-sub">Leads de Prospekt por conectar: no se incluyen en este reporte.</p></div>'
  const r = resumenLeadsRedes(leads.delMes)
  const pasos = [['Alcance', 'vieron el contenido · Meta', alcance ?? 0, '#2fb8c4'], ['Mensajes', 'escribieron por la pauta · Meta', mensajes, '#9085e9'],
    ['Leads calificados', 'origen Redes · Prospekt', r.total, '#d6589b'], ['En proceso', 'etapas 2 a 5 · Prospekt', r.enProceso, '#d9a520'],
    [TEXTO_CERRADOS, 'etapa 6 · Prospekt', r.cerrados, '#18935f']]
  const tope = Math.log10(Math.max(...pasos.map((p) => p[2] || 0), 1) + 1)
  // Costo por lead por país (SV y GT en US$): inversión de cada país ÷ sus leads.
  const cpl = costoPorLead({ anuncios, leads: leads.delMes })
  const porPais = ['GT', 'SV'].filter((p) => !filtros.pais || filtros.pais === p)
    .map((p) => `${p} ${cpl.porPais[p].costo === null ? '—' : dinero(cpl.porPais[p].costo, moneda)}`).join(' · ')
  const kpi = (lbl, num, sub, c) => `<div class="x-kpi" style="--c:${c}"><div class="lbl">${esc(lbl)}</div><div class="num">${esc(num)}</div><div class="sub">${esc(sub)}</div></div>`
  return `<div class="x-bloque" style="--c:#d6589b"><h3>Leads de Redes</h3><p class="x-sub">Solo origen «PostIAlo Redes Sociales», sin pruebas (LDTEST). Solo conteos.</p>
    <div class="x-duo"><div>${pasos.map(([k, sub, v, c]) => `<div class="x-fila"><span><b>${esc(k)}</b><small>${esc(sub)}</small></span>
      <span class="x-barra"><i style="width:${v > 0 ? Math.max(2, (Math.log10(v + 1) / tope) * 100) : 0}%;background:${c}"></i></span><span class="x-num">${numero(v)}</span></div>`).join('')}
      <p class="nota">Barras en escala logarítmica: el alcance es mucho mayor que el resto.</p></div>
    <div class="x-kpis">${kpi('Calificados', numero(r.total), `GT ${numero(r.porPais.GT)} · SV ${numero(r.porPais.SV)}`, '#d6589b')}
      ${kpi(TEXTO_CERRADOS, numero(r.cerrados), r.total ? `${pct((r.cerrados / r.total) * 100)} de los leads` : '—', '#18935f')}
      ${kpi('Costo por lead', cpl.costo === null ? 'Sin leads' : dinero(cpl.costo, moneda), `${porPais} · inversión de cada país ÷ sus leads`, '#d9a520')}
      ${kpi('No calificados', leads.noCalificados ? numero(leads.noCalificados.total) : '—', 'total de Prospekt · no dice el canal', '#5b6b84')}</div></div></div>`
}

/**
 * Leads estimados por campaña para la tabla de Anuncios del PDF: (campanaId, gastoFila) → número o null.
 * Usa TODAS las campañas del detalle (sin filtros) y todos los leads del mes.
 */
export function estimadorLeadsPdf(detalle, leadsRedes, mes) {
  if (leadsRedes?.fuente !== 'prospekt' || !detalle || detalle.errores?.leadsCampana) return { est: null, de: () => null }
  const pres = detalle.presupuestos ?? []
  const est = leadsPorCampana(campanasConDias(pres), leadsDelMes(leadsRedes.leads, mes, {}))
  const gasto = (id) => pres.filter((x) => x.campanaId === String(id)).reduce((n, x) => n + x.gastado, 0)
  return { est, de: (id, g) => leadsDeFila(est, id, g, gasto(id)) }
}
export { REGLA_LEADS_CAMPANA, textoLeadsEst }

/** Las 3 tarjetas compactas de Anuncios (detalle del mes, con los filtros) con su lectura. */
export function htmlTarjetasAnuncios({ detalle, filtros, publicaciones = [] }) {
  if (!detalle) return '<p class="nota">El detalle de Anuncios (presupuestos, plataformas y segmentaciones) no se pudo leer de Meta para este reporte.</p>'
  const dt = filtrarDetalle(detalle, filtros, PAIS_DE)
  const moneda = dt?.moneda ?? 'USD'
  const d = (v) => dinero(v, moneda)
  const meta = META_COSTO_MENSAJE[moneda] ?? null
  const textoDe = (a) => a.texto || (a.publicacion ? publicaciones.find((p) => p.id === `fb-${a.publicacion}`)?.titulo : null) || null
  const nombre = (x) => nombreConTexto({ texto: textoDe(x), campana: x.campana, objetivo: x.campanaInfo?.objetivo })

  // Presupuestos más efectivos
  const pres = presupuestosDe(dt?.presupuestos, moneda)
  const r = resumenPresupuestos(pres)
  const buenas = pres.filter((p) => !p.pocos && p.costo !== null).sort((a, b) => a.costo - b.costo)
  const presHtml = `<div class="x-bloque" style="--c:#d9a520"><h3>Presupuestos más efectivos</h3>
    <p class="x-sub">Costo promedio del mes: <b>${esc(d(r.promedio))}</b> por mensaje · invertido ${esc(d(r.total))}${meta ? ` · meta ${esc(d(meta))} (por confirmar)` : ''}</p>
    <table class="x-tabla"><thead><tr><th>Campaña</th><th class="n">Invertido → mensajes</th><th class="n">Costo c/u</th><th class="n">Frente a la meta</th></tr></thead><tbody>
    ${buenas.map((p) => `<tr><td><b>${esc(nombre(p).titulo)}</b><br><small>${esc(nombre(p).sub ?? '')}</small></td><td class="n">${esc(d(p.gastado))} → ${numero(p.mensajes)}</td>
      <td class="n">${pildora(p.costo, p.mensajes, p.pocos, meta, d)}</td><td class="n">${esc(estadoMeta(p.costo, meta, p.pocos)?.texto ?? '—')}</td></tr>`).join('') || `<tr><td colspan="4">Ninguna campaña con ${MIN_MENSAJES}+ mensajes.</td></tr>`}
    </tbody></table>
    ${r.pocos.cantidad ? `<p class="nota">${numero(r.pocos.cantidad)} ${r.pocos.cantidad === 1 ? 'campaña' : 'campañas'} con pocos datos (menos de ${MIN_MENSAJES} mensajes) · ${esc(d(r.pocos.gastado))} invertidos.</p>` : ''}
    ${buenas.length ? `<p class="x-lectura"><b>Lectura:</b> ${esc(lecturaPresupuestos(pres, (p) => nombre(p).titulo))}</p>` : ''}</div>`

  // ¿Dónde se vieron y escribieron?
  const plats = plataformasDe(dt?.ubicaciones)
  const { filas } = resumenPlataformas(plats)
  const lista = listaPlataformasCompacta(filas)
  const lecturaP = lecturaPlataformas(plats, d)
  const platHtml = `<div class="x-bloque" style="--c:#4a90ea"><h3>¿Dónde se vieron y escribieron?</h3><p class="x-sub">Por plataforma · mensajes y costo por mensaje</p>
    <table class="x-tabla"><thead><tr><th>Plataforma</th><th class="n">Impresiones</th><th class="n">CTR</th><th class="n">Mensajes</th><th class="n">% de los mensajes</th><th class="n">Costo c/u</th></tr></thead><tbody>
    ${lista.map((p) => `<tr><td><b>${esc(p.nombre)}</b></td><td class="n">${numero(p.impresiones)}</td><td class="n">${p.impresiones ? esc(pct((p.clics * 100) / p.impresiones)) : '—'}</td>
      <td class="n">${numero(p.mensajes)}</td><td class="n">${Math.round(p.pctMensajes)} %</td><td class="n">${pildora(p.costo, p.mensajes, p.pocos, meta, d)}</td></tr>`).join('') || '<tr><td colspan="6">Sin impresiones en este mes.</td></tr>'}
    </tbody></table>${lecturaP ? `<p class="x-lectura"><b>Lectura:</b> ${esc(lecturaP)}</p>` : ''}</div>`

  // Segmentaciones ganadoras
  const segs = segmentosDe(dt?.segmentos, moneda)
  const ganadoras = segs.filter((s) => !s.pocos)
  const pocas = segs.length - ganadoras.length
  const lecturaS = lecturaSegmentaciones(segs, (s) => nombre(s).titulo, d)
  const segHtml = `<div class="x-bloque" style="--c:#3fcf8e"><h3>Segmentaciones ganadoras</h3><p class="x-sub">Públicos (conjuntos de anuncios) con ${MIN_MENSAJES}+ mensajes · por costo por mensaje</p>
    <table class="x-tabla"><thead><tr><th>#</th><th>Público</th><th class="n">Mensajes</th><th class="n">Costo c/u</th></tr></thead><tbody>
    ${ganadoras.map((s, i) => `<tr><td>${i + 1}</td><td><b>${esc(nombre(s).titulo)}</b><div class="x-chips">${chipsCompactos(s, MARCAS[s.marca]?.corto).map((c) => `<span>${esc(c)}</span>`).join('')}</div></td>
      <td class="n">${numero(s.mensajes)}</td><td class="n">${pildora(s.costo, s.mensajes, s.pocos, meta, d)}</td></tr>`).join('') || '<tr><td colspan="4">Aún no hay suficientes datos este mes.</td></tr>'}
    </tbody></table>${pocas ? `<p class="nota">${numero(pocas)} ${pocas === 1 ? 'público' : 'públicos'} con pocos datos (menos de ${MIN_MENSAJES} mensajes).</p>` : ''}
    ${lecturaS ? `<p class="x-lectura"><b>Lectura:</b> ${esc(lecturaS)}</p>` : ''}</div>`

  return presHtml + platHtml + segHtml
}
