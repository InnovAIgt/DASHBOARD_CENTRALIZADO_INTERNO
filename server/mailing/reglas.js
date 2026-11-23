/**
 * Canales de marketing · Mailing: reglas oficiales (docs/marketing/v2/MAILING.md, secciones 2 a 7).
 *
 * Solo cálculos: no se conecta a Brevo ni a Supabase. Lo usan las rutas del servidor de Mailing.
 * Cada función sigue una sección de MAILING.md; si la regla cambia allá, se cambia aquí y en las pruebas
 * (server/mailing/reglas.test.js).
 */

export const SIN_CLASIFICAR = 'Sin clasificar'
export const CARGOS = ['GG', 'GF', 'GO']

/** Mayúsculas y sin tildes, para comparar textos sin que importen acentos ni mayúsculas. */
export function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
}

// --- Sección 2: cargo y sector desde el nombre de la campaña ---

/** Regla oficial: «código correlativo - cargo - sector - asunto» (ej. 001-GG-SEGURIDAD-Asunto). */
const REGLA_OFICIAL = /^\s*(\d+)\s*-\s*(GG|GF|GO)\s*-\s*([^-]+?)\s*-\s*(.+?)\s*$/

/** Formas viejas aceptadas (decisión de Keily, 23/11/2026). Todo lo demás queda «Sin clasificar». */
const FORMAS_VIEJAS = [
  { cargo: 'GG', patron: /\bGERENTE\s+GENERAL\b/ },
  { cargo: 'GF', patron: /\bGERENTE\s+(FINANCIERO|FINACIERO|DE\s+FINANZAS|FINANZAS)\b/ },
  { cargo: 'GO', patron: /\bGERENTE\s+(OPERATIVO|DE\s+OPERACIONES|OPERACIONES)\b/ },
  { cargo: 'GG', patron: /(^|[^A-Z0-9.])G\.\s?G(?![A-Z0-9])/ },
  { cargo: 'GF', patron: /(^|[^A-Z0-9.])G\.\s?F(?![A-Z0-9])/ },
  { cargo: 'GO', patron: /(^|[^A-Z0-9.])G\.\s?O(?![A-Z0-9])/ },
  { cargo: 'GG', patron: /-\s*GG\s*-/ },
  { cargo: 'GF', patron: /-\s*GF\s*-/ },
  { cargo: 'GO', patron: /-\s*GO\s*-/ },
]

/**
 * Cargo y sector sugeridos por el nombre.
 * - Si sigue la regla oficial: código, cargo y sector salen del nombre.
 * - Si no: el cargo se deduce de las formas viejas; si aparecen dos cargos distintos, no se adivina.
 * - El sector solo sale de la regla oficial.
 * @returns {{codigo: string|null, cargo: string|null, sector: string|null, sigueRegla: boolean}}
 */
export function cargoDesdeNombre(nombre) {
  const texto = normalizar(nombre).trim()
  const oficial = texto.match(REGLA_OFICIAL)
  if (oficial) return { codigo: oficial[1], cargo: oficial[2], sector: oficial[3].trim(), sigueRegla: true }
  const encontrados = new Set(FORMAS_VIEJAS.filter((f) => f.patron.test(texto)).map((f) => f.cargo))
  return { codigo: null, cargo: encontrados.size === 1 ? [...encontrados][0] : null, sector: null, sigueRegla: false }
}

/** Sección 7.1: lo elegido a mano gana sobre lo sugerido por el nombre; sin ninguno, «Sin clasificar». */
export function cargoFinal(manual, sugerido) {
  if (CARGOS.includes(manual)) return manual
  if (CARGOS.includes(sugerido)) return sugerido
  return SIN_CLASIFICAR
}

// --- Sección 7: campañas de prueba (ocultas por defecto, con opción para verlas) ---

/** Nombre con TEST, VALIDACIÓN o PRUEBA (también en plural), sin importar mayúsculas ni tildes. */
export function esCampanaPrueba(nombre) {
  return /\b(TESTS?|VALIDACION(ES)?|PRUEBAS?)\b/.test(normalizar(nombre))
}

// --- Sección 3: estado final de cada destinatario ---

export const ESTADOS = {
  entregado: 'Entregado',
  rebote_temporal: 'Rebote temporal',
  rebote_permanente: 'Rebote permanente',
  sin_confirmacion: 'Sin confirmación',
}

const RESULTADO_DE_EVENTO = { delivered: 'entregado', soft_bounce: 'rebote_temporal', hard_bounce: 'rebote_permanente' }

/**
 * Estado final: gana el último evento con fecha entre entrega, rebote temporal y rebote permanente.
 * Empate de resultados distintos en la misma fecha y hora → «Sin confirmación». Sin eventos → «Sin confirmación».
 * @param {Array<{evento: string, fecha_evento: string, motivo?: string|null}>} eventos  de UN destinatario y UNA campaña
 * @returns {{estado: string, motivo: string|null, sinEventos: boolean, empate: boolean}}
 */
export function estadoFinal(eventos = []) {
  const resultados = eventos
    .filter((e) => RESULTADO_DE_EVENTO[e.evento] && !Number.isNaN(Date.parse(e.fecha_evento)))
    .map((e) => ({ estado: RESULTADO_DE_EVENTO[e.evento], tiempo: Date.parse(e.fecha_evento), motivo: e.motivo ?? null }))
  if (!resultados.length) return { estado: 'sin_confirmacion', motivo: null, sinEventos: true, empate: false }
  const ultimo = Math.max(...resultados.map((r) => r.tiempo))
  const finales = resultados.filter((r) => r.tiempo === ultimo)
  if (new Set(finales.map((r) => r.estado)).size > 1) return { estado: 'sin_confirmacion', motivo: null, sinEventos: false, empate: true }
  const final = finales[0]
  return { estado: final.estado, motivo: final.estado === 'entregado' ? null : final.motivo, sinEventos: false, empate: false }
}

// --- Sección 4: Status de correo (CORREGIR / MANTENER) y motivo técnico ---

/** Tabla 4.2. Las de CORREGIR van primero: la regla 2 (error de dirección) gana sobre la regla 3. */
const TABLA_MOTIVOS = [
  { patron: /UNABLE TO FIND MX/, motivo: 'Dominio sin registros MX', categoria: 'Dominio o DNS', accion: 'CORREGIR' },
  { patron: /\b5\.1\.1\b/, motivo: 'Cuenta destinataria inexistente', categoria: 'Rechazo de destinatario', accion: 'CORREGIR' },
  { patron: /USER UNKNOWN/, motivo: 'Usuario desconocido', categoria: 'Destinatario no reconocido', accion: 'CORREGIR' },
  { patron: /DOES NOT EXIST/, motivo: 'Cuenta no encontrada', categoria: 'Destinatario inexistente', accion: 'CORREGIR' },
  { patron: /NO SUCH USER/, motivo: 'Usuario inexistente', categoria: 'Rechazo de destinatario', accion: 'CORREGIR' },
  { patron: /NO MAILBOX BY THAT NAME/, motivo: 'Buzón no encontrado', categoria: 'Destinatario inexistente', accion: 'CORREGIR' },
  { patron: /MAILBOX UNAVAILABLE/, motivo: 'Buzón no disponible', categoria: 'Rechazo de buzón', accion: 'CORREGIR' },
  { patron: /CONNECTION TIMEOUT|TIMED OUT/, motivo: 'Tiempo de espera agotado', categoria: 'Conectividad', accion: 'MANTENER' },
  { patron: /\b4\.2\.2\b|OUT OF STORAGE SPACE|OVERQUOTA|MAILBOX FULL/, motivo: 'Buzón lleno', categoria: 'Capacidad de buzón', accion: 'MANTENER' },
  { patron: /SMTP AUTHENTICATION/, motivo: 'Servidor exige autenticación SMTP', categoria: 'Autenticación', accion: 'MANTENER' },
  { patron: /NOT PERMITTED TO RELAY/, motivo: 'Retransmisión SMTP no autorizada', categoria: 'Restricción de servidor', accion: 'MANTENER' },
  { patron: /ACCESS DENIED/, motivo: 'Acceso denegado por servidor', categoria: 'Bloqueo de recepción', accion: 'MANTENER' },
  { patron: /BLOCKED/, motivo: 'Bloqueado por servidor', categoria: 'Restricción de seguridad', accion: 'MANTENER' },
  { patron: /OXSUS/, motivo: 'Bloqueo del servidor receptor', categoria: 'Restricción de seguridad', accion: 'MANTENER' },
  { patron: /\b5\.4\.1\b/, motivo: 'Rechazo por política o ruta', categoria: 'Restricción de entrega', accion: 'MANTENER' },
  { patron: /SPAM/, motivo: 'Rechazo por filtro antispam', categoria: 'Bloqueo de seguridad', accion: 'MANTENER' },
  { patron: /MESSAGE DELIVERY FAILED/, motivo: 'Fallo de entrega reportado', categoria: 'Causa no especificada', accion: 'MANTENER' },
]

/**
 * Status de correo (reglas 4.1, en orden; gana la primera que se cumple).
 * @param {{estado: string, motivo?: string|null}} final  resultado de estadoFinal
 * @returns {{status: 'CORREGIR'|'MANTENER', motivoTecnico: string|null, categoria: string|null}}
 */
export function statusCorreo({ estado, motivo }) {
  // Regla 1: Entregado o Sin confirmación → MANTENER.
  if (estado !== 'rebote_temporal' && estado !== 'rebote_permanente') return { status: 'MANTENER', motivoTecnico: null, categoria: null }
  const texto = normalizar(motivo).trim()
  const permanente = estado === 'rebote_permanente'
  if (!texto) {
    return permanente
      ? { status: 'CORREGIR', motivoTecnico: 'Rebote permanente sin detalle', categoria: 'Rebote permanente genérico' }
      : { status: 'MANTENER', motivoTecnico: 'Rechazo sin causa específica', categoria: 'Diagnóstico pendiente' }
  }
  // Reglas 2 y 3: según la tabla de motivos.
  const fila = TABLA_MOTIVOS.find((m) => m.patron.test(texto))
  if (fila) return { status: fila.accion, motivoTecnico: fila.motivo, categoria: fila.categoria }
  // Regla 4: rebote permanente sin causa reconocida → CORREGIR. Regla 5: lo demás → MANTENER.
  return permanente
    ? { status: 'CORREGIR', motivoTecnico: 'Rechazo sin causa específica', categoria: 'Rebote permanente genérico' }
    : { status: 'MANTENER', motivoTecnico: 'Rechazo sin causa específica', categoria: 'Diagnóstico pendiente' }
}

// --- Sección 5: apertura y clic de cada destinatario ---

/** Con fecha de apertura gana REGISTRADA; sin fecha pero con aperturas automáticas de Apple, AUTOMÁTICA. */
export function estadoApertura({ conFecha = false, automaticas = 0 } = {}) {
  if (conFecha) return 'APERTURA REGISTRADA'
  if (Number(automaticas) > 0) return 'APERTURA AUTOMÁTICA'
  return 'NO REGISTRADA'
}

export function estadoClic(clics = 0) {
  return Number(clics) > 0 ? 'CLIC REGISTRADO' : 'SIN CLIC REGISTRADO'
}

// --- Sección 6: indicadores y semáforo ---

/** Porcentaje con un decimal; null si el divisor es 0 (no se inventa un 0 %). */
export function porcentaje(parte, total) {
  const p = Number(parte), t = Number(total)
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return null
  return Math.round((p / t) * 1000) / 10
}

/**
 * Totales de una campaña desde globalStats de Brevo (campañas viejas: solo hay totales).
 * - Aperturas: uniqueViews = «Aperturas» de la pantalla de Brevo, que INCLUYE las automáticas (confirmado por Keily
 *   con la campaña 74, 23/11/2026). Apple MPP (appleMppOpens) se muestra aparte; no se resta uno del otro.
 *   La apertura registrada (sin automáticas) solo existe con el detalle por persona (webhook o carga inicial).
 * - Clic: clickers (destinatarios que hicieron clic).
 * - Sin confirmación = enviados − entregados − rebotes; si da negativo queda en 0 y se avisa.
 */
export function totalesDesdeBrevo(g = {}) {
  const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0)
  const enviados = n(g.sent), entregados = n(g.delivered), reboteTemporal = n(g.softBounces), rebotePermanente = n(g.hardBounces)
  const resto = enviados - entregados - reboteTemporal - rebotePermanente
  return {
    enviados, entregados, reboteTemporal, rebotePermanente,
    sinConfirmacion: Math.max(0, resto),
    sinConfirmacionAjustado: resto < 0,
    aperturas: n(g.uniqueViews), // «Aperturas (incluye automáticas)»
    aperturasApple: n(g.appleMppOpens), // «Apple MPP», aparte

    clics: n(g.clickers),
    bajas: n(g.unsubscriptions),
    quejas: n(g.complaints), // marcado como spam por el destinatario
  }
}

/** Sección 6: tasas sobre enviados (entrega y rebotes) y sobre entregados (apertura y clic). */
export function tasas(t) {
  return {
    entrega: porcentaje(t.entregados, t.enviados),
    reboteTemporal: porcentaje(t.reboteTemporal, t.enviados),
    rebotePermanente: porcentaje(t.rebotePermanente, t.enviados),
    apertura: porcentaje(t.aperturas, t.entregados),
    clic: porcentaje(t.clics, t.entregados),
  }
}

/**
 * Semáforo de la tasa de entrega: 100 % verde · 90 % a menos de 100 % amarillo · menos de 90 % rojo.
 * Se calcula con los números exactos (no con el porcentaje redondeado): 9 996 de 10 000 es amarillo, no verde.
 */
export function semaforoEntrega(entregados, enviados) {
  const e = Number(entregados), t = Number(enviados)
  if (!Number.isFinite(e) || !Number.isFinite(t) || t <= 0) return null
  if (e >= t) return 'verde'
  if (e * 10 >= t * 9) return 'amarillo'
  return 'rojo'
}
