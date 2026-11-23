/**
 * Cruce Mailing ↔ Cumplimiento de Clientes (MAILING.md, sección 8). SOLO LECTURA: este archivo no se conecta por su
 * cuenta; usa contactosCumplimiento() de cumplimiento.js (transacción READ ONLY, siempre ROLLBACK, caché 30 min).
 *
 *  - Coincidencia EXACTA: el correo (minúsculas, sin espacios) aparece en GG, GF o GO de un cliente. Una celda puede
 *    traer varios correos (coma, punto y coma o espacio). Si aparece en varias empresas, se devuelven todas.
 *  - POSIBLE (por dominio), solo si no hubo coincidencia exacta: el dominio del correo (lo que va después de @)
 *    coincide con el de algún contacto de Cumplimiento. Nunca para dominios de correo personal (gmail, hotmail…).
 *    Si el dominio está en varias empresas, se devuelven todas como posibles. Se marca SIEMPRE como posible.
 *
 * Solo llegan al navegador los clientes de los correos de las campañas, nunca la base completa.
 */
import { contactosCumplimiento } from './cumplimiento.js'

/** Proveedores de correo personal: su dominio no identifica a ninguna empresa. */
const PERSONALES = new Set(['gmail', 'googlemail', 'hotmail', 'outlook', 'live', 'msn', 'yahoo', 'ymail', 'rocketmail', 'icloud', 'me', 'mac',
  'aol', 'protonmail', 'proton', 'gmx', 'zoho', 'yandex', 'mail', 'tutanota', 'hushmail', 'fastmail', 'inbox', 'terra', 'prodigy',
  'turbonett', 'navegante', 'telefonica', 'claro', 'tigo'])

/** ¿El dominio es de correo personal? (gmail.com, hotmail.es, yahoo.com.mx, outlook.com…) */
export function esDominioPersonal(dominio) {
  const base = String(dominio ?? '').toLowerCase().split('.')[0]
  return PERSONALES.has(base)
}

/** Separa una celda en correos (minúsculas, sin espacios). */
export function separarCorreos(texto) {
  return String(texto ?? '').toLowerCase().split(/[\s,;]+/).map((x) => x.trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))
}

export const dominioDe = (correo) => String(correo ?? '').toLowerCase().trim().split('@')[1] ?? ''

/**
 * Índice a partir de las filas de Cumplimiento (pais, codigo, cliente, ejecutivo, usuario_ejecutivo, cargo, email).
 * @returns {{porCorreo: Map<string, Map<string, object>>, porDominio: Map<string, Map<string, object>>}}
 */
export function indexarContactos(filas = []) {
  const porCorreo = new Map()
  const porDominio = new Map()
  const empresaDe = (f) => ({
    pais: f.pais, codigo: String(f.codigo ?? ''), cliente: f.cliente ?? '', ejecutivo: f.ejecutivo ?? '', usuarioEjecutivo: f.usuario_ejecutivo ?? '',
    correoEjecutivo: String(f.correo_ejecutivo ?? '').trim().toLowerCase(), cargos: new Set(), contactos: [],
  })
  const agregar = (mapa, clave, f, conContacto) => {
    const empresas = mapa.get(clave) ?? new Map()
    const k = `${f.pais}|${f.codigo}`
    const e = empresas.get(k) ?? empresaDe(f)
    const cargo = String(f.cargo ?? '').toUpperCase()
    e.cargos.add(cargo)
    // El nombre del contacto solo se guarda en la coincidencia exacta (por dominio sería otra persona).
    if (conContacto && String(f.contacto ?? '').trim()) e.contactos.push({ cargo, nombre: String(f.contacto).trim() })
    empresas.set(k, e)
    mapa.set(clave, empresas)
  }
  for (const f of filas) {
    for (const correo of separarCorreos(f.email)) {
      agregar(porCorreo, correo, f, true)
      const dominio = dominioDe(correo)
      if (dominio && !esDominioPersonal(dominio)) agregar(porDominio, dominio, f, false)
    }
  }
  return { porCorreo, porDominio }
}

/** Empresa lista para enviar al navegador (sin Sets). */
const publica = (e) => ({
  pais: e.pais, codigo: e.codigo, cliente: e.cliente, ejecutivo: e.ejecutivo, usuarioEjecutivo: e.usuarioEjecutivo,
  correoEjecutivo: e.correoEjecutivo || null, cargos: [...e.cargos].sort(), contactos: e.contactos,
})
const ordenar = (lista) => lista.sort((a, b) => a.pais.localeCompare(b.pais) || a.cliente.localeCompare(b.cliente, 'es'))

/** Busca un correo: coincidencias exactas y, si no hay, posibles por dominio. */
export function buscarCorreo(correo, indice) {
  const limpio = String(correo ?? '').toLowerCase().trim()
  const exactas = indice.porCorreo.get(limpio)
  if (exactas) return { clientes: ordenar([...exactas.values()].map(publica)), posibles: [] }
  const dominio = dominioDe(limpio)
  const porDominio = dominio && !esDominioPersonal(dominio) ? indice.porDominio.get(dominio) : null
  return { clientes: [], posibles: porDominio ? ordenar([...porDominio.values()].map(publica)) : [] }
}

/** Agrega a cada fila del detalle sus clientes exactos y sus posibles por dominio. */
export function cruzarFilas(filas = [], indice) {
  const memo = new Map()
  return filas.map((f) => {
    if (!memo.has(f.correo)) memo.set(f.correo, buscarCorreo(f.correo, indice))
    return { ...f, ...memo.get(f.correo) }
  })
}

let indiceCache = null // { filas, indice }

/** Índice de Cumplimiento (se rehace solo cuando cambian las filas de la caché de 30 min). */
export async function indiceCumplimiento(opciones = {}) {
  const filas = await contactosCumplimiento(opciones)
  if (!indiceCache || indiceCache.filas !== filas) indiceCache = { filas, indice: indexarContactos(filas) }
  return indiceCache.indice
}
