// Canales de marketing · Mailing: pide los datos a NUESTRO servidor (nunca directo a Brevo ni a Supabase).
//   /api/marketing/mailing/campanas → campañas con totales de Brevo (sin datos personales)
//   /api/marketing/mailing/resumen  → conteos de los eventos (historial importado y webhook)
//   /api/marketing/mailing/detalle  → una fila por correo y campaña (muestra correos: decisión de Keily, DECISIONES.md)
// Si el resumen o el detalle fallan, la pantalla sigue con los totales y avisa.
import { useCallback, useEffect, useState } from 'react'

async function pedir(url, señal) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: señal })
  let datos = null
  try { datos = await r.json() } catch { /* respuesta sin JSON */ }
  if (!r.ok) throw new Error(datos?.error || `El servidor respondió HTTP ${r.status}.`)
  return datos
}

const VACIO = { cargando: true, error: null, campanas: [], avisos: [], resumen: null, errorResumen: null, detalle: null, errorDetalle: null, actualizado: null }

export function useMailingDatos() {
  const [estado, setEstado] = useState(VACIO)
  const [vuelta, setVuelta] = useState(0)
  const reintentar = useCallback(() => setVuelta((v) => v + 1), [])

  useEffect(() => {
    const control = new AbortController()
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    Promise.allSettled([
      pedir('/api/marketing/mailing/campanas', control.signal),
      pedir('/api/marketing/mailing/resumen', control.signal),
      pedir('/api/marketing/mailing/detalle', control.signal),
    ]).then(([campanas, resumen, detalle]) => {
      if (control.signal.aborted) return
      if (campanas.status === 'rejected') {
        setEstado((e) => ({ ...e, cargando: false, error: campanas.reason?.message || 'No se pudieron cargar las campañas.' }))
        return
      }
      const ok = (r) => r.status === 'fulfilled'
      setEstado({
        cargando: false,
        error: null,
        campanas: campanas.value.campanas ?? [],
        avisos: [...(campanas.value.avisos ?? []), ...(ok(resumen) ? resumen.value.avisos ?? [] : [])],
        actualizado: campanas.value.actualizado ?? null,
        resumen: ok(resumen) ? resumen.value : null,
        errorResumen: ok(resumen) ? null : resumen.reason?.message || 'No se pudo leer el detalle de los eventos.',
        detalle: ok(detalle) ? detalle.value : null,
        errorDetalle: ok(detalle) ? null : detalle.reason?.message || 'No se pudo leer el detalle por correo.',
      })
    })
    return () => control.abort()
  }, [vuelta])

  return { ...estado, reintentar }
}
