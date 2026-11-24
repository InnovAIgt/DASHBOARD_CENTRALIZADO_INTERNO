// Canales de marketing · Redes sociales: de dónde salen los datos.
// HOY: datos de ejemplo (datos/redesEjemplo.js), porque todavía no hay token de Meta.
// CON EL TOKEN: se cambia FUENTE a 'meta' y se leen las rutas de NUESTRO servidor (nunca Meta directo desde el
// navegador). La forma de los datos es la misma, así que la pantalla no cambia.
import { useCallback, useEffect, useState } from 'react'
import { respuestaAnuncios, respuestaCuentas, respuestaPublicaciones } from './redesEjemplo.js'

export const FUENTE = 'ejemplo' // 'ejemplo' | 'meta'

async function pedir(url, señal) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: señal })
  let datos = null
  try { datos = await r.json() } catch { /* sin JSON */ }
  if (!r.ok) throw new Error(datos?.error || `El servidor respondió HTTP ${r.status}.`)
  return datos
}

/** Junta las tres respuestas en el estado de la pantalla. */
export const armarEstado = (cuentas, publicaciones, anuncios) => ({
  cargando: false,
  error: null,
  fuente: publicaciones?.fuente ?? FUENTE,
  actualizado: publicaciones?.actualizado ?? null,
  hoy: publicaciones?.hoy ?? null,
  meses: publicaciones?.meses ?? [],
  cuentas: cuentas?.cuentas ?? [],
  publicaciones: publicaciones?.publicaciones ?? [],
  anuncios: anuncios?.anuncios ?? [],
})

export function useRedesDatos() {
  const [estado, setEstado] = useState(() => (FUENTE === 'ejemplo'
    ? armarEstado(respuestaCuentas, respuestaPublicaciones, respuestaAnuncios)
    : { ...armarEstado(null, null, null), cargando: true }))
  const [vuelta, setVuelta] = useState(0)
  const reintentar = useCallback(() => setVuelta((v) => v + 1), [])

  useEffect(() => {
    if (FUENTE === 'ejemplo') return undefined
    const control = new AbortController()
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    Promise.all([
      pedir('/api/marketing/redes/cuentas', control.signal),
      pedir('/api/marketing/redes/publicaciones', control.signal),
      pedir('/api/marketing/redes/anuncios', control.signal),
    ]).then(([c, p, a]) => { if (!control.signal.aborted) setEstado(armarEstado(c, p, a)) })
      .catch((err) => { if (!control.signal.aborted) setEstado((e) => ({ ...e, cargando: false, error: err.message || 'No se pudieron leer los datos de Meta.' })) })
    return () => control.abort()
  }, [vuelta])

  return { ...estado, reintentar }
}
