// Canales de marketing · Redes sociales: de dónde salen los datos.
// Siempre se piden a NUESTRO servidor (/api/marketing/redes/…, nunca Meta directo desde el navegador). Si el servidor
// todavía no tiene token de Meta, responde { fuente: 'sin_token' } y se usan los datos de ejemplo (misma forma), con
// el aviso «Datos de ejemplo». Si el servidor no responde (por ejemplo, solo el front en local), también ejemplo.
import { useCallback, useEffect, useState } from 'react'
import { respuestaAnuncios, respuestaCuentas, respuestaProgramadas, respuestaPublicaciones } from './redesEjemplo.js'

export const RUTAS_REDES = ['cuentas', 'publicaciones', 'programadas', 'anuncios']

async function pedir(recurso, señal) {
  const r = await fetch(`/api/marketing/redes/${recurso}`, { headers: { Accept: 'application/json' }, signal: señal })
  let datos = null
  try { datos = await r.json() } catch { /* sin JSON */ }
  if (!r.ok) {
    const e = new Error(datos?.error || `El servidor respondió HTTP ${r.status}.`)
    e.sinServidor = r.status === 404 && !datos
    throw e
  }
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
  plan: publicaciones?.plan ?? [],
  anuncios: anuncios?.anuncios ?? [],
})

export const estadoEjemplo = () => armarEstado(respuestaCuentas, respuestaPublicaciones, respuestaProgramadas, respuestaAnuncios)

export function useRedesDatos() {
  const [estado, setEstado] = useState(() => ({ ...estadoEjemplo(), cargando: true }))
  const [vuelta, setVuelta] = useState(0)
  const reintentar = useCallback(() => setVuelta((v) => v + 1), [])

  useEffect(() => {
    const control = new AbortController()
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    Promise.all(RUTAS_REDES.map((r) => pedir(r, control.signal)))
      .then(([c, p, pr, a]) => {
        if (control.signal.aborted) return
        setEstado(p?.fuente === 'sin_token' ? estadoEjemplo() : armarEstado(c, p, pr, a))
      })
      .catch((err) => {
        if (control.signal.aborted) return
        // Sin servidor (solo el front) o red caída: datos de ejemplo con aviso; con token y error de Meta: el error.
        if (err.sinServidor || err instanceof TypeError) setEstado(estadoEjemplo())
        else setEstado((e) => ({ ...e, cargando: false, error: err.message || 'No se pudieron leer los datos de Meta.' }))
      })
    return () => control.abort()
  }, [vuelta])

  return { ...estado, reintentar }
}
