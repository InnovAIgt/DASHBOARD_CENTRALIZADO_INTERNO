// Canales de marketing · Redes sociales: cálculos de la pantalla (sin pantalla ni red; se prueban con node --test).
// Trabajan con la MISMA forma de datos que devolverán las rutas /api/marketing/redes/* (ver REDES.md):
//   cuentas:        {id, marca, pais, red, nombre, seguidores, metricas: {'AAAA-MM': {alcanceDiario, vistas, interacciones, cuentasInteraccion, seguidores}}}
//   publicaciones:  {id, cuentaId, marca, pais, red, formato, fecha, hora, titulo, estado, alcance, vistas, clics, reacciones, interacciones, enlace}
//   anuncios:       {id, mes, campana, marca ('' = sin página), pais, moneda, presupuesto, gastado, alcance, visualizaciones, clics, mensajes, reclutamiento}
// Las fechas ya vienen en hora de Guatemala/El Salvador (UTC−6): el servidor las convierte antes de agrupar.
// «estado» de una publicación: 'publicada' | 'no_publicada' | 'programada' (lo programado saldrá del «Plan del mes»).
// Dinero: cada cuenta de anuncios trae su moneda (campo currency de Meta); NUNCA se suman monedas distintas.

/** Marcas (DATA RED es de El Salvador, confirmado el 23/11/2026). El orden es el de la pantalla. */
export const MARCAS = {
  gt: { nombre: 'RED Intelfon Guatemala', corto: 'RED GT', pais: 'GT', color: '#2f86c9' },
  sv: { nombre: 'RED Intelfon El Salvador', corto: 'RED SV', pais: 'SV', color: '#3f9c85' },
  dr: { nombre: 'DATA RED', corto: 'DATA RED', pais: 'SV', color: '#9085e9' },
}
export const PAISES = { GT: 'Guatemala', SV: 'El Salvador' }
export const REDES = { fb: 'Facebook', ig: 'Instagram' }
export const TEXTO_IG_SIN_PROGRAMADAS = 'Instagram no permite ver programadas'
export const COLOR_RED = { fb: '#3987e5', ig: '#d6589b' }
export const FORMATOS = { foto: 'Foto', video: 'Video', reel: 'Reel', carrusel: 'Carrusel' }
export const ESTADOS = { publicada: 'Publicada', no_publicada: 'No se publicó', programada: 'Programada (por venir)' }
export const FILTROS_REDES = { pais: '', marca: '', red: '', mes: '', formato: '', estado: '' }

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
/** '2026-11' → 'Noviembre 2026'. */
export const nombreMes = (mes) => { const [a, m] = String(mes).split('-').map(Number); return m ? `${MESES[m - 1].replace(/^./, (l) => l.toUpperCase())} ${a}` : String(mes) }
/** Meses que traen los datos ('AAAA-MM'), del más reciente al más viejo. */
export const mesesDe = (items = []) => [...new Set(items.map((x) => String(x.fecha ?? x.mes ?? '').slice(0, 7)).filter((m) => /^\d{4}-\d{2}$/.test(m)))].sort().reverse()

/** ¿El elemento pasa los filtros? (País por la marca; DATA RED = SV.) */
export function pasaFiltros(x, f = FILTROS_REDES) {
  const pais = x.pais ?? MARCAS[x.marca]?.pais
  if (f.pais && pais !== f.pais) return false
  if (f.marca && x.marca !== f.marca) return false
  if (f.red && x.red && x.red !== f.red) return false
  if (f.mes && String(x.fecha ?? x.mes ?? '').slice(0, 7) !== f.mes) return false
  if (f.formato && x.formato !== f.formato) return false
  if (f.estado && x.estado !== f.estado) return false
  return true
}
export const filtrarRedes = (items = [], f = FILTROS_REDES) => items.filter((x) => pasaFiltros(x, f))

/** Semáforo de cumplimiento (programado vs publicado): 100 % verde, 90–99 % amarillo, menos de 90 % rojo. */
export function semaforoCumplimiento(pct) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return null
  return pct >= 100 ? 'verde' : pct >= 90 ? 'amarillo' : 'rojo'
}
const pctDe = (parte, total) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null)

/**
 * Resumen de publicaciones: publicadas, no publicadas, programadas (por venir) y cumplimiento.
 * El cumplimiento solo mira lo que ya debía salir (publicadas + no publicadas): «10 de 14».
 */
export function resumenPublicaciones(pubs = []) {
  const publicadas = pubs.filter((p) => p.estado === 'publicada')
  const noPublicadas = pubs.filter((p) => p.estado === 'no_publicada').length
  const programadas = pubs.filter((p) => p.estado === 'programada').length
  // Cumplidas = publicadas que estaban programadas (las que llevan fueraDePlan salieron sin estar programadas: suman en
  // publicadas, alcance e interacciones, pero no en el cumplimiento). Ver datos/redesProgramadas.js.
  const cumplidas = publicadas.filter((p) => !p.fueraDePlan).length
  const aFecha = cumplidas + noPublicadas
  const alcance = publicadas.reduce((n, p) => n + (Number(p.alcance) || 0), 0)
  const interacciones = publicadas.reduce((n, p) => n + (Number(p.interacciones) || 0), 0)
  const cumplimiento = pctDe(cumplidas, aFecha)
  return { publicadas: publicadas.length, cumplidas, noPublicadas, programadas, aFecha, cumplimiento, semaforo: semaforoCumplimiento(cumplimiento), alcance, interacciones, tasa: pctDe(interacciones, alcance) }
}

/** Programado vs publicado por marca (para las barras y las tarjetas con anillo). */
export const porMarca = (pubs = []) => Object.keys(MARCAS).map((marca) => ({ marca, ...resumenPublicaciones(pubs.filter((p) => p.marca === marca)) }))

/** Publicadas por red y formato (dona «Por red y formato»). */
export function porRedFormato(pubs = []) {
  const m = new Map()
  for (const p of pubs.filter((x) => x.estado === 'publicada')) { const k = `${p.red}|${p.formato}`; m.set(k, (m.get(k) ?? 0) + 1) }
  return [...m].map(([clave, n]) => { const [red, formato] = clave.split('|'); return { clave, red, formato, publicaciones: n } })
    .sort((a, b) => b.publicaciones - a.publicaciones)
}

/** Semanas del mes (1–7, 8–14, 15–21, 22–28, 29–fin) con el alcance de Facebook e Instagram lado a lado. */
export function alcancePorSemana(pubs = [], mes) {
  const [a, m] = String(mes).split('-').map(Number)
  const dias = a && m ? new Date(Date.UTC(a, m, 0)).getUTCDate() : 31
  const semanas = []
  for (let d = 1; d <= dias; d += 7) semanas.push({ semana: semanas.length + 1, desde: d, hasta: Math.min(d + 6, dias), fb: 0, ig: 0 })
  for (const p of pubs.filter((x) => x.estado === 'publicada' && String(x.fecha).slice(0, 7) === mes)) {
    const s = semanas[Math.min(semanas.length - 1, Math.floor((Number(String(p.fecha).slice(8, 10)) - 1) / 7))]
    if (s && (p.red === 'fb' || p.red === 'ig')) s[p.red] += Number(p.alcance) || 0
  }
  return semanas
}

/** Serie corta para la mini gráfica de una tarjeta: un valor por semana del mes. */
export const serieSemanal = (pubs, mes, valor) => alcancePorSemana([], mes).map((s) => pubs
  .filter((p) => p.estado === 'publicada' && String(p.fecha).slice(0, 7) === mes && Number(String(p.fecha).slice(8, 10)) >= s.desde && Number(String(p.fecha).slice(8, 10)) <= s.hasta)
  .reduce((n, p) => n + (valor ? Number(p[valor]) || 0 : 1), 0))

/**
 * Hechas y programadas por PAÍS y MARCA (lo principal que pidió el ingeniero). Hechas = publicadas; programadas =
 * pendientes (por venir + las que no salieron). Instagram no da programadas: igProgramadas = null salvo que haya un
 * «Plan del mes» con Instagram. RED GT = Guatemala; RED SV y DATA RED = El Salvador.
 * @returns {Array<{pais, nombre, marcas: Array<{marca, fbHechas, fbProgramadas, igHechas, igProgramadas, hechas}>, total}>}
 */
export function hechasYProgramadas(items = [], marcas = Object.keys(MARCAS)) {
  const fila = (lista) => {
    const n = (red, estados) => lista.filter((p) => p.red === red && estados.includes(p.estado)).length
    const igPlan = lista.some((p) => p.red === 'ig' && p.estado !== 'publicada')
    return { fbHechas: n('fb', ['publicada']), fbProgramadas: n('fb', ['programada', 'no_publicada']), igHechas: n('ig', ['publicada']),
      igProgramadas: igPlan ? n('ig', ['programada', 'no_publicada']) : null, hechas: n('fb', ['publicada']) + n('ig', ['publicada']) }
  }
  return Object.keys(PAISES).map((pais) => {
    const deEste = marcas.filter((m) => MARCAS[m]?.pais === pais)
    return { pais, nombre: PAISES[pais], marcas: deEste.map((marca) => ({ marca, ...fila(items.filter((p) => p.marca === marca)) })),
      total: fila(items.filter((p) => deEste.includes(p.marca))) }
  }).filter((p) => p.marcas.length)
}

/** Seguidores de las cuentas que pasan los filtros. */
export const seguidores = (cuentas = []) => cuentas.reduce((n, c) => n + (Number(c.seguidores) || 0), 0)

/**
 * Métricas de cuenta del mes sumadas (las cuentas ya filtradas). alcanceDiario = suma del alcance de cada día de cada
 * cuenta: una persona puede contarse más de una vez (Meta no da el alcance único del mes en v25). null si no hay datos.
 */
export function metricasCuentas(cuentas = [], mes, corte = null) {
  const conDatos = cuentas.filter((c) => c.metricas?.[mes])
  if (!conDatos.length) return null
  const suma = (k) => conDatos.reduce((n, c) => n + (Number(c.metricas[mes][k]) || 0), 0)
  return { alcanceDiario: corte ? conDatos.reduce((n, c) => n + alcanceHasta(c, mes, corte), 0) : suma('alcanceDiario'),
    vistas: suma('vistas'), interacciones: suma('interacciones'), cuentas: conDatos.length }
}

/** Alcance de una cuenta del día 1 al día «corte» del mes (mismo cálculo: suma del alcance de cada día). */
function alcanceHasta(cuenta, mes, corte) {
  const dias = Object.entries(cuenta.alcancePorDia ?? {}).filter(([d]) => d.startsWith(mes) && Number(d.slice(8, 10)) <= corte)
  return dias.length || !cuenta.metricas?.[mes] ? dias.reduce((n, [, v]) => n + (Number(v) || 0), 0) : Number(cuenta.metricas[mes].alcanceDiario) || 0
}

/** Alcance por marca (suma de alcance diario de sus cuentas, mismo cálculo que la tarjeta Alcance). */
export const alcancePorMarca = (cuentas = [], mes, corte = null, marcas = Object.keys(MARCAS)) =>
  Object.fromEntries(marcas.map((m) => [m, metricasCuentas(cuentas.filter((c) => c.marca === m), mes, corte)?.alcanceDiario ?? 0]))

const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'a', 'al', 'con', 'por', 'para', 'tu', 'su',
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'])
/**
 * Nombre de campaña para la pantalla: sin el año al inicio («2026 - », «2026 ») y, si viene TODO EN MAYÚSCULAS, en
 * formato normal (siglas cortas como RH, BF o PTT se quedan en mayúsculas). El nombre original va en el tooltip.
 */
export function nombreCampana(nombre) {
  let t = String(nombre ?? '').trim().replace(/^\d{4}\s*[-–—]?\s*/, '').trim() || String(nombre ?? '').trim()
  if (/[A-ZÁÉÍÓÚÑ]/.test(t) && !/[a-záéíóúñ]/.test(t)) {
    t = t.split(/(\s+)/).map((p, i) => {
      if (/^\s+$/.test(p) || !p) return p
      const letras = p.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '')
      if (letras.length >= 2 && letras.length <= 3 && !MINUSCULAS.has(p.toLowerCase())) return p
      const l = p.toLowerCase()
      return i === 0 ? l.charAt(0).toUpperCase() + l.slice(1) : l
    }).join('')
  }
  return t
}

const EMOJI_BORDE = /^[\s\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}‍️]+|[\s\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}‍️]+$/gu
/** Título sin emojis al inicio ni al final (los del medio se quedan). */
export const tituloLimpio = (t) => String(t ?? '').replace(EMOJI_BORDE, '').trim() || String(t ?? '')

/** Separa los anuncios de marketing de los de reclutamiento (estos no cuentan en inversión, mensajes ni costo). */
export const separarReclutamiento = (anuncios = []) => ({
  marketing: anuncios.filter((a) => !a.reclutamiento),
  reclutamiento: anuncios.filter((a) => a.reclutamiento),
})

/** Costo por clic y por mensaje de un anuncio (en su propia moneda), o null. */
export const costoPorClic = (a) => (Number(a.clics) > 0 ? Number(a.gastado) / Number(a.clics) : null)
export const costoPorMensaje = (a) => (Number(a.mensajes) > 0 ? Number(a.gastado) / Number(a.mensajes) : null)

/**
 * Totales de anuncios: lo que NO es dinero se suma todo junto; el dinero, separado POR MONEDA (nunca se mezclan).
 * @returns {{campanas, alcance, visualizaciones, clics, mensajes, porMoneda: Array<{moneda, campanas, presupuesto, gastado, clics, mensajes, cpc, costoMensaje}>}}
 */
export function totalesAnuncios(anuncios = []) {
  const suma = (lista, k) => lista.reduce((n, a) => n + (Number(a[k]) || 0), 0)
  const monedas = [...new Set(anuncios.map((a) => a.moneda || 'SIN_MONEDA'))].sort()
  // Una campaña puede venir en varias filas (una por página): se cuenta una vez por nombre.
  const campanasDe = (lista) => new Set(lista.map((a) => a.campana ?? a.id)).size
  return {
    campanas: campanasDe(anuncios),
    alcance: suma(anuncios, 'alcance'),
    visualizaciones: suma(anuncios, 'visualizaciones'),
    clics: suma(anuncios, 'clics'),
    mensajes: suma(anuncios, 'mensajes'),
    porMoneda: monedas.map((moneda) => {
      const lista = anuncios.filter((a) => (a.moneda || 'SIN_MONEDA') === moneda)
      const gastado = suma(lista, 'gastado')
      const clics = suma(lista, 'clics')
      const mensajes = suma(lista, 'mensajes')
      return { moneda, campanas: campanasDe(lista), presupuesto: suma(lista, 'presupuesto'), gastado, clics, mensajes,
        cpc: clics > 0 ? gastado / clics : null, costoMensaje: mensajes > 0 ? gastado / mensajes : null }
    }),
  }
}

/** Dinero con el símbolo de SU moneda: GTQ → «Q 1,234.50»; USD → «US$ 1,234.50»; otra → «EUR 1,234.50». */
export function dinero(valor, moneda) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return '—'
  const simbolo = { GTQ: 'Q', USD: 'US$' }[moneda] ?? (moneda && moneda !== 'SIN_MONEDA' ? moneda : '¿?')
  return `${simbolo} ${Number(valor).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
