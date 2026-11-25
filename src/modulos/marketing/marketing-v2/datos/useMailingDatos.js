// Canales de marketing · Mailing: pide los datos a NUESTRO servidor (nunca directo a Brevo ni a Supabase).
//   /api/marketing/mailing/campanas → campañas con totales de Brevo (sin datos personales)
//   /api/marketing/mailing/resumen  → conteos de los eventos (historial importado y webhook)
//   /api/marketing/mailing/detalle  → una fila por correo y campaña (muestra correos: decisión de Keily, DECISIONES.md)
//   /api/marketing/mailing/leads    → leads calificados de Prospekt atribuidos a campañas (sin correo ni teléfono)
// Si el resumen o el detalle fallan, la pantalla sigue con los totales y avisa. Los leads se piden APARTE: si Prospekt
// tarda o falla, Mailing carga igual y solo la parte de leads muestra su aviso.
import { useCallback, useEffect, useState } from 'react'
import { aplicarManual } from './calculos.js'

async function pedir(url, señal) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: señal })
  let datos = null
  try { datos = await r.json() } catch { /* respuesta sin JSON */ }
  if (!r.ok) throw new Error(datos?.error || datos?.mensaje || `El servidor respondió HTTP ${r.status}.`)
  return datos
}

const VACIO = { cargando: true, error: null, campanas: [], avisos: [], resumen: null, errorResumen: null, detalle: null, errorDetalle: null, actualizado: null }
const LEADS_CARGANDO = { cargando: true, fuente: null, mensaje: null, filas: [], avisos: [], copiaDe: null, actualizado: null }

/** Leads de Prospekt, aparte del resto de Mailing. fuente: prospekt · sin_llave · error. */
export function useLeadsMailing(vuelta = 0) {
  const [leads, setLeads] = useState(LEADS_CARGANDO)
  useEffect(() => {
    const control = new AbortController()
    setLeads((l) => ({ ...l, cargando: true }))
    pedir('/api/marketing/mailing/leads', control.signal)
      .then((d) => { if (!control.signal.aborted) setLeads({ cargando: false, fuente: d?.fuente ?? 'error', mensaje: d?.mensaje ?? null, filas: d?.filas ?? [], avisos: d?.avisos ?? [], copiaDe: d?.copiaDe ?? null, actualizado: d?.actualizado ?? null }) })
      .catch((err) => { if (!control.signal.aborted) setLeads({ ...LEADS_CARGANDO, cargando: false, fuente: 'error', mensaje: err?.message || 'Leads no disponibles: no se pudo leer Prospekt.' }) })
    return () => control.abort()
  }, [vuelta])
  return leads
}

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
        edicionHabilitada: campanas.value.edicionHabilitada === true,
        resumen: ok(resumen) ? resumen.value : null,
        errorResumen: ok(resumen) ? null : resumen.reason?.message || 'No se pudo leer el detalle de los eventos.',
        detalle: ok(detalle) ? detalle.value : null,
        errorDetalle: ok(detalle) ? null : detalle.reason?.message || 'No se pudo leer el detalle por correo.',
      })
    })
    return () => control.abort()
  }, [vuelta])

  // Lo guardado con la clave de Marketing se aplica al instante (sin esperar la caché del servidor).
  const actualizarCampana = useCallback((id, manual) => setEstado((e) => ({ ...e, campanas: e.campanas.map((c) => (c.id === id ? aplicarManual(c, manual) : c)) })), [])
  const leads = useLeadsMailing(vuelta)
  return { ...estado, leads, reintentar, actualizarCampana }
}
