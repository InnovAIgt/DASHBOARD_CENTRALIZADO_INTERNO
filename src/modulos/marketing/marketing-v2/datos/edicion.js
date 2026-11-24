// Canales de marketing · Mailing: guardar cargo y objetivo con la CLAVE DE MARKETING (sin inicio de sesión).
// La clave la valida SIEMPRE el servidor (/api/marketing/mailing/cargo); aquí nunca se guarda la clave: solo el
// permiso firmado que devuelve el servidor, en sessionStorage (dura mientras la pestaña esté abierta; vence en 8 h).

const CLAVE_PERMISO = 'mkv2-permiso-edicion'
const RUTA = '/api/marketing/mailing/cargo'

/** Permiso guardado en esta pestaña ({permiso, nombre, vence}) o null si no hay o venció. */
export function permisoActual() {
  try {
    const p = JSON.parse(sessionStorage.getItem(CLAVE_PERMISO) || 'null')
    return p?.permiso && Date.parse(p.vence) > Date.now() ? p : null
  } catch { return null }
}
export function olvidarPermiso() { try { sessionStorage.removeItem(CLAVE_PERMISO) } catch { /* nada */ } }

async function llamar(method, body) {
  const r = await fetch(RUTA, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
  let datos = null
  try { datos = await r.json() } catch { /* sin JSON */ }
  if (r.status === 401 && body.accion !== 'entrar') olvidarPermiso()
  if (!r.ok) { const e = new Error(datos?.error || `El servidor respondió HTTP ${r.status}.`); e.status = r.status; throw e }
  return datos
}

/** Valida la clave en el servidor; si es correcta, guarda el permiso en esta pestaña. */
export async function entrar(clave, nombre) {
  const d = await llamar('POST', { accion: 'entrar', clave, nombre })
  try { sessionStorage.setItem(CLAVE_PERMISO, JSON.stringify({ permiso: d.permiso, nombre: d.nombre, vence: d.vence })) } catch { /* solo en memoria */ }
  return d
}

/** Guarda cargo y objetivo de una campaña. Devuelve lo guardado ({cargo, objetivo, asignadoPor, …}). */
export async function guardarCargoObjetivo(campanaId, { cargo, objetivo }) {
  const p = permisoActual()
  if (!p) { const e = new Error('Falta la clave de Marketing.'); e.status = 401; throw e }
  return (await llamar('POST', { accion: 'guardar', permiso: p.permiso, campana_id: campanaId, cargo, objetivo })).manual
}

/** «Volver a lo sugerido»: borra lo elegido a mano para esa campaña. */
export async function volverASugerido(campanaId) {
  const p = permisoActual()
  if (!p) { const e = new Error('Falta la clave de Marketing.'); e.status = 401; throw e }
  return llamar('DELETE', { permiso: p.permiso, campana_id: campanaId })
}
