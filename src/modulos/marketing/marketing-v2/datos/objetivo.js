// Canales de marketing · Mailing · OBJETIVO de cada campaña.
// Lista creada por Keily (23/11/2026; DECISIONES.md); Marketing puede confirmarlos o cambiarlos.
// Reglas en este orden; gana la primera que coincide; se compara sin mayúsculas ni tildes y por palabra completa,
// aceptando su plural («turno» encuentra «turnos»; «entrega» no encuentra «entregabilidad»). Se busca, en este orden: a) asunto, b) nombre de la campaña,
// c) contenido del correo (lo revisa el servidor y solo manda el objetivo encontrado, nunca el contenido),
// d) si nada coincide: «Promoción general de RED», con estado «Revisar». Nunca queda vacío.
// Lo elegido a mano (tabla mkt_campana_cargo) gana y queda «Confirmado».
// Archivo sin dependencias: lo usan la pantalla y el servidor (server/mailing/campanas.js).

export const OBJETIVOS = [
  { nombre: 'Promover el dashboard de rondas', claves: ['dashboard', 'acceso', 'rondas', 'plataforma'] },
  { nombre: 'Control de turnos y personal', claves: ['turno', 'supervisor', 'ronda', 'anoche', 'evidencia', 'guardia'] },
  { nombre: 'Reducir costos operativos', claves: ['costo', 'costos', 'nomina', 'gasto', 'horas', 'pagando'] },
  { nombre: 'Mejorar la productividad', claves: ['productividad', 'tiempo muerto', 'produccion', 'a ciegas', 'operacion'] },
  { nombre: 'Comunicación con radios PTT', claves: ['ptt', 'comunicacion', 'radio', 'radios', 'flota'] },
  { nombre: 'Logística y transporte', claves: ['logistica', 'transporte', 'ruta', 'rutas', 'entrega'] },
  { nombre: 'Planificación y crecimiento', claves: ['ampliar', 'zonas', 'recursos', 'crecer', 'expansion'] },
  { nombre: 'Validar la base de contactos', claves: ['validacion', 'verificacion', 'test entregabilidad'] },
]
export const OBJETIVO_GENERAL = 'Promoción general de RED'
/** Opciones del selector (los 8 + el general); se puede escribir uno nuevo. */
export const OPCIONES_OBJETIVO = [...OBJETIVOS.map((o) => o.nombre), OBJETIVO_GENERAL]

export const ESTADO_OBJETIVO = { sugerido: 'Sugerido', revisar: 'Revisar', confirmado: 'Confirmado' }
export const FUENTE_OBJETIVO = { manual: 'Confirmado por Marketing', asunto: 'Sugerido por el asunto', nombre: 'Sugerido por el nombre de la campaña', contenido: 'Sugerido por el contenido del correo', general: 'Sin coincidencias: revisar' }

/** Minúsculas, sin tildes y con los campos de Brevo ({{ contact.X }}) fuera. */
export const normalizar = (t) => String(t ?? '').replace(/\{\{[^}]*\}\}/g, ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Palabra completa, aceptando su plural (-s / -es): «turno» encuentra «turnos», pero «entrega» no encuentra «entregabilidad».
const REGLAS = OBJETIVOS.map((o) => ({ ...o, re: new RegExp(`(^|[^a-z0-9])(${o.claves.map((k) => escapar(normalizar(k))).join('|')})(s|es)?(?=$|[^a-z0-9])`) }))

/** Objetivo que coincide con un texto (o null). */
export function objetivoDeTexto(texto) {
  const t = normalizar(texto)
  if (!t) return null
  return REGLAS.find((r) => r.re.test(t))?.nombre ?? null
}

/**
 * Nombre de la campaña sin «con costo» / «sin costo»: hablan del precio de la oferta, no de reducir costos
 * (decisión de Keily, 23/11/2026). Solo se quita del NOMBRE; en el asunto «costo» sigue contando.
 */
export const nombreSinPrecio = (nombre) => normalizar(nombre).replace(/(^|[^a-z0-9])(con|sin) costo(?=$|[^a-z0-9])/g, '$1 ')

/** Texto visible de un HTML (para el contenido del correo; solo lo usa el servidor). */
export const textoDeHtml = (html) => String(html ?? '')
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/\s+/g, ' ').trim()

/**
 * Objetivo de una campaña: {objetivo, estado, fuente, textoFuente}.
 * c: {asunto, nombre, objetivoManual?, objetivoContenido?} (objetivoContenido lo calcula el servidor).
 */
export function objetivoDeCampana(c) {
  const manual = String(c?.objetivoManual ?? '').trim()
  if (manual) return { objetivo: manual, estado: 'confirmado', fuente: 'manual', textoFuente: FUENTE_OBJETIVO.manual }
  for (const [fuente, texto] of [['asunto', c?.asunto], ['nombre', nombreSinPrecio(c?.nombre)]]) {
    const o = objetivoDeTexto(texto)
    if (o) return { objetivo: o, estado: 'sugerido', fuente, textoFuente: FUENTE_OBJETIVO[fuente] }
  }
  if (c?.objetivoContenido) return { objetivo: c.objetivoContenido, estado: 'sugerido', fuente: 'contenido', textoFuente: FUENTE_OBJETIVO.contenido }
  return { objetivo: OBJETIVO_GENERAL, estado: 'revisar', fuente: 'general', textoFuente: FUENTE_OBJETIVO.general }
}
