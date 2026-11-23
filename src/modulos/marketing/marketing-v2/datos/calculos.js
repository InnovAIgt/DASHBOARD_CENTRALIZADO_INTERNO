// Canales de marketing · Mailing: cálculos de la pantalla (filtros y sumas).
// Las reglas oficiales vienen de server/mailing/reglas.js (una sola fuente, sin conexiones: se puede usar en el
// navegador). Los datos llegan ya calculados por campaña desde /api/marketing/mailing/campanas y /resumen.
// Documentación: docs/marketing/v2/MAILING.md, secciones 6 y 7.
import { CARGOS, CLASIFICACIONES, clasificarCruce, porcentaje, semaforoEntrega, SIN_CLASIFICAR, tasas } from '../../../../../server/mailing/reglas.js'

export { CLASIFICACIONES, clasificarCruce, porcentaje, semaforoEntrega, SIN_CLASIFICAR }
export const OPCIONES_CARGO = [...CARGOS, SIN_CLASIFICAR]
export const NOMBRE_CARGO = { GG: 'Gerente General', GF: 'Gerente Financiero', GO: 'Gerente de Operaciones', [SIN_CLASIFICAR]: SIN_CLASIFICAR }

export const FILTROS_INICIALES = { campana: '', cargo: '', asunto: '', desde: '', hasta: '', mostrarPrueba: false, pais: '', cliente: '' }

const DIA_GT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' })
const FECHA_GT = new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', day: '2-digit', month: '2-digit', year: 'numeric' })

/** Día de envío en hora de Guatemala («AAAA-MM-DD»); null si no hay fecha. */
export function diaGuatemala(iso) {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : DIA_GT.format(new Date(t))
}

/** Fecha para mostrar (dd/mm/aaaa, hora de Guatemala). */
export function fechaCorta(iso) {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? '—' : FECHA_GT.format(new Date(t))
}

const HORA_GT = new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', hour: '2-digit', minute: '2-digit', hour12: false })
/** Fecha y hora para mostrar («11/11/2026 · 15:44», hora de Guatemala), o «—». */
export function fechaHora(iso) {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? '—' : `${FECHA_GT.format(new Date(t))} · ${HORA_GT.format(new Date(t))}`
}

/** Campañas que cumplen los filtros. Las de prueba se ocultan salvo que se pida verlas. */
export function filtrarCampanas(campanas = [], f = FILTROS_INICIALES) {
  return campanas.filter((c) => {
    if (!f.mostrarPrueba && c.esPrueba) return false
    if (f.campana && String(c.id) !== String(f.campana)) return false
    if (f.cargo && c.cargo !== f.cargo) return false
    if (f.asunto && c.asunto !== f.asunto) return false
    if (f.desde || f.hasta) {
      const dia = diaGuatemala(c.fecha)
      if (!dia) return false
      if (f.desde && dia < f.desde) return false
      if (f.hasta && dia > f.hasta) return false
    }
    return true
  })
}

/** Opciones de los menús Campaña y Asunto (según la opción de ver o no las de prueba). */
export function opcionesFiltros(campanas = [], mostrarPrueba = false) {
  const visibles = campanas.filter((c) => mostrarPrueba || !c.esPrueba)
  return {
    campanas: visibles.map((c) => ({ id: c.id, nombre: c.nombre })),
    asuntos: [...new Set(visibles.map((c) => c.asunto).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
  }
}

const CAMPOS = ['enviados', 'entregados', 'reboteTemporal', 'rebotePermanente', 'sinConfirmacion', 'aperturas', 'aperturasApple', 'clics', 'bajas', 'quejas']

/** Suma los totales de varias campañas (solo enviadas: las programadas aún no tienen cifras). */
export function sumarTotales(campanas = []) {
  const t = Object.fromEntries(CAMPOS.map((k) => [k, 0]))
  for (const c of campanas) {
    if (c.estado !== 'enviada') continue
    for (const k of CAMPOS) t[k] += Number(c.totales?.[k]) || 0
  }
  const enviadas = campanas.filter((c) => c.estado === 'enviada')
  return {
    ...t,
    campanas: enviadas.length,
    // Si en alguna campaña enviados − entregados − rebotes dio negativo, «Sin confirmación» no es exacto.
    sinConfirmacionAjustado: enviadas.some((c) => c.totales?.sinConfirmacionAjustado),
    tasas: tasas(t),
    semaforo: semaforoEntrega(t.entregados, t.enviados),
  }
}

/**
 * Estados que se pueden ver en «Detalle por correo» (desde un clic en Resultados generales o en el menú).
 * brevo: total de Brevo de las campañas filtradas (todas las campañas). webhook: conteo por persona (solo campañas
 * enviadas después de activar el webhook). Nunca hay correos: solo cifras.
 */
export const ESTADOS_DETALLE = [
  { id: 'todos', label: 'Todos los destinatarios', brevo: (t) => t.enviados, webhook: (s) => s.destinatarios },
  { id: 'entregado', label: 'Entregado', brevo: (t) => t.entregados, webhook: (s) => s.estados.entregado },
  { id: 'apertura', label: 'Apertura', brevo: (t) => t.aperturas, webhook: (s) => s.aperturaRegistrada, notaBrevo: 'incluye automáticas' },
  { id: 'apertura_automatica', label: 'Apertura automática (Apple)', brevo: (t) => t.aperturasApple, webhook: (s) => s.aperturaAutomatica, notaBrevo: 'personas con Apple MPP' },
  { id: 'clic', label: 'Clic', brevo: (t) => t.clics, webhook: (s) => s.clic },
  { id: 'rebotes', label: 'Con rebote (temporal o permanente)', brevo: (t) => t.reboteTemporal + t.rebotePermanente, webhook: (s) => s.estados.rebote_temporal + s.estados.rebote_permanente },
  { id: 'rebote_temporal', label: 'Rebote temporal', brevo: (t) => t.reboteTemporal, webhook: (s) => s.estados.rebote_temporal },
  { id: 'rebote_permanente', label: 'Rebote permanente', brevo: (t) => t.rebotePermanente, webhook: (s) => s.estados.rebote_permanente },
  { id: 'sin_confirmacion', label: 'Sin confirmación', brevo: (t) => t.sinConfirmacion, webhook: (s) => s.estados.sin_confirmacion },
  { id: 'baja', label: 'Se dio de baja', brevo: (t) => t.bajas, webhook: (s) => s.bajas },
  { id: 'spam', label: 'Marcó como spam', brevo: (t) => t.quejas, webhook: (s) => s.spam },
]
export const estadoDetalle = (id) => ESTADOS_DETALLE.find((e) => e.id === id) ?? ESTADOS_DETALLE[0]

/** Análisis por cargo: una fila por GG, GF, GO y Sin clasificar (las que tengan campañas). */
export function porCargo(campanas = []) {
  return OPCIONES_CARGO
    .map((cargo) => ({ cargo, ...sumarTotales(campanas.filter((c) => c.cargo === cargo)) }))
    .filter((fila) => fila.campanas > 0)
}

/**
 * Datos del webhook para las campañas filtradas: cuántas tienen detalle y el total de CORREGIR con sus motivos.
 * Los destinatarios sin ningún evento no están en la tabla: el % por corregir se calcula sobre los enviados de Brevo.
 */
export function detalleWebhook(campanas = [], resumen = null) {
  const porId = resumen?.campanas ?? {}
  const conDetalle = campanas.filter((c) => porId[c.id])
  const motivos = {}
  let corregir = 0
  let enviados = 0
  for (const c of conDetalle) {
    const r = porId[c.id]
    corregir += r.status?.CORREGIR ?? 0
    enviados += Number(c.totales?.enviados) || 0
    for (const [motivo, n] of Object.entries(r.motivosCorregir ?? {})) motivos[motivo] = (motivos[motivo] ?? 0) + n
  }
  return {
    hayDatos: conDetalle.length > 0,
    campanasConDetalle: conDetalle.length,
    corregir,
    porcentajeCorregir: conDetalle.length ? porcentaje(corregir, enviados) : null,
    motivos: Object.entries(motivos).sort((a, b) => b[1] - a[1]),
  }
}

/**
 * Suma los conteos del webhook de las campañas filtradas (Detalle por correo y Correos por corregir).
 * Solo conteos: el resumen nunca trae correos.
 */
export function sumarResumen(campanas = [], resumen = null) {
  const porId = resumen?.campanas ?? {}
  const s = {
    campanasConDetalle: 0, enviados: 0, destinatarios: 0,
    estados: { entregado: 0, rebote_temporal: 0, rebote_permanente: 0, sin_confirmacion: 0 },
    corregir: 0, mantener: 0, aperturaRegistrada: 0, aperturaAutomatica: 0, proxyOpen: 0, clic: 0, spam: 0, bajas: 0,
    motivosCorregir: {}, motivosMantener: {}, conHistorial: 0, conWebhook: 0,
  }
  for (const c of campanas) {
    const r = porId[c.id]
    if (!r) continue
    s.campanasConDetalle += 1
    s.enviados += Number(c.totales?.enviados) || 0
    s.destinatarios += r.destinatarios ?? 0
    for (const k of Object.keys(s.estados)) s.estados[k] += r.estados?.[k] ?? 0
    s.corregir += r.status?.CORREGIR ?? 0
    s.mantener += r.status?.MANTENER ?? 0
    for (const k of ['aperturaRegistrada', 'aperturaAutomatica', 'proxyOpen', 'clic', 'spam', 'bajas']) s[k] += r[k] ?? 0
    if (r.origen?.historial) s.conHistorial += 1
    if (r.origen?.webhook) s.conWebhook += 1
    for (const [m, n] of Object.entries(r.motivosCorregir ?? {})) s.motivosCorregir[m] = (s.motivosCorregir[m] ?? 0) + n
    for (const [m, n] of Object.entries(r.motivosMantener ?? {})) s.motivosMantener[m] = (s.motivosMantener[m] ?? 0) + n
  }
  const orden = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])
  return { ...s, hayDatos: s.campanasConDetalle > 0, motivosCorregir: orden(s.motivosCorregir), motivosMantener: orden(s.motivosMantener) }
}

/** Ordena filas por una clave; los vacíos (null) siempre al final. */
export function ordenarPor(filas, valor, direccion = 'desc') {
  const signo = direccion === 'asc' ? 1 : -1
  return [...filas].sort((a, b) => {
    const x = valor(a), y = valor(b)
    if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1
    if (y === null || y === undefined) return -1
    if (typeof x === 'string' || typeof y === 'string') return String(x).localeCompare(String(y), 'es') * signo
    return (x - y) * signo
  })
}

// ---------------- Detalle por correo (filas de /api/marketing/mailing/detalle) ----------------

/** ¿La fila cumple el estado elegido (mismos ids que ESTADOS_DETALLE)? */
export function cumpleEstado(fila, estado = 'todos') {
  switch (estado) {
    case 'todos': return true
    case 'apertura': return fila.apertura === 'APERTURA REGISTRADA' || fila.apertura === 'APERTURA AUTOMÁTICA'
    case 'apertura_automatica': return fila.apertura === 'APERTURA AUTOMÁTICA'
    case 'clic': return fila.clic === 'CLIC REGISTRADO'
    case 'rebotes': return fila.estado === 'rebote_temporal' || fila.estado === 'rebote_permanente'
    case 'baja': return !!fila.baja
    case 'spam': return !!fila.spam
    default: return fila.estado === estado
  }
}

export const FILTROS_DETALLE = { texto: '', estado: 'todos', status: '', apertura: '', clic: '', origen: '', motivo: '' }

/**
 * Filtra las filas del detalle: solo campañas de los filtros de arriba (ids), estado, CORREGIR/MANTENER, apertura,
 * clic, origen, motivo técnico y búsqueda (correo, dominio, campaña o asunto, sin importar mayúsculas ni tildes).
 */
export function filtrarDetalle(filas = [], f = FILTROS_DETALLE, { ids = null, nombres = {} } = {}) {
  const buscar = normalizarTexto(f.texto)
  return filas.filter((x) => {
    if (ids && !ids.has(x.campana_id)) return false
    if (!cumpleEstado(x, f.estado)) return false
    if (f.status && x.status !== f.status) return false
    if (f.apertura && x.apertura !== f.apertura) return false
    if (f.clic && x.clic !== f.clic) return false
    if (f.origen && x.origen !== f.origen) return false
    if (f.motivo && x.motivoTecnico !== f.motivo) return false
    if (buscar) {
      const c = nombres[x.campana_id] ?? {}
      const empresas = [...(x.clientes ?? []), ...(x.posibles ?? [])].map((e) => `${e.cliente} ${e.codigo} ${e.ejecutivo}`).join(' ')
      if (!normalizarTexto(`${x.correo} ${c.nombre ?? ''} ${c.asunto ?? ''} ${x.campana_id} ${empresas}`).includes(buscar)) return false
    }
    return true
  })
}

const normalizarTexto = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Correos por corregir: UNA fila por dirección (aunque haya fallado en varias campañas), con sus campañas, motivos,
 * indicaciones, estados, orígenes y la fecha del último rebote. Ordenadas por fecha de rebote (más reciente primero).
 */
export function direccionesCorregir(filas = []) {
  const porCorreo = new Map()
  for (const x of filas) {
    if (x.status !== 'CORREGIR') continue
    const d = porCorreo.get(x.correo) ?? { correo: x.correo, campanas: [], motivos: new Set(), indicaciones: new Set(), estados: new Set(), origenes: new Set(), fechaRebote: null, clientes: x.clientes ?? null, posibles: x.posibles ?? null }
    d.campanas.push(x.campana_id)
    if (x.motivoTecnico) d.motivos.add(x.motivoTecnico)
    d.indicaciones.add(x.indicacion)
    d.estados.add(x.estadoTexto)
    d.origenes.add(x.origen)
    if (x.fechaRebote && (!d.fechaRebote || x.fechaRebote > d.fechaRebote)) d.fechaRebote = x.fechaRebote
    porCorreo.set(x.correo, d)
  }
  return [...porCorreo.values()]
    .map((d) => ({ ...d, campanas: [...new Set(d.campanas)].sort((a, b) => b - a), motivos: [...d.motivos], indicaciones: [...d.indicaciones], estados: [...d.estados], origenes: [...d.origenes] }))
    .sort((a, b) => String(b.fechaRebote ?? '').localeCompare(String(a.fechaRebote ?? '')) || a.correo.localeCompare(b.correo))
}

/**
 * Contadores de las sub-pestañas, con las filas por correo de las campañas filtradas.
 * corregir = DIRECCIONES únicas a corregir (un correo cuenta una vez aunque esté en varias campañas);
 * casosCorregir = casos (correo + campaña); clientes = filas de Relación con clientes (correo + campaña).
 * null si no hay detalle por correo (no se inventa un número).
 */
export function contadoresMailing(filas, campanas = []) {
  if (!Array.isArray(filas)) return { corregir: null, casosCorregir: null, clientes: null }
  const ids = new Set(campanas.map((c) => c.id))
  const propias = filas.filter((x) => ids.has(x.campana_id))
  const casos = propias.filter((x) => x.status === 'CORREGIR')
  return { corregir: new Set(casos.map((x) => x.correo)).size, casosCorregir: casos.length, clientes: propias.length }
}

/** Valores distintos de un campo (para los menús de filtro). */
export const opcionesDe = (filas, campo) => [...new Set(filas.map((x) => x[campo]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es'))

/** Una página de una lista. */
export function paginar(lista, pagina = 1, tamano = 25) {
  const paginas = Math.max(1, Math.ceil(lista.length / tamano))
  const actual = Math.min(Math.max(1, pagina), paginas)
  return { filas: lista.slice((actual - 1) * tamano, actual * tamano), pagina: actual, paginas, total: lista.length }
}

// ---------------- Cruce con Cumplimiento de Clientes (filas con «clientes» y «posibles») ----------------

/** Empresas de una fila: las exactas si hay; si no, las posibles por dominio. */
export function empresasDe(fila) {
  if (fila?.clientes?.length) return { tipo: 'exacta', empresas: fila.clientes }
  if (fila?.posibles?.length) return { tipo: 'posible', empresas: fila.posibles }
  return { tipo: 'sin', empresas: [] }
}

/**
 * Filtros de arriba País (GT / SV) y Cliente (texto: empresa, código o ejecutivo). Solo aplican a las filas por correo.
 * Sin cruce (clientes === null), País y Cliente no pueden filtrar: la fila se deja pasar solo si no hay filtro.
 */
export function filtrarPorCliente(filas = [], { pais = '', cliente = '' } = {}) {
  const buscar = normalizarTexto(cliente)
  if (!pais && !buscar) return filas
  return filas.filter((f) => {
    const { empresas } = empresasDe(f)
    if (pais && !empresas.some((e) => e.pais === pais)) return false
    if (buscar && !empresas.some((e) => normalizarTexto(`${e.cliente} ${e.codigo} ${e.ejecutivo} ${e.usuarioEjecutivo ?? ''}`).includes(buscar))) return false
    return true
  })
}

/**
 * Bloque «Correos pendientes por ejecutivo»: direcciones únicas (de direccionesCorregir) agrupadas por ejecutivo,
 * separando coincidencia exacta y posible por dominio. Una dirección en varias empresas aparece con cada ejecutivo.
 * @returns {{exacta: Array<{ejecutivo, direcciones}>, posible: Array<{ejecutivo, direcciones}>, sinIdentificar: object[]}}
 */
export function gruposPorEjecutivo(direcciones = []) {
  const grupos = { exacta: new Map(), posible: new Map() }
  const sinIdentificar = []
  for (const d of direcciones) {
    const { tipo, empresas } = empresasDe(d)
    if (tipo === 'sin') { sinIdentificar.push(d); continue }
    for (const ejecutivo of new Set(empresas.map((e) => e.ejecutivo || 'Sin ejecutivo'))) {
      const lista = grupos[tipo].get(ejecutivo) ?? []
      lista.push(d)
      grupos[tipo].set(ejecutivo, lista)
    }
  }
  const ordenar = (m) => [...m.entries()].map(([ejecutivo, lista]) => ({ ejecutivo, direcciones: lista }))
    .sort((a, b) => b.direcciones.length - a.direcciones.length || a.ejecutivo.localeCompare(b.ejecutivo, 'es'))
  return { exacta: ordenar(grupos.exacta), posible: ordenar(grupos.posible), sinIdentificar }
}

/** Relación con clientes: cada fila (correo + campaña) con su clasificación (sección 8) según el cargo de la campaña. */
export function relacionClientes(filas = [], cargoDe = {}) {
  return filas.map((f) => ({ ...f, clasificacion: f.clientes === null ? null : clasificarCruce(f, cargoDe[f.campana_id]) }))
}

/** Conteo por clasificación. */
export function conteoClasificaciones(filas = []) {
  const c = Object.fromEntries(Object.keys(CLASIFICACIONES).map((k) => [k, 0]))
  for (const f of filas) if (f.clasificacion) c[f.clasificacion] += 1
  return c
}

/** % por corregir de UNA campaña (null si no tiene detalle del webhook). */
export function porCorregirCampana(campana, resumen = null) {
  const r = resumen?.campanas?.[campana.id]
  return r ? porcentaje(r.status?.CORREGIR ?? 0, campana.totales?.enviados) : null
}

/** Número con separador de miles. */
export const numero = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-GT') : '—')
/** Porcentaje con un decimal (el número y el «%» no se separan de línea), o «—» si no se puede calcular. */
export const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('es-GT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`)
