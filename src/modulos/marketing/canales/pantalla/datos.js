// Marketing por canales · reglas y formatos de la pantalla, en UN solo lugar.
// No recalcula métricas: todas las cifras vienen ya calculadas de /api/marketing/mailing
// (server/marketingCanales/calculos.js). Aquí solo se decide cómo mostrarlas.
// Documentación: docs/marketing-canales/README.md

/** Las dos formas de ver las cifras (selector de la pantalla). */
export const VISTAS = {
  metricas: { key: 'metricas', label: 'Sin internos (oficial)', corto: 'Sin internos' },
  totalBrevo: { key: 'totalBrevo', label: 'Total en Brevo', corto: 'Total en Brevo' },
}

/**
 * Semáforo de "Salud del envío" (D22). Rojo solo para lo crítico.
 * Rebotes: % sobre ENVIADOS. Bajas y quejas: % sobre ENTREGADOS (solo quien recibió el correo puede darse de baja o quejarse).
 * - Rebote permanente: verde < 2 %, amarillo 2 % a < 5 %, rojo ≥ 5 %.
 * - Rebote temporal: verde < 10 %, amarillo ≥ 10 % (nunca rojo).
 * - Quejas: verde 0, amarillo si hay alguna por debajo de 0.1 %, rojo ≥ 0.1 %.
 * - Bajas: verde < 1 %, amarillo ≥ 1 % (nunca rojo).
 */
export const UMBRALES = {
  rebotesPermanentes: { amarillo: 0.02, rojo: 0.05, base: 'enviados' },
  rebotesTemporales: { amarillo: 0.10, rojo: null, base: 'enviados' },
  quejas: { amarillo: null, rojo: 0.001, base: 'entregados' }, // amarillo: cualquier queja (ver tonoRiesgo)
  bajas: { amarillo: 0.01, rojo: null, base: 'entregados' },
}

/** Proporción sobre enviados (0 a 1), o null si no hay envíos. */
export function sobreEnviados(m, campo) {
  return m && m.enviados > 0 ? m[campo] / m.enviados : null
}

/** Proporción de una métrica de riesgo sobre su base (enviados o entregados, según UMBRALES). */
export function sobreBase(m, campo) {
  const base = UMBRALES[campo]?.base ?? 'enviados'
  return m && m[base] > 0 ? m[campo] / m[base] : null
}

/**
 * Anillos de "Métricas de interacción" (D26): rangos de REFERENCIA general B2B, sin huecos.
 * NO son la meta de RED. Se evalúa el mismo % que se ve (1 decimal).
 * - Excelente ≥ excelente · Promedio ≥ promedio y < excelente · Bajo < promedio.
 * - Solo la entrega tiene "Crítico" (rojo): < 90 %.
 */
export const REFERENCIAS = {
  pctEntrega: { nombre: 'Entrega', excelente: 0.98, promedio: 0.95, critico: 0.90 },
  pctApertura: { nombre: 'Apertura', excelente: 0.30, promedio: 0.20, critico: null },
  pctClic: { nombre: 'CTR', excelente: 0.05, promedio: 0.02, critico: null },
  pctCtor: { nombre: 'CTOR', excelente: 0.20, promedio: 0.10, critico: null },
}
export const NOTA_REFERENCIA = 'Referencia general B2B, no es la meta de RED.'

export const NIVELES = {
  excelente: { texto: 'Excelente', tono: 'verde' },
  promedio: { texto: 'Promedio', tono: 'azul' },
  bajo: { texto: 'Bajo', tono: 'amarillo' },
  critico: { texto: 'Crítico', tono: 'rojo' },
  pocos: { texto: 'Pocos datos', tono: 'pocos' },
}

/** Nivel de un % frente a su referencia: 'excelente' | 'promedio' | 'bajo' | 'critico' | 'pocos'. */
export function evaluar(campo, p) {
  const r = REFERENCIAS[campo]
  if (p == null || !Number.isFinite(p)) return 'pocos'
  const visto = Math.round(p * 1000) / 1000
  if (r.critico != null && visto < r.critico) return 'critico'
  if (visto >= r.excelente) return 'excelente'
  if (visto >= r.promedio) return 'promedio'
  return 'bajo'
}

const pctUmbral = (p) => `${Number((p * 100).toFixed(1))} %`
/** Texto de los rangos visibles, p. ej. "Excelente ≥ 98 % · Promedio 95–98 % · Bajo < 95 % · Crítico < 90 %". */
export function textoRangos(campo) {
  const r = REFERENCIAS[campo]
  const partes = [
    `Excelente ≥ ${pctUmbral(r.excelente)}`,
    `Promedio ${Number((r.promedio * 100).toFixed(1))}–${pctUmbral(r.excelente)}`,
    `Bajo < ${pctUmbral(r.promedio)}`,
  ]
  if (r.critico != null) partes.push(`Crítico < ${pctUmbral(r.critico)}`)
  return partes
}

/**
 * Color del semáforo para una métrica de riesgo: 'verde' | 'amarillo' | 'rojo' | 'pocos'.
 * Con pocos datos (menos de 5 entregados, regla del servidor) no se colorea.
 * Se compara el MISMO porcentaje que se ve en pantalla (1 decimal): si dice "10.0 %", ya es 10 %.
 * Quejas: cualquier queja es amarillo, aunque el porcentaje redondeado dé 0.0 %.
 */
export function tonoRiesgo(m, campo) {
  if (!m || m.pocosDatos) return 'pocos'
  const u = UMBRALES[campo]
  const p = sobreBase(m, campo)
  if (p == null) return 'pocos'
  const visto = Math.round(p * 1000) / 1000
  if (u.rojo != null && visto >= u.rojo) return 'rojo'
  if (campo === 'quejas' ? m.quejas > 0 : visto >= u.amarillo) return 'amarillo'
  return 'verde'
}

const ORDEN_TONO = { pocos: 0, verde: 1, amarillo: 2, rojo: 3 }
/** El peor de varios tonos (para tarjetas que juntan dos métricas). */
export const peorTono = (...tonos) => tonos.reduce((a, b) => (ORDEN_TONO[b] > ORDEN_TONO[a] ? b : a), 'pocos')

export const TEXTO_TONO = { verde: 'Bien', amarillo: 'Atención', rojo: 'Crítico', pocos: 'Pocos datos' }

// ---------------------------------------------------------------- formatos

const numero = new Intl.NumberFormat('es-GT')
export const formatoNumero = (n) => (n == null ? '—' : numero.format(n))

/** 0.2033 → "20.3 %". null → "—". */
export function formatoPct(p, decimales = 1) {
  if (p == null || !Number.isFinite(p)) return '—'
  return `${(p * 100).toFixed(decimales)} %`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/**
 * Fecha de envío para la pantalla. Sale SIEMPRE de fechaEnvio (Send_Date), nunca del nombre de la campaña.
 * Se lee el texto tal cual ("2026-11-11T15:37:10" → "11/11/2026"), sin convertir zona horaria.
 */
export function formatoFechaEnvio(fechaEnvio, { conHora = false } = {}) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(fechaEnvio ?? '')
  if (!m) return '—'
  const fecha = `${m[3]}/${m[2]}/${m[1]}`
  return conHora && m[4] ? `${fecha} ${m[4]}:${m[5]}` : fecha
}

/** "2026-11" → "nov 2026" (corto) o "noviembre 2026" (largo). */
export function formatoMes(mes, largo = false) {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? '')
  if (!m) return mes ?? '—'
  return `${(largo ? MESES_LARGOS : MESES)[Number(m[2]) - 1]} ${m[1]}`
}

/** Fecha y hora de una marca ISO del servidor ("2026-11-16T16:42:00.000Z") en hora local del navegador. */
export function formatoLectura(iso) {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}

// ---------------------------------------------------------------- datos derivados (sin recalcular)

/**
 * Bloque de cifras según la vista elegida.
 * - Campaña: { metricas, totalBrevo } → "Sin internos" = campana.metricas.
 * - Mes o total: las cifras sin internos están en el mismo objeto, y "Total en Brevo" en .totalBrevo.
 */
export function bloque(objeto, vista) {
  if (!objeto) return null
  if (vista === 'totalBrevo') return objeto.totalBrevo
  return objeto.metricas ?? objeto
}

/** Campañas que cuentan (las de prueba van aparte, en "Exclusiones"). */
export const campanasIncluidas = (datos) => (datos?.campanas ?? []).filter((c) => !c.excluida)

/** Último mes con campañas que cuentan, para la tarjeta "Campañas del mes". */
export function ultimoMes(datos) {
  const meses = datos?.meses ?? []
  return meses.length ? meses[meses.length - 1] : null
}

/** Porcentaje de envíos con país "Desconocido" (sin internos), para el aviso de países. */
export function pctPaisDesconocido(datos) {
  const t = datos?.totales
  if (!t || !t.enviados) return null
  return t.porPais?.Desconocido?.enviados / t.enviados
}

/** Campañas del último mes con datos (para la tarjeta "Campañas del mes"). */
export function campanasDelMes(datos, mes) {
  return campanasIncluidas(datos).filter((c) => c.mes === mes)
}

// ---------------------------------------------------------------- estados con los nombres del portal
// ok = verde (bien/excelente) · info = azul (promedio/neutro) · warn = amarillo (atención/bajo)
// bad = rojo (SOLO crítico) · na = gris (pendiente / pocos datos)

export const ESTADO_NIVEL = { excelente: 'ok', promedio: 'info', bajo: 'warn', critico: 'bad', pocos: 'na' }
export const ESTADO_RIESGO = { verde: 'ok', amarillo: 'warn', rojo: 'bad', pocos: 'na' }

/** Muestra de una campaña según sus entregados (D31): Alta ≥ 15 · Media 5–14 · Baja < 5. */
export const MUESTRA = { alta: 15, media: 5 }
export function nivelMuestra(entregados) {
  if (entregados >= MUESTRA.alta) return { texto: 'Alta', estado: 'ok' }
  if (entregados >= MUESTRA.media) return { texto: 'Media', estado: 'info' }
  return { texto: 'Baja', estado: 'warn' }
}

// ---------------------------------------------------------------- filtros de la página (D29)

/**
 * Filtros de la página. Formato estándar del portal (D35):
 * - país: Todos, GT, SV o sin país (se aplica al instante);
 * - desde / hasta: Período (se aplica al instante);
 * - cargos: null = todos, o la lista de cargos marcados en el panel "Filtros" (se aplica con "Aplicar");
 * - quitadas: campañas desmarcadas en la columna "Campañas" del panel (se aplica con "Aplicar").
 */
export const FILTROS_VACIOS = { pais: 'todos', desde: '', hasta: '', cargos: null, quitadas: [] }

export function periodoMesActualGT() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (t) => parts.find((p) => p.type === t)?.value || ''
  const y = get('year')
  const m = get('month')
  const d = get('day')
  if (!y || !m || !d) return { desde: '', hasta: '' }
  return { desde: `${y}-${m}-01`, hasta: `${y}-${m}-${d}` }
}

export function filtrosIniciales() {
  return { ...FILTROS_VACIOS, ...periodoMesActualGT() }
}

export const PAISES_FILTRO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'GT', etiqueta: 'GT' },
  { valor: 'SV', etiqueta: 'SV' },
  { valor: 'sin-pais', etiqueta: 'Sin país' },
]

/** "2026-11-11" → "11/11/2026". */
export const fechaCorta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

/**
 * Campañas que pasan el período y el cargo (las que se ofrecen como chips).
 * El período compara la FECHA DE ENVÍO (Send_Date) de la campaña. Las de prueba nunca se ofrecen.
 */
export function campanasCandidatas(disponibles, filtros) {
  return (disponibles ?? []).filter((c) => {
    if (c.excluida) return false
    const dia = c.fechaEnvio.slice(0, 10)
    if (filtros.desde && dia < filtros.desde) return false
    if (filtros.hasta && dia > filtros.hasta) return false
    if (filtros.cargos && !filtros.cargos.includes(c.cargo)) return false
    return true
  })
}

/** Cargos que existen entre las campañas que cuentan (para la columna "Cargo" del panel). */
export const cargosDisponibles = (disponibles) => [...new Set((disponibles ?? []).filter((c) => !c.excluida).map((c) => c.cargo))]

/** Campañas elegidas = candidatas menos las que se quitaron en el filtro de campañas. */
export const campanasElegidas = (disponibles, filtros) => campanasCandidatas(disponibles, filtros).filter((c) => !filtros.quitadas.includes(c.id))

/**
 * Valor de ?campanas= para el servidor: null si están TODAS las campañas que cuentan (sin filtro),
 * o la lista de ids elegidos. El servidor calcula los totales; la pantalla solo dice cuáles.
 */
export function parametroCampanas(disponibles, filtros) {
  const todas = (disponibles ?? []).filter((c) => !c.excluida)
  const elegidas = campanasElegidas(disponibles, filtros)
  return elegidas.length === todas.length ? null : elegidas.map((c) => c.id).join(',')
}

/**
 * Explicaciones que no vienen del servidor (reglas de la pantalla). Las usan "¿Cómo se calcula?" en
 * pantalla y en el PDF, para que digan exactamente lo mismo.
 * @returns {[string, string][]}
 */
export function DEFINICIONES_EXTRA(reglas) {
  return [
    ['Pocos datos', `Con menos de ${reglas.minimoEntregados} entregados no se calculan apertura, CTR ni semáforo; el CTOR necesita al menos ${reglas.minimoEntregados} aperturas reales.`],
    ['Anillos (Excelente / Promedio / Bajo)', `${NOTA_REFERENCIA} Excelente en verde, Promedio en azul, Bajo en amarillo. Rojo solo si la entrega es menor a 90 % (crítico).`],
    ['Salud del envío', `Entregados + rebote permanente + rebote temporal (+ sin estado) = 100 % de lo enviado. Apertura automática, bajas y quejas son de los entregados y no se suman. Rojo solo para lo crítico: rebote permanente desde ${UMBRALES.rebotesPermanentes.rojo * 100} % o quejas desde ${UMBRALES.quejas.rojo * 100} % de los entregados.`],
    ['Muestra', `Alta: ${MUESTRA.alta} o más entregados · Media: ${MUESTRA.media} a ${MUESTRA.alta - 1} · Baja: menos de ${MUESTRA.media}.`],
    ['Filtros', 'Período (por fecha de envío de la campaña), cargo y campañas eligen QUÉ campañas entran; el servidor recalcula todos los totales con esas campañas.'],
    ['Campañas de prueba', `El nombre contiene ${reglas.patronesCampanaPrueba.map((p) => `"${p}"`).join(', ')} como palabra completa (sin importar mayúsculas ni tildes).`],
    ['Correos internos', `Dominios ${reglas.dominiosInternos.join(', ')} y sus subdominios.`],
    ['Asunto, territorio y vendedor', 'El reporte de Brevo no los trae. Se llenarán con el catálogo de campañas (pendiente).'],
  ]
}

/** ¿Hay algún filtro puesto? */
export const hayFiltros = (f) => Boolean((f.pais && f.pais !== 'todos') || f.desde || f.hasta || f.cargos || f.quitadas.length)

/** Cantidad de filtros activos DENTRO del panel "Filtros" (número del botón): cargo y campañas. */
export const filtrosEnPanel = (f) => (f.cargos ? 1 : 0) + (f.quitadas.length ? 1 : 0)

/**
 * Textos de los filtros activos, para la franja "Filtro activo", la línea de resumen y los chips del PDF.
 * @returns {{ cifras: string, pais: string, periodo: string, cargo: string|null, campanas: string|null, campanasDetalle: string|null }}
 */
export function textosFiltros({ vista, filtros, disponibles }) {
  const todas = (disponibles ?? []).filter((c) => !c.excluida)
  const elegidas = campanasElegidas(disponibles, filtros)
  const hayPeriodo = filtros.desde || filtros.hasta
  const pais = PAISES_FILTRO.find((p) => p.valor === (filtros.pais ?? 'todos'))?.etiqueta ?? 'Todos'
  return {
    cifras: VISTAS[vista].label,
    pais,
    periodo: hayPeriodo ? `${fechaCorta(filtros.desde) || 'inicio'} – ${fechaCorta(filtros.hasta) || 'hoy'}` : 'Todo el histórico',
    cargo: filtros.cargos ? (filtros.cargos.length ? filtros.cargos.join(', ') : 'Ninguno') : null,
    campanas: elegidas.length === todas.length ? null : `${elegidas.length} de ${todas.length}`,
    campanasDetalle: elegidas.length === todas.length ? null : elegidas.map((c) => `#${c.id} ${c.nombre}`).join(' · ') || 'Ninguna',
  }
}

/** Criterios del ranking: % más alto = mejor, salvo el rebote permanente (más bajo = mejor). */
export const CRITERIOS_RANKING = {
  pctApertura: { label: '% apertura', mayorEsMejor: true },
  pctClic: { label: 'CTR', mayorEsMejor: true },
  pctCtor: { label: 'CTOR', mayorEsMejor: true },
  rebotesPermanentes: { label: 'Rebote permanente', mayorEsMejor: false },
}

/** Valor con el que se ordena una campaña (null = pocos datos). */
export function valorRanking(m, criterio) {
  if (criterio === 'rebotesPermanentes') return m.pocosDatos ? null : sobreEnviados(m, 'rebotesPermanentes')
  return m[criterio]
}

/**
 * Ordena campañas para el ranking. "mejores": de la mejor a la peor; "peores": al revés.
 * Las que tienen pocos datos van SIEMPRE al final. Empate: la más reciente primero.
 */
export function ordenarRanking(campanas, vista, criterio, sentido = 'mejores') {
  const { mayorEsMejor } = CRITERIOS_RANKING[criterio]
  const signo = (mayorEsMejor ? -1 : 1) * (sentido === 'mejores' ? 1 : -1)
  return [...campanas].sort((a, b) => {
    const va = valorRanking(bloque(a, vista), criterio)
    const vb = valorRanking(bloque(b, vista), criterio)
    if (va == null || vb == null) return (va == null) - (vb == null)
    return signo * (va - vb) || b.fechaEnvio.localeCompare(a.fechaEnvio)
  })
}


/** Asunto de la campaña: pendiente hasta que exista el catálogo de campañas. */
export const ASUNTO_PENDIENTE = 'Pendiente (catálogo)'
export const asuntoDe = (campana) => campana?.asunto || ASUNTO_PENDIENTE

/** Etiquetas de pantalla para cada definición que entrega el servidor (reglas.definiciones). */
export const ETIQUETAS = {
  enviados: 'Enviados',
  estadoFinal: 'Entregado o rebote (estado final)',
  entregados: 'Entregados',
  rebotesTemporales: 'Rebotes temporales',
  rebotesPermanentes: 'Rebotes permanentes',
  entregadosLuegoRebotados: 'Entregados y luego rebotados',
  sinEstado: 'Sin estado',
  aperturasReales: 'Aperturas reales',
  aperturasDeRebotados: 'Aperturas de quienes luego rebotaron',
  soloAperturaAutomatica: 'Solo apertura automática',
  personasConClic: 'Personas con clic',
  totalAperturasBrevo: 'Aperturas totales (incluye repetidas y automáticas)',
  totalClicsBrevo: 'Clics en enlaces distintos',
  bajas: 'Bajas',
  quejas: 'Quejas',
  pctEntrega: 'Entrega',
  pctApertura: '% de apertura',
  pctClic: 'CTR (% de clic)',
  pctCtor: 'CTOR',
  cargo: 'Cargo',
  destacados: 'Mejor campaña, mejor cargo, peor entrega y mejor país',
  totalBrevo: 'Total en Brevo',
  metricas: 'Sin internos (oficial)',
  mes: 'Mes',
  pais: 'País',
}
