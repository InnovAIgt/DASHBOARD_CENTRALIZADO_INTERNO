// Canales de marketing · Mailing: pide los datos a NUESTRO servidor (nunca directo a Brevo ni a Supabase).
//   /api/marketing/mailing/campanas → campañas con totales de Brevo (sin datos personales)
//   /api/marketing/mailing/resumen  → conteos de los eventos del webhook (nunca correos)
// Si el resumen falla, la pantalla sigue con los totales y avisa.
import { useCallback, useEffect, useState } from 'react'

async function pedir(url, señal) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: señal })
  let datos = null
  try { datos = await r.json() } catch { /* respuesta sin JSON */ }
  if (!r.ok) throw new Error(datos?.error || `El servidor respondió HTTP ${r.status}.`)
  return datos
}

export function useMailingDatos() {
  const [estado, setEstado] = useState({ cargando: true, error: null, campanas: [], avisos: [], resumen: null, errorResumen: null, actualizado: null })
  const [vuelta, setVuelta] = useState(0)
  const reintentar = useCallback(() => setVuelta((v) => v + 1), [])

  useEffect(() => {
    const control = new AbortController()
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    Promise.allSettled([
      pedir('/api/marketing/mailing/campanas', control.signal),
      pedir('/api/marketing/mailing/resumen', control.signal),
    ]).then(([campanas, resumen]) => {
      if (control.signal.aborted) return
      if (campanas.status === 'rejected') {
        setEstado((e) => ({ ...e, cargando: false, error: campanas.reason?.message || 'No se pudieron cargar las campañas.' }))
        return
      }
      setEstado({
        cargando: false,
        error: null,
        campanas: campanas.value.campanas ?? [],
        avisos: [...(campanas.value.avisos ?? []), ...(resumen.status === 'fulfilled' ? resumen.value.avisos ?? [] : [])],
        actualizado: campanas.value.actualizado ?? null,
        resumen: resumen.status === 'fulfilled' ? resumen.value : null,
        errorResumen: resumen.status === 'rejected' ? resumen.reason?.message || 'No se pudo leer el detalle del webhook.' : null,
      })
    })
    return () => control.abort()
  }, [vuelta])

  return { ...estado, reintentar }
}
