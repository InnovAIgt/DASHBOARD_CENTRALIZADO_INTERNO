// Canales de marketing · Redes sociales: de dónde salen los datos.
// SIEMPRE de Meta, a través de NUESTRO servidor (/api/marketing/redes/…; nunca Meta directo desde el navegador; el
// navegador nunca recibe tokens). Si el servidor no tiene token, no responde o Meta falla, la pantalla muestra el error
// con «Reintentar» (decisión de Keily, 24/11/2026). Los datos de ejemplo (redesEjemplo.js) quedan SOLO para pruebas.
import { useCallback, useEffect, useState } from 'react'
import { respuestaAnuncios, respuestaCuentas, respuestaProgramadas, respuestaPublicaciones } from './redesEjemplo.js'
import { mesAnteriorDe } from './redes.js'

export const RUTAS_REDES = ['cuentas', 'publicaciones', 'programadas', 'anuncios']

export const TEXTO_SIN_TOKEN = 'El servidor todavía no tiene el token de Meta (META_TOKEN). Hay que ponerlo en .env.local o en Vercel.'
export const TEXTO_SIN_SERVIDOR = 'El servidor de datos no respondió. En local, levante el portal con «npm run dev».'

async function pedir(recurso, señal, mes = '') {
  const r = await fetch(`/api/marketing/redes/${recurso}${mes ? `?mes=${encodeURIComponent(mes)}` : ''}`, { headers: { Accept: 'application/json' }, signal: señal })
  let datos = null
  try { datos = await r.json() } catch { /* sin JSON */ }
  if (!r.ok) {
    const e = new Error(r.status === 404 && !datos ? TEXTO_SIN_SERVIDOR : datos?.error || `El servidor respondió HTTP ${r.status}.`)
    throw e
  }
  if (datos?.fuente === 'sin_token') throw new Error(TEXTO_SIN_TOKEN)
  return datos
}

/** Junta las cuatro respuestas en el estado de la pantalla. */
export const armarEstado = (cuentas, publicaciones, programadas, anuncios) => ({
  cargando: false,
  error: null,
  fuente: publicaciones?.fuente ?? 'ejemplo',
  actualizado: publicaciones?.actualizado ?? null,
  hoy: publicaciones?.hoy ?? null,
  meses: publicaciones?.meses ?? [],
  avisos: [...new Set([cuentas, publicaciones, programadas, anuncios].flatMap((r) => r?.avisos ?? []))],
  cuentas: cuentas?.cuentas ?? [],
  publicaciones: publicaciones?.publicaciones ?? [],
  programadas: programadas?.programadas ?? [],
  plan: programadas?.plan ?? [],
  anuncios: anuncios?.anuncios ?? [],
  // Marcas con algún anuncio en las cuentas conectadas, de cualquier mes (null si el servidor no lo dice).
  marcasConAnuncios: anuncios?.marcasConAnuncios ?? null,
})

/** Estado vacío mientras carga o si hay error (sin datos inventados). */
export const estadoVacio = () => ({ ...armarEstado(null, null, null, null), fuente: 'meta' })

/** Solo para PRUEBAS: los datos de ejemplo con la misma forma que las rutas. */
export const estadoEjemplo = () => armarEstado(respuestaCuentas, respuestaPublicaciones, respuestaProgramadas, respuestaAnuncios)

/** Nombre de cada consulta para los avisos (si una falla, el aviso dice cuál). */
export const NOMBRE_RUTA = { cuentas: 'Cuentas (alcance, interacciones y seguidores)', publicaciones: 'Publicaciones', programadas: 'Programadas', anuncios: 'Anuncios' }

/**
 * Datos del MES ELEGIDO (enero 2026 → mes actual). Cada mes se pide solo cuando se elige; el servidor guarda los meses
 * cerrados 24 h y el actual 30 min. Cada consulta va por separado: si una falla, `errores[ruta]` dice por qué y el
 * resto de la pantalla sigue. Si fallan TODAS, `error` (por ejemplo, sin token).
 */
export function useRedesDatos(mes) {
  const [estado, setEstado] = useState(() => ({ ...estadoVacio(), cargando: true, errores: {} }))
  const [vuelta, setVuelta] = useState(0)
  const reintentar = useCallback(() => setVuelta((v) => v + 1), [])

  useEffect(() => {
    if (!mes) return undefined
    const control = new AbortController()
    setEstado((e) => ({ ...e, cargando: true, error: null, errores: {} }))
    Promise.allSettled(RUTAS_REDES.map((r) => pedir(r, control.signal, mes)))
      .then((res) => {
        if (control.signal.aborted) return
        const errores = {}
        const valores = res.map((x, i) => {
          if (x.status === 'fulfilled') return x.value
          errores[RUTAS_REDES[i]] = x.reason instanceof TypeError ? TEXTO_SIN_SERVIDOR : x.reason?.message || 'No se pudieron leer los datos de Meta.'
          return null
        })
        if (valores.every((v) => v === null)) { setEstado({ ...estadoVacio(), cargando: false, error: Object.values(errores)[0], errores }); return }
        const armado = armarEstado(...valores)
        setEstado({ ...armado, meses: armado.meses.length ? armado.meses : [mes, mesAnteriorDe(mes)], errores })
      })
    return () => control.abort()
  }, [mes, vuelta])

  return { ...estado, reintentar }
}

/**
 * «Año» de Resumen (enero → mes actual): publicaciones y alcance por cuenta y mes, y anuncios por mes. Solo se pide
 * cuando `activo` (el usuario eligió «Año»); la primera vez tarda, luego sale de la copia del servidor.
 */
export function useAnioRedes(hasta, activo) {
  const [estado, setEstado] = useState({ cargando: false, error: null, anio: null, avisos: [] })
  const [vuelta, setVuelta] = useState(0)
  const reintentar = useCallback(() => setVuelta((v) => v + 1), [])
  useEffect(() => {
    if (!activo || !hasta) return undefined
    const control = new AbortController()
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    pedir('anio', control.signal, hasta)
      .then((d) => { if (!control.signal.aborted) setEstado({ cargando: false, error: null, anio: d?.anio ?? null, avisos: d?.avisos ?? [] }) })
      .catch((err) => { if (!control.signal.aborted) setEstado({ cargando: false, error: err instanceof TypeError ? TEXTO_SIN_SERVIDOR : err.message || 'No se pudo leer el año.', anio: null, avisos: [] }) })
    return () => control.abort()
  }, [hasta, activo, vuelta])
  return { ...estado, reintentar }
}

/**
 * Leads de Redes (Prospekt): se piden aparte; si fallan, solo lo de leads dice «por conectar» o el aviso.
 * Estado: { cargando, fuente ('prospekt' | 'sin_llave' | 'error'), error, leads, noCalificados, avisos }.
 */
export function useLeadsRedes() {
  const [estado, setEstado] = useState({ cargando: true, fuente: null, error: null, leads: [], noCalificados: null, avisos: [] })
  const [vuelta, setVuelta] = useState(0)
  const reintentar = useCallback(() => setVuelta((v) => v + 1), [])
  useEffect(() => {
    const control = new AbortController()
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    fetch('/api/marketing/redes/leads', { headers: { Accept: 'application/json' }, signal: control.signal })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (control.signal.aborted) return
        if (!r.ok || !d) throw new Error(d?.error || (r.status === 404 ? TEXTO_SIN_SERVIDOR : `El servidor respondió HTTP ${r.status}.`))
        setEstado({ cargando: false, fuente: d.fuente, error: d.fuente === 'sin_llave' ? d.aviso : null, leads: d.leads ?? [], noCalificados: d.noCalificados ?? null, avisos: d.avisos ?? [] })
      })
      .catch((err) => { if (!control.signal.aborted) setEstado({ cargando: false, fuente: 'error', error: err instanceof TypeError ? TEXTO_SIN_SERVIDOR : err.message, leads: [], noCalificados: null, avisos: [] }) })
    return () => control.abort()
  }, [vuelta])
  return { ...estado, reintentar }
}

/**
 * Anuncios fase 2 (edad y sexo, ubicaciones, horarios, segmentaciones, presupuestos y formularios) del MES ELEGIDO en
 * el filtro. Se pide aparte: si falla, solo esos recuadros muestran el aviso con «Reintentar».
 */
export function useDetalleAnuncios(mes, activo = true) {
  const [estado, setEstado] = useState({ cargando: true, error: null, detalle: null, avisos: [] })
  const [vuelta, setVuelta] = useState(0)
  const reintentar = useCallback(() => setVuelta((v) => v + 1), [])
  useEffect(() => {
    if (!mes || !activo) return undefined
    const control = new AbortController()
    setEstado({ cargando: true, error: null, detalle: null, avisos: [] })
    pedir('anuncios-detalle', control.signal, mes)
      .then((d) => { if (!control.signal.aborted) setEstado({ cargando: false, error: null, detalle: d?.detalle?.[0] ?? null, avisos: d?.avisos ?? [] }) })
      .catch((err) => {
        if (control.signal.aborted) return
        setEstado({ cargando: false, error: err instanceof TypeError ? TEXTO_SIN_SERVIDOR : err.message || 'No se pudo leer el detalle de anuncios.', detalle: null, avisos: [] })
      })
    return () => control.abort()
  }, [mes, activo, vuelta])
  return { ...estado, reintentar }
}
