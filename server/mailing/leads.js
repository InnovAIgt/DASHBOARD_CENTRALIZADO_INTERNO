/**
 * Canales de marketing · Mailing: leads calificados de Prospekt atribuidos a campañas (GET /api/marketing/mailing/leads).
 *
 * Reglas de atribución (pedidas por Keily el 24/11/2026, docs/marketing/v2/MAILING.md, sección 11):
 *   1. EXACTA: el correo del lead (minúsculas, sin espacios) es destinatario de una campaña (mkt_brevo_eventos) enviada
 *      ANTES de fecha_creado y como máximo 30 días antes. Si hay varias: la que tuvo clic > la que tuvo apertura real
 *      («opened»; la automática de Apple no cuenta) > la más reciente. Teléfono: no hay fuente de teléfonos de los
 *      destinatarios (PENDIENTES), así que el cruce exacto es solo por correo.
 *   2. ESTIMADA: validator_source = «PostIAlo Mailing» sin coincidencia exacta → la última campaña enviada antes de
 *      fecha_creado, dentro de 7 días. Si ese mismo día (hora de Guatemala) se enviaron varias, el lead va al GRUPO
 *      (ej. «19 nov (77–79)»), sin repartirlo.
 *   3. SIN CAMPAÑA: todo lo demás.
 *   Las campañas de prueba (esCampanaPrueba) y las programadas no reciben leads. Las fechas se comparan en UTC.
 *
 * Asesor de Prospekt ↔ ejecutivo de Cumplimiento (solo lectura): nombres sin tildes, en mayúsculas y sin espacios de
 * más. Exacta si son iguales o tienen las mismas palabras en otro orden; «posible» si todas las palabras del asesor
 * (2 o más) están en UN solo ejecutivo; si no, «sin cruce». Nunca cruces aproximados.
 *
 * La respuesta NUNCA trae correo ni teléfono del lead: solo código, fecha, país, asesor, etapa, status, origen y la
 * atribución. Errores de Prospekt (sin llave, llave rechazada, caída) no rompen el resto de Mailing: esta ruta es
 * independiente y responde con «fuente» y un mensaje sin datos privados.
 */
import { carteraCumplimiento } from '../clientes/cumplimiento.js'
import { leerEventos } from '../mktSupabase.js'
import { obtenerCampanas } from './campanas.js'
import { leerLeadsCalificados } from './prospekt.js'
import { normalizar } from './reglas.js'

const DIA_MS = 24 * 60 * 60 * 1000
export const MAX_DIAS_EXACTA = 30
export const MAX_DIAS_ESTIMADA = 7
export const ORIGEN_MAILING = 'POSTIALO MAILING'
export const ETAPA_CERRADO = 6
/** Guatemala y El Salvador: UTC−6 todo el año (sin horario de verano). Solo para agrupar por día de envío. */
const DESFASE_LOCAL_MS = -6 * 60 * 60 * 1000
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const LEADS_CACHE_MS = 10 * 60 * 1000
const LEADS_CACHE_CON_AVISOS_MS = 2 * 60 * 1000

export const TIPOS_ATRIBUCION = { exacta: 'Exacta', estimada: 'Estimada', sin_campana: 'Sin campaña' }

// ---------- Campañas y destinatarios ----------

/** Campañas que pueden recibir leads: enviadas, no de prueba y con fecha de envío. */
export function campanasParaLeads(campanas = []) {
  return campanas
    .filter((c) => c.estado === 'enviada' && !c.esPrueba && !Number.isNaN(Date.parse(c.fecha)))
    .map((c) => ({ id: Number(c.id), nombre: c.nombre, envio: Date.parse(c.fecha) }))
}

/** correo → Map(campanaId → {clic, apertura}). Cualquier evento con correo lo cuenta como destinatario. */
export function indiceDestinatarios(eventos = []) {
  const indice = new Map()
  for (const e of eventos) {
    const correo = String(e.correo ?? '').replace(/\s+/g, '').toLowerCase()
    const id = Number(e.campana_id)
    if (!correo || !Number.isInteger(id)) continue
    if (!indice.has(correo)) indice.set(correo, new Map())
    const porCampana = indice.get(correo)
    if (!porCampana.has(id)) porCampana.set(id, { clic: false, apertura: false })
    const c = porCampana.get(id)
    if (e.evento === 'click') c.clic = true
    if (e.evento === 'opened') c.apertura = true
  }
  return indice
}

/** Día de envío en hora de Guatemala (AAAA-MM-DD). */
const diaLocal = (ms) => new Date(ms + DESFASE_LOCAL_MS).toISOString().slice(0, 10)

/** «77–79» si son seguidas, «71, 74» si no. */
export function textoIds(ids) {
  const o = [...ids].sort((a, b) => a - b)
  const seguidas = o.every((id, i) => i === 0 || id === o[i - 1] + 1)
  return seguidas && o.length > 2 ? `${o[0]}–${o[o.length - 1]}` : o.join(', ')
}

/** Etiqueta de un grupo: «19 nov (77–79)». */
export function etiquetaGrupo(envio, ids) {
  const [, mes, dia] = diaLocal(envio).split('-')
  return `${Number(dia)} ${MESES[Number(mes) - 1]} (${textoIds(ids)})`
}

// ---------- Atribución ----------

const SIN_CAMPANA = { tipo: 'sin_campana', campanas: [], grupo: null, motivo: null }

/**
 * Atribución de UN lead. campanas = campanasParaLeads(...), destinatarios = indiceDestinatarios(...).
 * @returns {{tipo: 'exacta'|'estimada'|'sin_campana', campanas: number[], grupo: string|null, motivo: 'clic'|'apertura'|'envio'|'origen'|null}}
 */
export function atribuirLead(lead, campanas, destinatarios) {
  const t = Date.parse(lead.fecha)
  if (Number.isNaN(t)) return SIN_CAMPANA
  const porId = new Map(campanas.map((c) => [c.id, c]))
  const dentro = (c, dias) => c.envio <= t && t - c.envio <= dias * DIA_MS

  // 1. Exacta por correo.
  const suyas = lead.correo ? destinatarios.get(lead.correo) : null
  if (suyas) {
    const candidatas = [...suyas]
      .map(([id, s]) => ({ c: porId.get(id), ...s }))
      .filter((x) => x.c && dentro(x.c, MAX_DIAS_EXACTA))
      .sort((a, b) => b.clic - a.clic || b.apertura - a.apertura || b.c.envio - a.c.envio)
    if (candidatas.length) {
      const g = candidatas[0]
      return { tipo: 'exacta', campanas: [g.c.id], grupo: null, motivo: g.clic ? 'clic' : g.apertura ? 'apertura' : 'envio' }
    }
  }

  // 2. Estimada por origen «PostIAlo Mailing».
  if (normalizar(lead.origen).replace(/\s+/g, ' ').trim() === ORIGEN_MAILING) {
    const previas = campanas.filter((c) => dentro(c, MAX_DIAS_ESTIMADA)).sort((a, b) => b.envio - a.envio)
    if (previas.length) {
      const dia = diaLocal(previas[0].envio)
      const mismas = previas.filter((c) => diaLocal(c.envio) === dia).map((c) => c.id).sort((a, b) => a - b)
      return { tipo: 'estimada', campanas: mismas, grupo: mismas.length > 1 ? etiquetaGrupo(previas[0].envio, mismas) : null, motivo: 'origen' }
    }
  }

  return SIN_CAMPANA
}

// ---------- Asesor ↔ ejecutivo ----------

/** Nombre para comparar: sin tildes, mayúsculas, solo letras y un espacio entre palabras. */
export const nombreComparable = (nombre) => normalizar(nombre).replace(/[^A-ZÑ ]/g, ' ').replace(/\s+/g, ' ').trim()
const palabras = (nombre) => nombreComparable(nombre).split(' ').filter(Boolean)
const mismasPalabras = (a, b) => a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ')

/**
 * Cruce del asesor de Prospekt con la lista de ejecutivos de Cumplimiento.
 * @returns {{ejecutivo: string|null, cruce: 'exacta'|'posible'|'sin_cruce'}}
 */
export function cruzarAsesor(asesor, ejecutivos = []) {
  const p = palabras(asesor)
  if (!p.length) return { ejecutivo: null, cruce: 'sin_cruce' }
  const exactas = ejecutivos.filter((e) => mismasPalabras(p, palabras(e)))
  if (exactas.length === 1) return { ejecutivo: exactas[0], cruce: 'exacta' }
  if (exactas.length > 1) return { ejecutivo: null, cruce: 'sin_cruce' }
  if (p.length >= 2) {
    const posibles = ejecutivos.filter((e) => { const pe = new Set(palabras(e)); return p.every((x) => pe.has(x)) })
    if (posibles.length === 1) return { ejecutivo: posibles[0], cruce: 'posible' }
  }
  return { ejecutivo: null, cruce: 'sin_cruce' }
}

// ---------- Armado ----------

/**
 * Leads (de unirLeads) → filas para la pantalla, SIN correo ni teléfono, y el resumen de conteos.
 * @param {{leads: object[], campanas?: object[], eventos?: object[], ejecutivos?: string[]|null}} p
 */
export function armarLeads({ leads = [], campanas = [], eventos = [], ejecutivos = null }) {
  const visibles = campanasParaLeads(campanas)
  const destinatarios = indiceDestinatarios(eventos)
  const filas = leads.map((l) => {
    const a = atribuirLead(l, visibles, destinatarios)
    const asesor = ejecutivos ? cruzarAsesor(l.asesor, ejecutivos) : { ejecutivo: null, cruce: 'sin_cruce' }
    return {
      codigo: l.codigo,
      fecha: l.fecha,
      pais: l.pais || null,
      asesor: l.asesor || null,
      ejecutivo: asesor.ejecutivo,
      cruceEjecutivo: asesor.cruce,
      status: l.status || null,
      etapa: l.etapa,
      cerrado: l.etapa === ETAPA_CERRADO,
      origen: l.origen || null,
      atribucion: a.tipo,
      campanas: a.campanas,
      grupo: a.grupo,
      motivo: a.motivo,
    }
  }).sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')))
  return { filas, resumen: resumirLeads(filas) }
}

/** Conteos: total, por tipo, cerrados y sin fecha. */
export function resumirLeads(filas = []) {
  const contar = (f) => filas.filter(f).length
  return {
    total: filas.length,
    exactas: contar((f) => f.atribucion === 'exacta'),
    estimadas: contar((f) => f.atribucion === 'estimada'),
    sinCampana: contar((f) => f.atribucion === 'sin_campana'),
    cerrados: contar((f) => f.cerrado),
    sinFecha: contar((f) => !f.fecha),
  }
}

// ---------- Ruta ----------

let copia = null // { datos, vence }
let ultimaLectura = null // { lectura, en } última lectura buena de Prospekt (para cuando se cae)

/** Vacía las copias (pruebas). */
export function vaciarCacheLeads() { copia = null; ultimaLectura = null }

const MENSAJE_PANTALLA = {
  sin_llave: 'Leads no disponibles: falta configurar la llave de Prospekt.',
  llave: 'Leads no disponibles: Prospekt rechazó la llave.',
  caida: 'Leads no disponibles: Prospekt no respondió.',
  formato: 'Leads no disponibles: Prospekt respondió algo inesperado.',
}

function respuesta(status, datos) {
  return { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, body: JSON.stringify(datos) }
}

/**
 * Atiende GET /api/marketing/mailing/leads. Todas las dependencias se pueden cambiar en las pruebas.
 */
export async function responderLeads({
  method, env = process.env, fetchFn = fetch, ahora = Date.now(),
  leerProspekt = leerLeadsCalificados, leerCampanas = obtenerCampanas, leer = leerEventos, cartera = carteraCumplimiento,
}) {
  if (method !== 'GET') return { ...respuesta(405, { error: 'Método no permitido. Usa GET.' }), headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Allow: 'GET' } }
  if (copia && copia.vence > ahora) return respuesta(200, copia.datos)

  const avisos = []
  let lectura
  let copiaDe = null
  try {
    lectura = await leerProspekt({ env, fetchFn })
    ultimaLectura = { lectura, en: ahora }
  } catch (err) {
    const motivo = err?.motivo ?? 'caida'
    console.warn('[Mailing] leads de Prospekt:', err?.message || 'error desconocido')
    if (!ultimaLectura || motivo === 'sin_llave') {
      return respuesta(motivo === 'sin_llave' ? 200 : 502, { fuente: motivo === 'sin_llave' ? 'sin_llave' : 'error', motivo, mensaje: MENSAJE_PANTALLA[motivo] ?? MENSAJE_PANTALLA.caida, filas: [], resumen: resumirLeads([]), avisos: [] })
    }
    lectura = ultimaLectura.lectura
    copiaDe = new Date(ultimaLectura.en).toISOString()
    avisos.push(`Prospekt no respondió: se muestran los leads de hace ${Math.max(1, Math.round((ahora - ultimaLectura.en) / 60000))} min.`)
  }

  const [campanas, eventos, ejecutivos] = await Promise.all([
    leerCampanas({ env, fetchFn, ahora }).catch((err) => { console.warn('[Mailing] leads, campañas:', err?.message); avisos.push('No se pudieron leer las campañas de Brevo: todos los leads quedan «sin campaña».'); return [] }),
    leer({ env, fetchFn }).catch((err) => { console.warn('[Mailing] leads, eventos:', err?.message); avisos.push('No se pudieron leer los destinatarios (Supabase): no hay coincidencias exactas por correo.'); return [] }),
    cartera({ env }).then((f) => [...new Set(f.map((x) => x.ejecutivo).filter(Boolean))]).catch((err) => { console.warn('[Mailing] leads, Cumplimiento:', err?.message); avisos.push('No se pudo leer Cumplimiento de Clientes: los asesores quedan sin cruce con el ejecutivo.'); return null }),
  ])

  const { filas, resumen } = armarLeads({ leads: lectura.leads, campanas, eventos, ejecutivos })
  const datos = {
    fuente: 'prospekt',
    actualizado: new Date(ahora).toISOString(),
    copiaDe,
    resumen: { ...resumen, registros: lectura.registros, sinCodigo: lectura.sinCodigo },
    filas,
    avisos,
  }
  copia = { datos, vence: ahora + (avisos.length ? LEADS_CACHE_CON_AVISOS_MS : LEADS_CACHE_MS) }
  return respuesta(200, datos)
}
