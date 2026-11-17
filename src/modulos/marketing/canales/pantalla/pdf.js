// Marketing por canales · reporte PDF de Mailing (D35).
// Usa la herramienta COMPARTIDA del portal, sin modificarla (la misma de Activaciones, Facturación por
// línea y Flujo de ventas v2):
//   /assets/js/dashboard-pdf.js       → window.DashboardPdf.openModulePicker (ventana "Exportar reporte")
//   /assets/js/dashboard-pdf-logo.js  → logo embebido
//   /assets/css/dashboard-pdf.css     → estilos de la ventana y del botón PDF
// El reporte se arma SOLO con la respuesta de /api/marketing/mailing (totales). La lista por persona
// (correos de clientes) NO es un módulo y nunca entra; además, si el reporte trajera algo con forma de
// correo, se bloquea.
import {
  DEFINICIONES_EXTRA, ESTADO_NIVEL, ESTADO_RIESGO, ETIQUETAS, MUESTRA, NIVELES, NOTA_REFERENCIA, REFERENCIAS, UMBRALES, VISTAS,
  asuntoDe, bloque, campanasDelMes, campanasIncluidas, evaluar, formatoFechaEnvio, formatoLectura, formatoMes, formatoNumero,
  formatoPct, nivelMuestra, ordenarRanking, sobreBase, sobreEnviados, textoRangos, textosFiltros, tonoRiesgo, ultimoMes,
} from './datos.js'

const RECURSOS = [
  { id: 'mkt-pdf-css', tipo: 'link', url: '/assets/css/dashboard-pdf.css' },
  { id: 'mkt-pdf-logo', tipo: 'script', url: '/assets/js/dashboard-pdf-logo.js' },
  { id: 'mkt-pdf-js', tipo: 'script', url: '/assets/js/dashboard-pdf.js' },
]

/** Carga la herramienta compartida (una vez). Si otra pantalla ya la cargó, la reutiliza. */
export function cargarHerramientaPdf() {
  if (window.DashboardPdf?.openModulePicker && document.querySelector('link[href^="/assets/css/dashboard-pdf.css"]')) return Promise.resolve(window.DashboardPdf)
  const espera = RECURSOS.map((r) => new Promise((resolve, reject) => {
    if (r.tipo === 'script' && r.id === 'mkt-pdf-js' && window.DashboardPdf?.openModulePicker) return resolve()
    if (r.tipo === 'link' && document.querySelector('link[href^="/assets/css/dashboard-pdf.css"]')) return resolve()
    const existente = document.getElementById(r.id)
    if (existente) {
      if (r.tipo === 'script' && !window.DashboardPdf) existente.addEventListener('load', resolve, { once: true })
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

/** Los 4 módulos del PDF de Mailing. El detalle por persona NO es un módulo. */
export const MODULOS_PDF = [
  { id: 'resumen', name: 'Resumen', description: 'Campañas del mes, métricas de interacción, salud del envío y destacados.' },
  { id: 'graficas', name: 'Gráficas', description: 'Aperturas por cargo, evolución por mes y embudo de conversión (tablas con barras).' },
  { id: 'ranking', name: 'Ranking de campañas', description: 'Todas las campañas con sus porcentajes, rebote y muestra.' },
  { id: 'calculo', name: '¿Cómo se calcula?', description: 'Definición de cada número y transparencia de datos (archivos, fuente y exclusiones).' },
]

/** Chips de la ventana del PDF: los filtros activos al momento de exportar. */
export function chipsFiltros({ vista, filtros, disponibles }) {
  const t = textosFiltros({ vista, filtros, disponibles })
  return [
    { label: 'Cifras', value: t.cifras },
    { label: 'Período', value: t.periodo },
    { label: 'Cargo', value: t.cargo ?? 'Todos' },
    { label: 'Campañas', value: t.campanas ?? 'Todas', tooltip: t.campanasDetalle ?? undefined },
  ]
}

export function nombreArchivoPdf(ahora = new Date()) {
  const d = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`
  return `Campanas_de_correo_RED_${d}.pdf`
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const CORREO = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/

const kpi = (estado, etiqueta, valor, sub) => `<div class="mk-kpi st-${estado}"><div class="lbl">${esc(etiqueta)}</div><div class="num is-${estado}">${esc(valor)}</div><div class="sub">${sub}</div></div>`
const pastilla = (estado, texto) => `<span class="pill-e b-${estado}">${esc(texto)}</span>`
const barra = (proporcion, estado = 'info') => `<div class="barra"><div class="relleno f-${estado}" style="width:${Math.max(0, Math.min(100, proporcion * 100)).toFixed(1)}%"></div></div>`
const pctPocos = (p) => (p == null ? 'pocos datos' : formatoPct(p))

// ------------------------------------------------------------------ módulos

function seccionResumen({ datos, vista }) {
  const def = datos.reglas.definiciones
  const m = bloque(datos.totales, vista)
  const mes = ultimoMes(datos)
  const delMes = mes ? campanasDelMes(datos, mes.mes) : []
  const anillos = [
    ['pctEntrega', 'Entrega', 'entregados', 'enviados', 'enviados'],
    ['pctApertura', 'Apertura', 'aperturasReales', 'entregados', 'entregados'],
    ['pctClic', 'CTR', 'personasConClic', 'entregados', 'entregados'],
    ['pctCtor', 'CTOR', 'personasConClic', 'aperturasReales', 'aperturas'],
  ].map(([campo, nombre, parte, total, de]) => {
    const nivel = evaluar(campo, m[campo])
    return kpi(ESTADO_NIVEL[nivel], nombre, pctPocos(m[campo]),
      `${formatoNumero(m[parte])} de ${formatoNumero(m[total])} ${de}<br>${pastilla(ESTADO_NIVEL[nivel], NIVELES[nivel].texto)}<br><span class="rangos">${esc(textoRangos(campo).join(' · '))}</span>`)
  }).join('')

  const riesgo = (campo, etiqueta, base) => {
    const tono = tonoRiesgo(m, campo)
    return kpi(ESTADO_RIESGO[tono], etiqueta, formatoNumero(m[campo]), `${formatoPct(sobreBase(m, campo))} ${base}`)
  }
  const nivelEntrega = evaluar('pctEntrega', m.pctEntrega)
  const salud = [
    kpi(ESTADO_NIVEL[nivelEntrega], 'Entregados', formatoNumero(m.entregados), `${formatoPct(m.pctEntrega)} del envío · ${esc(NIVELES[nivelEntrega].texto)}`),
    riesgo('rebotesPermanentes', 'Rebote permanente', 'del envío'),
    riesgo('rebotesTemporales', 'Rebote temporal', 'del envío'),
    kpi('info', 'Apertura automática', formatoNumero(m.soloAperturaAutomatica), 'iPhone · no cuenta como apertura'),
    riesgo('bajas', 'Bajas', 'de los entregados'),
    riesgo('quejas', 'Quejas (spam)', 'de los entregados'),
  ].join('')

  const d = datos.destacados?.[vista] ?? {}
  const mc = d.mejorCampana, cg = d.mejorCargo, pe = d.peorEntrega, pa = d.mejorPais
  const destacados = [
    kpi(mc ? ESTADO_NIVEL[evaluar('pctApertura', mc.pctApertura)] : 'na', 'Mejor campaña', mc ? `#${mc.id} · ${mc.cargo}` : 'Pocos datos',
      mc ? `${formatoPct(mc.pctApertura)} de apertura · ${formatoNumero(mc.entregados)} entregados` : 'Ninguna campaña con 5 o más entregados'),
    kpi(cg ? ESTADO_NIVEL[evaluar('pctApertura', cg.pctApertura)] : 'na', 'Mejor cargo', cg ? cg.cargo : 'Pocos datos', cg ? `${formatoPct(cg.pctApertura)} de apertura` : '—'),
    kpi(pe ? ESTADO_NIVEL[evaluar('pctEntrega', pe.pctEntrega)] : 'na', 'Peor entrega', pe ? `#${pe.id} · ${pe.cargo}` : 'Pocos datos', pe ? `${formatoPct(pe.pctEntrega)} entregado` : '—'),
    kpi(pa && !pa.pocosDatos ? 'ok' : 'na', 'Mejor país', pa && !pa.pocosDatos ? pa.pais : 'Pocos datos',
      pa == null ? '—' : pa.pocosDatos ? `${formatoPct(pa.pctDesconocido, 0)} de los correos no indican país` : `${formatoPct(pa.pctApertura)} de apertura`),
  ].join('')

  return `<section data-pdf-module="resumen">
    <h2>Resumen del mes<span class="nota-h2">${esc(VISTAS[vista].label)} · último mes con envíos</span></h2>
    <div class="mk-kpis k1">${mes ? kpi('info', 'Campañas del mes', formatoNumero(bloque(mes, vista).campanas),
      `${esc(formatoMes(mes.mes, true))} · ${esc(delMes.map((c) => `#${c.id} ${formatoFechaEnvio(c.fechaEnvio).slice(0, 5)}`).join(' · '))}`) : kpi('na', 'Campañas del mes', '—', 'Sin campañas')}</div>
    <h2>Métricas de interacción<span class="nota-h2">porcentajes sobre el total entregado</span></h2>
    <div class="mk-kpis k4">${anillos}</div>
    <p class="nota">${esc(NOTA_REFERENCIA)}${m.notaPctApertura ? ` La apertura: ${esc(m.notaPctApertura.charAt(0).toLowerCase() + m.notaPctApertura.slice(1))}.` : ''} Los clics pueden incluir clics automáticos de antivirus.</p>
  </section>
  <section data-pdf-module="resumen">
    <h2>Salud del envío<span class="nota-h2">solo entregados + rebotes suman el 100 % del envío (${formatoNumero(m.entregados)} + ${formatoNumero(m.rebotesPermanentes)} + ${formatoNumero(m.rebotesTemporales)}${m.sinEstado ? ` + ${formatoNumero(m.sinEstado)} sin estado` : ''} = ${formatoNumero(m.enviados)}); apertura automática, bajas y quejas no se suman</span></h2>
    <div class="mk-kpis k6">${salud}</div>
    <h2>Destacados</h2>
    <div class="mk-kpis k4">${destacados}</div>
    <p class="nota">${esc(def.destacados ?? '')}</p>
  </section>`
}

function seccionGraficas({ datos, vista }) {
  const m = bloque(datos.totales, vista)
  const cargos = (datos.porCargo ?? []).map((g) => ({ cargo: g.cargo, m: bloque(g, vista) }))
    .sort((a, b) => (b.m.pctApertura ?? -1) - (a.m.pctApertura ?? -1))
  const tope = Math.max(REFERENCIAS.pctApertura.excelente, Math.ceil(Math.max(0, ...cargos.map((c) => c.m.pctApertura ?? 0)) * 10) / 10)
  const filasCargo = cargos.map(({ cargo, m: x }) => {
    const nivel = evaluar('pctApertura', x.pctApertura)
    return `<tr><td><b>${esc(cargo)}</b></td><td class="col-barra">${barra((x.pctApertura ?? 0) / tope, ESTADO_NIVEL[nivel])}</td>
      <td class="c"><b>${pctPocos(x.pctApertura)}</b></td><td class="c">${pastilla(ESTADO_NIVEL[nivel], NIVELES[nivel].texto)}</td>
      <td class="c">${formatoNumero(x.aperturasReales)} de ${formatoNumero(x.entregados)}</td><td class="c">${formatoPct(x.pctClic)}</td><td class="c">${formatoPct(x.pctCtor)}</td></tr>`
  }).join('')
  const embudo = [['Enviados', m.enviados], ['Entregados', m.entregados, formatoPct(m.pctEntrega)], ['Aperturas reales', m.aperturasReales], ['Personas con clic', m.personasConClic]]
    .map(([n, v, extra]) => `<tr><td><b>${esc(n)}</b></td><td class="col-barra">${barra(m.enviados ? v / m.enviados : 0, 'ok')}</td><td class="c"><b>${formatoNumero(v)}</b>${extra ? ` · ${extra}` : ''}</td></tr>`).join('')

  const meses = (datos.meses ?? []).map((x) => ({ mes: x.mes, d: bloque(x, vista) }))
  const maxEnv = Math.max(1, ...meses.map((x) => x.d.enviados))
  const filasMes = meses.map(({ mes, d }) => `<tr><td><b>${esc(formatoMes(mes, true))}</b></td><td class="c">${formatoNumero(d.campanas)}</td>
    <td class="col-barra">${barra(d.enviados / maxEnv, 'na')}<span class="bar-sub">${formatoNumero(d.enviados)} enviados</span></td>
    <td class="c">${formatoNumero(d.entregados)}</td><td class="c">${formatoNumero(d.aperturasReales)}</td><td class="c">${formatoNumero(d.personasConClic)}</td>
    ${['pctEntrega', 'pctApertura', 'pctClic', 'pctCtor'].map((c) => `<td class="c">${pastilla(ESTADO_NIVEL[evaluar(c, d[c])], pctPocos(d[c]))}</td>`).join('')}</tr>`).join('')

  return `<section data-pdf-module="graficas">
    <h2>Aperturas por cargo<span class="nota-h2">% de apertura real · cargo tomado del nombre de la campaña · escala 0–${formatoPct(tope, 0)} · referencia: 20 % promedio, 30 % excelente</span></h2>
    <table><thead><tr><th>Cargo</th><th>% de apertura</th><th class="c">%</th><th class="c">Nivel</th><th class="c">Aperturas de entregados</th><th class="c">CTR</th><th class="c">CTOR</th></tr></thead><tbody>${filasCargo || '<tr><td colspan="7">Sin campañas.</td></tr>'}</tbody></table>
    <h2>Embudo de conversión</h2>
    <table><thead><tr><th>Paso</th><th>Proporción de lo enviado</th><th class="c">Cantidad</th></tr></thead><tbody>${embudo}</tbody></table>
  </section>
  <section data-pdf-module="graficas">
    <h2>Evolución por mes<span class="nota-h2">volumen del envío y resultado de cada mes${meses.length < 2 ? ' · con un solo mes todavía no hay tendencia' : ''}</span></h2>
    <table><thead><tr><th>Mes</th><th class="c">Campañas</th><th>Enviados</th><th class="c">Entregados</th><th class="c">Aperturas</th><th class="c">Clics</th><th class="c">Entrega</th><th class="c">Apertura</th><th class="c">CTR</th><th class="c">CTOR</th></tr></thead><tbody>${filasMes || '<tr><td colspan="10">Sin meses.</td></tr>'}</tbody></table>
  </section>`
}

function seccionRanking({ datos, vista }) {
  const filas = ordenarRanking(campanasIncluidas(datos), vista, 'pctApertura', 'mejores').map((c, i) => {
    const m = bloque(c, vista)
    const muestra = nivelMuestra(m.entregados)
    const tono = tonoRiesgo(m, 'rebotesPermanentes')
    const pct = (campo) => (m[campo] == null ? pastilla('na', 'pocos datos') : pastilla(ESTADO_NIVEL[evaluar(campo, m[campo])], formatoPct(m[campo])))
    return `<tr><td class="c">${i + 1}</td><td><b>#${esc(c.id)} · ${esc(c.nombre)}</b></td><td><i>${esc(asuntoDe(c))}</i></td><td>${esc(c.cargo)}</td>
      <td class="c">${formatoFechaEnvio(c.fechaEnvio).slice(0, 5)}</td><td class="c">${formatoNumero(m.enviados)}</td><td class="c">${formatoNumero(m.entregados)}</td>
      <td class="c">${formatoNumero(m.aperturasReales)}</td><td class="c">${formatoNumero(m.personasConClic)}</td><td class="c">${pct('pctApertura')}</td><td class="c">${pct('pctClic')}</td>
      <td class="c">${pct('pctCtor')}</td><td class="c">${tono === 'pocos' ? pastilla('na', 'pocos datos') : pastilla(ESTADO_RIESGO[tono], formatoPct(sobreEnviados(m, 'rebotesPermanentes')))}</td>
      <td class="c">${pastilla(muestra.estado, muestra.texto)}</td></tr>`
  }).join('')
  return `<section data-pdf-module="ranking">
    <h2>Ranking de campañas<span class="nota-h2">${esc(VISTAS[vista].label)} · de mayor a menor % de apertura (las de pocos datos, al final) · Muestra: Alta ≥${MUESTRA.alta} entregados · Media ${MUESTRA.media}–${MUESTRA.alta - 1} · Baja &lt;${MUESTRA.media}</span></h2>
    <table><thead><tr><th class="c">#</th><th>Campaña</th><th>Asunto</th><th>Cargo</th><th class="c">Envío</th><th class="c">Envíos</th><th class="c">Entregados</th><th class="c">Aperturas</th><th class="c">Clics</th><th class="c">% Apertura</th><th class="c">% Clic</th><th class="c">CTOR</th><th class="c">Rebote perm.</th><th class="c">Muestra</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="14">Sin campañas.</td></tr>'}</tbody></table>
  </section>`
}

function seccionCalculo({ datos }) {
  const r = datos.reglas
  const filasDef = [
    ...Object.entries(r.definiciones).map(([k, texto]) => [ETIQUETAS[k] ?? k, texto]),
    ...DEFINICIONES_EXTRA(r),
  ].map(([n, t]) => `<tr><td><b>${esc(n)}</b></td><td>${esc(t)}</td></tr>`).join('')

  // Transparencia en UNA página: solo conteos y los archivos ignorados con su motivo.
  // El detalle completo (cada archivo, sus campañas y avisos) se queda en la pantalla.
  const { archivos, exclusiones, fuente } = datos
  const avisos = archivos.usados.reduce((s, u) => s + (u.avisos?.length ?? 0) + (u.filasDescartadas?.length ?? 0), 0)
  const filasIgnorados = archivos.ignorados.map((i) => `<tr><td>${esc(i.archivo)}</td><td>${esc(i.motivo)}</td></tr>`).join('')
  const internos = exclusiones.destinatariosInternos
  const pruebas = exclusiones.campanasPrueba

  return `<section data-pdf-module="calculo">
    <h2>¿Cómo se calcula cada número?</h2>
    <table><thead><tr><th>Número</th><th>Cómo se calcula</th></tr></thead><tbody>${filasDef}</tbody></table>
  </section>
  <section data-pdf-module="calculo">
    <h2>Transparencia de datos<span class="nota-h2">resumen · el detalle de cada archivo está en la pantalla, en "Transparencia de datos"</span></h2>
    <div class="mk-kpis k3">
      ${kpi('info', 'Fuente · última lectura', formatoLectura(fuente.cache?.leidoEn ?? datos.generado), `${esc(fuente.descripcion ?? '—')}${fuente.cache ? ` · se guarda ${fuente.cache.minutos} min` : ''}`)}
      ${kpi('ok', 'Archivos usados', formatoNumero(archivos.usados.length), `${formatoNumero(avisos)} aviso(s) en filas`)}
      ${kpi(archivos.ignorados.length ? 'warn' : 'na', 'Archivos ignorados', formatoNumero(archivos.ignorados.length), archivos.ignorados.length ? 'nombre y motivo en la tabla de abajo' : 'ninguno')}
    </div>
    <div class="mk-kpis k3" style="margin-top:8px">
      ${kpi('info', 'Correos analizados', formatoNumero(datos.totales.enviados), 'sin correos internos de RED')}
      ${kpi('na', 'Correos internos de RED', formatoNumero(internos.enviados), 'cuentan en "Total en Brevo", no en "Sin internos (oficial)"')}
      ${kpi('na', 'Campañas de prueba', formatoNumero(pruebas.cantidad), 'no cuentan en ningún total')}
    </div>
    ${archivos.ignorados.length ? `<h2>Archivos ignorados</h2>
    <table><thead><tr><th>Archivo</th><th>Motivo</th></tr></thead><tbody>${filasIgnorados}</tbody></table>` : ''}
    <p class="nota">${exclusiones.duplicadosDescartados ? `Correos repetidos descartados: ${formatoNumero(exclusiones.duplicadosDescartados)}. ` : ''}Este reporte contiene solo totales: nunca incluye la lista de personas ni correos.</p>
  </section>`
}

// ------------------------------------------------------------------ reporte

/**
 * HTML del reporte para la herramienta compartida. Lanza un error (y no se descarga nada) si:
 * no hay campañas elegidas, los datos se están actualizando, o el reporte trae algo con forma de correo.
 */
export function construirReporteMailing({ seleccion, datos, vista, filtros, disponibles, sinCampanas, cargando, origen = window.location.origin, ahora = new Date() }) {
  if (sinCampanas) throw new Error('No hay campañas elegidas: cambia los filtros antes de exportar.')
  if (cargando) throw new Error('Los datos se están actualizando: espera un momento y vuelve a intentar.')
  const nombres = Object.fromEntries(MODULOS_PDF.map((m) => [m.id, m.name]))
  const modulos = seleccion.map((id) => nombres[id]).filter(Boolean).join(' · ')
  const f = textosFiltros({ vista, filtros, disponibles })
  const m = bloque(datos.totales, vista)
  const fechaEmision = `${ahora.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })} a las ${ahora.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`
  const logo = new URL('/assets/img/logo-intelfon.png', origen).href
  const s = {
    resumen: seleccion.includes('resumen') ? seccionResumen({ datos, vista }) : '',
    graficas: seleccion.includes('graficas') ? seccionGraficas({ datos, vista }) : '',
    ranking: seleccion.includes('ranking') ? seccionRanking({ datos, vista }) : '',
    calculo: seleccion.includes('calculo') ? seccionCalculo({ datos }) : '',
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <base href="${esc(origen)}/">
  <title>Reporte de Campañas de correo - RED Intelfon</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; background: #fff; color: #242837; font-size: 12px; }
    .report-shell { width: 100%; margin: 0 auto; padding: 12px; overflow: hidden; }
    .header { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 4px solid #c43c50; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; background: #151821; color: #fff; }
    .head-left { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1; }
    .head-left > div { min-width: 0; }
    .logo { height: 54px; width: auto; max-width: 150px; object-fit: contain; }
    .eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .08em; color: #c43c50; text-transform: uppercase; }
    .title { font-size: 20px; font-weight: 800; color: #fff; margin: 2px 0; }
    .filtro { font-size: 11px; color: #cbd5e1; overflow-wrap: anywhere; }
    .head-right { flex: 0 0 200px; text-align: right; font-size: 11px; color: #cbd5e1; }
    .pill { display: inline-block; margin-top: 6px; background: #c43c50; color: #fff; font-weight: 800; padding: 6px 14px; border-radius: 8px; font-size: 12px; }
    .module-summary { margin: 10px 0 12px; padding: 8px 12px; background: #e8eaf0; border-left: 4px solid #c43c50; border-radius: 4px; color: #4b5565; font-size: 10px; }
    h2 { font-size: 13px; margin: 14px 0 8px; color: #151821; }
    .nota-h2 { display: block; margin-top: 2px; font-size: 9px; font-weight: 600; color: #7b8797; }
    .mk-kpis { display: grid; gap: 8px; }
    .mk-kpis.k1 { grid-template-columns: minmax(0, 1fr); } .mk-kpis.k3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .mk-kpis.k4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } .mk-kpis.k6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .mk-kpi { min-width: 0; border: 1px solid #e0e5ed; border-top: 4px solid #8b909e; border-radius: 7px; padding: 8px 10px; background: #fff; }
    .mk-kpi .lbl { font-size: 8px; font-weight: 800; letter-spacing: .1em; color: #697586; text-transform: uppercase; }
    .mk-kpi .num { font-size: 17px; font-weight: 800; margin-top: 5px; color: #202a3b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mk-kpi .sub { font-size: 8px; color: #7b8797; margin-top: 4px; line-height: 1.45; }
    .mk-kpi .rangos { font-size: 7px; color: #8b909e; }
    .st-ok { border-top-color: #2f8f76; } .st-info { border-top-color: #4f8fd8; } .st-warn { border-top-color: #c59600; } .st-bad { border-top-color: #c43c50; } .st-na { border-top-color: #8b909e; }
    .num.is-ok { color: #187c58; } .num.is-info { color: #2f6db5; } .num.is-warn { color: #9a7400; } .num.is-bad { color: #c42a50; } .num.is-na { color: #697586; }
    .pill-e { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 8px; font-weight: 800; white-space: nowrap; }
    .b-ok { background: #e5f4ec; color: #14744a; } .b-info { background: #e3eefb; color: #2f6db5; } .b-warn { background: #fff4df; color: #9a6a00; }
    .b-bad { background: #fde8ed; color: #c51f49; } .b-na { background: #eef0f4; color: #5b6476; }
    .nota { margin: 8px 0 0; font-size: 8px; color: #7b8797; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th { background: #1d273a; color: #fff; text-align: left; padding: 6px 7px; font-weight: 700; font-size: 8px; text-transform: uppercase; }
    td { padding: 5px 7px; border-bottom: 1px solid #e8ebf0; vertical-align: middle; }
    tr:nth-child(even) td { background: #f5f7fa; }
    .c { text-align: center; } th.c { text-align: center; }
    .col-barra { width: 30%; }
    .barra { height: 10px; border-radius: 5px; background: #e8ebf0; overflow: hidden; }
    .relleno { height: 10px; border-radius: 5px; }
    .f-ok { background: #2f8f76; } .f-info { background: #4f8fd8; } .f-warn { background: #c59600; } .f-bad { background: #c43c50; } .f-na { background: #8b909e; }
    .bar-sub { display: block; margin-top: 2px; font-size: 7px; color: #7b8797; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="report-shell">
  <div class="header"><div class="head-left">
    <img class="logo" id="logoImg" src="${esc(logo)}" alt="RED Intelfon" />
    <div><div class="eyebrow">RED INTELFON · MARKETING · MAILING</div>
      <div class="title">Reporte de Campañas de correo</div>
      <div class="filtro">Filtros aplicados: Cifras: <b>${esc(f.cifras)}</b> | Período: <b>${esc(f.periodo)}</b> | Cargo: <b>${esc(f.cargo ?? 'Todos')}</b> | Campañas: <b>${esc(f.campanas ?? 'Todas')}</b><br>
        Correos: ${formatoNumero(m.enviados)} · Campañas: ${formatoNumero(m.campanas)} · Fuente: ${esc(datos.fuente.descripcion ?? '—')}</div>
    </div>
  </div><div class="head-right"><div>Fecha de emisión: <b>${esc(fechaEmision)}</b></div>
    <div class="pill">Apertura real: ${esc(pctPocos(m.pctApertura))}</div></div></div>
  <div class="module-summary"><b>Módulos incluidos:</b> ${esc(modulos)} · Solo totales: este reporte no incluye la lista de personas ni correos.</div>
  ${s.resumen}${s.graficas}${s.ranking}${s.calculo}
  </div>
</body>
</html>`

  // Candado de privacidad: si por error algo tuviera forma de correo, no se exporta nada.
  if (CORREO.test(html)) throw new Error('El reporte se bloqueó porque incluía algo con forma de correo. No se descargó nada.')
  return html
}
