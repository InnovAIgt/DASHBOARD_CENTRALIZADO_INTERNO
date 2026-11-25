// Canales de marketing · Redes sociales: de dónde salen los datos.
// SIEMPRE de Meta, a través de NUESTRO servidor (/api/marketing/redes/…; nunca Meta directo desde el navegador; el
// navegador nunca recibe tokens). Si el servidor no tiene token, no responde o Meta falla, la pantalla muestra el error
// con «Reintentar» (decisión de Keily, 24/11/2026). Los datos de ejemplo (redesEjemplo.js) quedan SOLO para pruebas.
import { useCallback, useEffect, useState } from 'react'
import { respuestaAnuncios, respuestaCuentas, respuestaProgramadas, respuestaPublicaciones } from './redesEjemplo.js'

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

export function useRedesDatos() {
  const [estado, setEstado] = useState(() => ({ ...estadoVacio(), cargando: true }))
  const [vuelta, setVuelta] = useState(0)
  const reintentar = useCallback(() => setVuelta((v) => v + 1), [])

  useEffect(() => {
    const control = new AbortController()
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    Promise.all(RUTAS_REDES.map((r) => pedir(r, control.signal)))
      .then(([c, p, pr, a]) => {
        if (control.signal.aborted) return
        setEstado(armarEstado(c, p, pr, a))
      })
      .catch((err) => {
        if (control.signal.aborted) return
        const mensaje = err instanceof TypeError ? TEXTO_SIN_SERVIDOR : err.message || 'No se pudieron leer los datos de Meta.'
        setEstado((e) => ({ ...e, cargando: false, error: mensaje }))
      })
    return () => control.abort()
  }, [vuelta])

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
