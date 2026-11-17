/**
 * Marketing por canales — CÁLCULOS de mailing.
 *
 * Recibe filas en el formato estándar (ver brevoCsv.js) y NO sabe de dónde vienen.
 * Devuelve solo totales: ningún correo ni dato personal sale de aquí.
 * Reglas editables (pruebas, internos, país, mínimo de datos): reglas.js
 * Explicación para usuarios: docs/marketing-canales/README.md
 */
import {
  CARGOS,
  DOMINIOS_INTERNOS,
  MINIMO_ENTREGADOS,
  PAISES,
  PATRONES_CAMPANA_PRUEBA,
  SIN_CARGO,
  cargoDeCampana,
  esCorreoInterno,
  paisDeCorreo,
  patronDePrueba,
} from './reglas.js'
import { FECHA_ILEGIBLE } from './filaEstandar.js'

/** Texto de cada métrica: la API lo entrega para que la pantalla explique el cálculo igual. */
export const DEFINICIONES = {
  enviados: 'Personas a las que se envió la campaña (una fila del reporte = una persona). Enviados = entregados + rebotes temporales + rebotes permanentes + sin estado.',
  estadoFinal: 'Cada persona queda en un solo estado: gana el ÚLTIMO evento con fecha entre entrega, rebote temporal y rebote permanente. Si un rebote tiene la misma hora que la entrega, o una fecha no se entiende, gana el rebote.',
  entregados: 'Lo último que pasó fue la entrega. Es la base de los porcentajes, igual que en Brevo.',
  rebotesTemporales: 'Lo último que pasó fue un rebote temporal (buzón lleno, servidor caído…), aunque antes se haya entregado.',
  rebotesPermanentes: 'Lo último que pasó fue un rebote permanente (el correo no existe o lo rechaza siempre).',
  entregadosLuegoRebotados: 'Tenían fecha de entrega, pero después rebotaron. Ya están contados en los rebotes; es solo informativo.',
  sinEstado: 'Sin fecha de entrega ni de rebote.',
  aperturasReales: 'Personas que abrieron el correo (Brevo registró cuándo lo abrieron). Se cuentan aunque después hayan rebotado.',
  aperturasDeRebotados: 'Personas que abrieron el correo y luego terminaron en rebote. Están dentro de las aperturas reales.',
  soloAperturaAutomatica: 'Sin fecha de apertura pero con aperturas automáticas del iPhone (una función de privacidad de Apple abre el correo sola). No cuenta como apertura real.',
  personasConClic: 'Personas con al menos un clic en un enlace. Pueden incluir clics automáticos de antivirus (algunos revisan los enlaces antes de que la persona abra el correo).',
  totalAperturasBrevo: 'Aperturas totales (incluye repetidas y automáticas): suma de todas las veces que se abrió el correo, contando repeticiones y aperturas automáticas del iPhone. No coincide con la pantalla de Brevo, que usa otra fórmula.',
  totalClicsBrevo: 'Clics en enlaces distintos: suma de los enlaces distintos en los que hizo clic cada persona. Por eso puede ser mayor que las personas con clic. No coincide con la pantalla de Brevo, que usa otra fórmula.',
  bajas: 'Personas que se dieron de baja de la lista de correos.',
  quejas: 'Personas que marcaron el correo como spam.',
  pctApertura: `Aperturas reales ÷ entregados. Con menos de ${MINIMO_ENTREGADOS} entregados se muestra "pocos datos". Si alguien abrió y luego rebotó, se indica en una nota junto al % de apertura.`,
  pctEntrega: `Entrega: entregados ÷ enviados. Con menos de ${MINIMO_ENTREGADOS} enviados se muestra "pocos datos".`,
  pctClic: `CTR (clics sobre entregados): personas con clic ÷ entregados. Con menos de ${MINIMO_ENTREGADOS} entregados se muestra "pocos datos".`,
  pctCtor: `CTOR (clics sobre aperturas): personas con clic ÷ aperturas reales. Dice qué tan atractivo fue el contenido para quienes sí abrieron. Con menos de ${MINIMO_ENTREGADOS} aperturas reales se muestra "pocos datos".`,
  destacados: 'Mejor campaña y mejor cargo: mayor % de apertura entre los que tienen al menos 5 entregados (si empatan, el de más entregados). Peor entrega: menor % de entrega. Mejor país: solo Guatemala y El Salvador; si más del 50 % de los envíos tiene país "Desconocido", dice "Pocos datos".',
  cargo: 'Cargo al que va dirigida la campaña, tomado del nombre de la campaña (Gerente General, Financiero u Operativo) mientras no exista el catálogo de campañas.',
  totalBrevo: 'Todas las filas del reporte, incluidos los correos internos de RED. Sirve para comparar con lo que muestra Brevo.',
  metricas: 'Sin correos internos de RED. Es la cifra que se usa en porcentajes, totales y meses.',
  mes: 'Mes de la primera fecha de envío de la campaña.',
  pais: 'Por la terminación del correo: .gt = Guatemala, .sv = El Salvador; lo demás (.com, .net…) = Desconocido.',
}

const CONTADORES = [
  'enviados', 'entregados', 'rebotesTemporales', 'rebotesPermanentes', 'sinEstado', 'entregadosLuegoRebotados',
  'aperturasReales', 'aperturasDeRebotados', 'aperturasDeRebotadosTemporales', 'soloAperturaAutomatica',
  'personasConClic', 'totalAperturasBrevo', 'totalClicsBrevo', 'bajas', 'quejas',
]

function metricasVacias() {
  return Object.fromEntries(CONTADORES.map((c) => [c, 0]))
}

/**
 * Estado final de una persona (D21): gana el ÚLTIMO evento con fecha.
 * Empate de hora → gana el rebote (y entre rebotes, el permanente).
 * Si alguna fecha es ilegible y hay un rebote → gana el rebote (permanente antes que temporal).
 * @returns {'entregado'|'temporal'|'permanente'|'sinEstado'}
 */
export function estadoFinal(f) {
  const eventos = [
    ['entregado', f.fechaEntrega, 0],
    ['temporal', f.fechaReboteSuave, 1],
    ['permanente', f.fechaReboteDuro, 2],
  ].filter(([, fecha]) => fecha != null)
  if (eventos.length === 0) return 'sinEstado'
  if (eventos.some(([, fecha]) => fecha === FECHA_ILEGIBLE)) {
    if (f.fechaReboteDuro != null) return 'permanente'
    if (f.fechaReboteSuave != null) return 'temporal'
    return 'entregado'
  }
  eventos.sort((a, b) => a[1].localeCompare(b[1]) || a[2] - b[2])
  return eventos[eventos.length - 1][0]
}

function sumarFila(m, f) {
  const estado = estadoFinal(f)
  const reboto = estado === 'temporal' || estado === 'permanente'
  m.enviados += 1
  if (estado === 'entregado') m.entregados += 1
  if (estado === 'temporal') m.rebotesTemporales += 1
  if (estado === 'permanente') m.rebotesPermanentes += 1
  if (estado === 'sinEstado') m.sinEstado += 1
  if (reboto && f.fechaEntrega != null) m.entregadosLuegoRebotados += 1
  if (f.aperturaReal) m.aperturasReales += 1
  if (f.aperturaReal && reboto) m.aperturasDeRebotados += 1
  if (f.aperturaReal && estado === 'temporal') m.aperturasDeRebotadosTemporales += 1
  if (!f.aperturaReal && f.aperturasApple > 0) m.soloAperturaAutomatica += 1
  if (f.clicsTotales > 0) m.personasConClic += 1
  m.totalAperturasBrevo += f.aperturasTotales
  m.totalClicsBrevo += f.clicsTotales
  if (f.baja) m.bajas += 1
  if (f.queja) m.quejas += 1
}

function sumarMetricas(m, otra) {
  for (const c of CONTADORES) m[c] += otra[c]
}

/**
 * Nota visible junto al "% de apertura" cuando alguien abrió y luego rebotó (número calculado).
 * Ej.: "Incluye 4 personas que abrieron el correo y luego tuvieron un rebote temporal".
 */
function notaApertura(m) {
  const n = m.aperturasDeRebotados
  if (n === 0) return null
  const tipo = n === m.aperturasDeRebotadosTemporales ? 'un rebote temporal' : m.aperturasDeRebotadosTemporales === 0 ? 'un rebote permanente' : 'un rebote'
  return n === 1
    ? `Incluye 1 persona que abrió el correo y luego tuvo ${tipo}`
    : `Incluye ${n} personas que abrieron el correo y luego tuvieron ${tipo}`
}

const proporcion = (n, base) => Math.round((n / base) * 10000) / 10000

/**
 * Agrega los porcentajes (proporción de 0 a 1, 4 decimales) o null si hay pocos datos:
 * - pctEntrega = entregados ÷ enviados (null con menos de 5 enviados);
 * - pctApertura y pctClic (CTR) = ÷ entregados (null con menos de 5 entregados: pocosDatos);
 * - pctCtor = personas con clic ÷ aperturas reales (null con pocosDatos o menos de 5 aperturas reales: pocosDatosCtor).
 */
function conPorcentajes(m) {
  const pocosDatos = m.entregados < MINIMO_ENTREGADOS
  const pocosDatosCtor = pocosDatos || m.aperturasReales < MINIMO_ENTREGADOS
  const pct = (n) => (pocosDatos ? null : proporcion(n, m.entregados))
  return {
    ...m,
    pctEntrega: m.enviados < MINIMO_ENTREGADOS ? null : proporcion(m.entregados, m.enviados),
    pctApertura: pct(m.aperturasReales),
    pctClic: pct(m.personasConClic),
    pctCtor: pocosDatosCtor ? null : proporcion(m.personasConClic, m.aperturasReales),
    pocosDatos,
    pocosDatosCtor,
    notaPctApertura: notaApertura(m),
  }
}

const porPaisVacio = () => Object.fromEntries(PAISES.map((p) => [p, metricasVacias()]))
const cerrarPorPais = (pp) => Object.fromEntries(PAISES.map((p) => [p, conPorcentajes(pp[p])]))

/** Más del 50 % de envíos con país "Desconocido" → no se elige "Mejor país" (D30). */
export const MAXIMO_PAIS_DESCONOCIDO = 0.5

/**
 * Destacados de una vista ('metricas' = sin internos, 'totalBrevo'). Solo ELIGE entre cifras ya calculadas:
 * - mejorCampana: mayor % de apertura entre campañas con ≥ 5 entregados (empate: más entregados).
 * - mejorCargo: igual, entre cargos (sin "Sin cargo").
 * - peorEntrega: menor % de entrega (empate: más enviados).
 * - mejorPais: mayor % de apertura entre Guatemala y El Salvador, salvo que más del 50 % de los envíos
 *   tenga país "Desconocido" → pocosDatos. El país se mide siempre sin internos.
 */
function calcularDestacados(incluidas, porCargo, totales, vista) {
  const de = (o) => (vista === 'totalBrevo' ? o.totalBrevo : o.metricas ?? o)
  const mejor = (lista, campo, mayor = true) => lista
    .filter((x) => de(x)[campo] != null)
    .sort((a, b) => (mayor ? de(b)[campo] - de(a)[campo] : de(a)[campo] - de(b)[campo])
      || (campo === 'pctEntrega' ? de(b).enviados - de(a).enviados : de(b).entregados - de(a).entregados))[0] ?? null
  const campana = (c, extra) => c && { id: c.id, nombre: c.nombre, cargo: c.cargo, entregados: de(c).entregados, enviados: de(c).enviados, ...extra(de(c)) }

  const mc = mejor(incluidas, 'pctApertura')
  const cg = mejor(porCargo.filter((g) => g.cargo !== SIN_CARGO), 'pctApertura')
  const pe = mejor(incluidas, 'pctEntrega', false)

  const desconocidos = totales.enviados ? totales.porPais.Desconocido.enviados / totales.enviados : null
  let mejorPais = null
  if (desconocidos != null) {
    const pctDesconocido = Math.round(desconocidos * 10000) / 10000
    if (desconocidos > MAXIMO_PAIS_DESCONOCIDO) mejorPais = { pocosDatos: true, pctDesconocido }
    else {
      const p = PAISES.filter((x) => x !== 'Desconocido' && totales.porPais[x].pctApertura != null)
        .sort((a, b) => totales.porPais[b].pctApertura - totales.porPais[a].pctApertura)[0]
      mejorPais = p ? { pocosDatos: false, pais: p, pctApertura: totales.porPais[p].pctApertura, pctDesconocido } : { pocosDatos: true, pctDesconocido }
    }
  }

  return {
    mejorCampana: campana(mc, (m) => ({ pctApertura: m.pctApertura })),
    mejorCargo: cg && { cargo: cg.cargo, pctApertura: de(cg).pctApertura, entregados: de(cg).entregados },
    peorEntrega: campana(pe, (m) => ({ pctEntrega: m.pctEntrega })),
    mejorPais,
  }
}

/**
 * @param {object[]} filas  filas estándar del canal mailing
 * @param {{ soloCampanas?: Set<string> | null }} [opciones]  filtro de la pantalla (D29)
 */
export function calcularMailing(filas, { soloCampanas = null } = {}) {
  // 1. Agrupar por campaña; una persona cuenta una sola vez por campaña (se queda la primera fila).
  const grupos = new Map()
  for (const f of filas) {
    if (f.canal !== 'mailing') continue
    let g = grupos.get(f.campanaId)
    if (!g) { g = { id: f.campanaId, nombre: f.campanaNombre, filas: [], correos: new Set(), duplicados: 0 }; grupos.set(f.campanaId, g) }
    if (g.correos.has(f.correo)) { g.duplicados += 1; continue }
    g.correos.add(f.correo)
    g.filas.push(f)
  }

  // 2. Métricas por campaña.
  const todas = [...grupos.values()].map((g) => {
    const total = metricasVacias()
    const sinInternos = metricasVacias()
    const internos = metricasVacias()
    const porPais = porPaisVacio()
    let fechaEnvio = null
    for (const f of g.filas) {
      if (!fechaEnvio || f.fechaEnvio < fechaEnvio) fechaEnvio = f.fechaEnvio
      sumarFila(total, f)
      if (esCorreoInterno(f.correo)) { sumarFila(internos, f); continue }
      sumarFila(sinInternos, f)
      sumarFila(porPais[paisDeCorreo(f.correo)], f)
    }
    const patron = patronDePrueba(g.nombre)
    return {
      id: g.id,
      nombre: g.nombre,
      fechaEnvio,
      mes: fechaEnvio.slice(0, 7),
      cargo: cargoDeCampana(g.nombre),
      excluida: patron !== null,
      motivoExclusion: patron ? `Campaña de prueba: el nombre coincide con "${patron}".` : null,
      destinatariosInternos: { enviados: internos.enviados, aperturasReales: internos.aperturasReales, personasConClic: internos.personasConClic },
      duplicadosDescartados: g.duplicados,
      totalBrevo: conPorcentajes(total),
      metricas: conPorcentajes(sinInternos),
      porPais: cerrarPorPais(porPais),
    }
  })
  todas.sort((a, b) => b.fechaEnvio.localeCompare(a.fechaEnvio) || b.id.localeCompare(a.id, undefined, { numeric: true }))

  // 2b. Filtro de la pantalla (D29): solo las campañas pedidas. Los cálculos son los mismos;
  //     solo cambia QUÉ campañas entran en meses, cargos, totales y destacados.
  //     "disponibles" lista SIEMPRE todas, para dibujar los filtros.
  const campanas = soloCampanas ? todas.filter((c) => soloCampanas.has(c.id)) : todas
  const disponibles = todas.map((c) => ({ id: c.id, nombre: c.nombre, fechaEnvio: c.fechaEnvio, mes: c.mes, cargo: c.cargo, excluida: c.excluida }))

  // 3. Totales por mes y generales: solo campañas NO excluidas.
  //    Cifra oficial = sin internos; además se entrega "totalBrevo" (con internos) para el selector de la pantalla.
  const incluidas = campanas.filter((c) => !c.excluida)
  const meses = new Map()
  const totales = { campanas: 0, ...metricasVacias() }
  const totalesBrevo = metricasVacias()
  const totalesPorPais = porPaisVacio()
  const cargos = new Map() // en el orden de CARGOS; "Sin cargo" al final
  for (const { cargo } of [...CARGOS, { cargo: SIN_CARGO }]) cargos.set(cargo, { cargo, campanas: 0, ...metricasVacias(), brevo: metricasVacias() })
  for (const c of incluidas) {
    if (!meses.has(c.mes)) meses.set(c.mes, { mes: c.mes, campanas: 0, ...metricasVacias(), brevo: metricasVacias() })
    for (const grupo of [meses.get(c.mes), cargos.get(c.cargo)]) {
      grupo.campanas += 1
      sumarMetricas(grupo, c.metricas)
      sumarMetricas(grupo.brevo, c.totalBrevo)
    }
    totales.campanas += 1
    sumarMetricas(totales, c.metricas)
    sumarMetricas(totalesBrevo, c.totalBrevo)
    for (const p of PAISES) sumarMetricas(totalesPorPais[p], c.porPais[p])
  }
  const cerrarGrupo = ({ brevo, ...m }) => ({ ...conPorcentajes(m), totalBrevo: { campanas: m.campanas, ...conPorcentajes(brevo) } })

  // Las campañas de prueba se informan siempre (todas), aunque haya filtro: no entran en los filtros.
  const pruebas = todas.filter((c) => c.excluida)
  const conInternos = incluidas.filter((c) => c.destinatariosInternos.enviados > 0)
  const sumaInternos = (campo) => conInternos.reduce((s, c) => s + c.destinatariosInternos[campo], 0)

  const porCargo = [...cargos.values()].filter((g) => g.campanas > 0).map(cerrarGrupo)
  const totalesCerrados = {
    ...conPorcentajes(totales),
    porPais: cerrarPorPais(totalesPorPais),
    totalBrevo: { campanas: totales.campanas, ...conPorcentajes(totalesBrevo) },
  }

  return {
    campanas,
    disponibles,
    filtro: {
      campanas: soloCampanas ? disponibles.filter((c) => soloCampanas.has(c.id)).map((c) => c.id) : null,
      noEncontradas: soloCampanas ? [...soloCampanas].filter((id) => !todas.some((c) => c.id === id)) : [],
    },
    meses: [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map(cerrarGrupo),
    // Por cargo (D27): solo cargos con campañas que cuentan.
    porCargo,
    totales: totalesCerrados,
    // Tarjetas "Mejor campaña", "Mejor cargo", "Peor entrega" y "Mejor país" (D30).
    destacados: {
      metricas: calcularDestacados(incluidas, porCargo, totalesCerrados, 'metricas'),
      totalBrevo: calcularDestacados(incluidas, porCargo, totalesCerrados, 'totalBrevo'),
    },
    exclusiones: {
      campanasPrueba: {
        cantidad: pruebas.length,
        enviados: pruebas.reduce((s, c) => s + c.totalBrevo.enviados, 0),
        lista: pruebas.map((c) => ({ id: c.id, nombre: c.nombre, fechaEnvio: c.fechaEnvio, motivo: c.motivoExclusion, enviados: c.totalBrevo.enviados })),
      },
      destinatariosInternos: {
        nota: 'Envíos a correos internos de RED dentro de campañas que sí cuentan. Se restan de "metricas", de los meses y de los totales.',
        enviados: sumaInternos('enviados'),
        aperturasReales: sumaInternos('aperturasReales'),
        personasConClic: sumaInternos('personasConClic'),
        porCampana: conInternos.map((c) => ({ id: c.id, nombre: c.nombre, ...c.destinatariosInternos })),
      },
      duplicadosDescartados: incluidas.reduce((s, c) => s + c.duplicadosDescartados, 0),
    },
    reglas: {
      patronesCampanaPrueba: PATRONES_CAMPANA_PRUEBA,
      dominiosInternos: DOMINIOS_INTERNOS,
      minimoEntregados: MINIMO_ENTREGADOS,
      definiciones: DEFINICIONES,
    },
  }
}
