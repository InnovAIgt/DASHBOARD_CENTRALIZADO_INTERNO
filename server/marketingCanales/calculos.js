/**
 * Marketing por canales — CÁLCULOS de mailing.
 *
 * Recibe filas en el formato estándar (ver brevoCsv.js) y NO sabe de dónde vienen.
 * Devuelve solo totales: ningún correo ni dato personal sale de aquí.
 * Reglas editables (pruebas, internos, país, mínimo de datos): reglas.js
 * Explicación para usuarios: docs/marketing-canales/README.md
 */
import {
  DOMINIOS_INTERNOS,
  MINIMO_ENTREGADOS,
  PAISES,
  PATRONES_CAMPANA_PRUEBA,
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
  aperturasReales: 'Personas con fecha de apertura (Open_Date). Se cuentan aunque después hayan rebotado.',
  aperturasDeRebotados: 'Personas que abrieron el correo y luego terminaron en rebote. Están dentro de las aperturas reales.',
  soloAperturaAutomatica: 'Sin fecha de apertura pero con aperturas de Apple (MPP): el teléfono abrió el correo solo. NO cuenta como apertura real.',
  personasConClic: 'Personas con al menos un clic en un enlace.',
  totalAperturasBrevo: 'Suma de "Total Opens": cuenta cada vez que se abrió, incluso varias veces por persona y las automáticas de Apple. Por eso es mayor que las aperturas reales.',
  totalClicsBrevo: 'Suma de "Clicked_Links_Count": cuenta cada enlace distinto en el que hizo clic cada persona. Por eso puede ser mayor que las personas con clic.',
  bajas: 'Personas que se dieron de baja (Unsubscribe_Date).',
  quejas: 'Personas que marcaron el correo como spam (Complaint_date).',
  pctApertura: `Aperturas reales ÷ entregados. Con menos de ${MINIMO_ENTREGADOS} entregados se muestra "pocos datos". Si alguien abrió y luego rebotó, se indica en notaPctApertura.`,
  pctClic: `Personas con clic ÷ entregados. Con menos de ${MINIMO_ENTREGADOS} entregados se muestra "pocos datos".`,
  totalBrevo: 'Todas las filas del reporte, incluidos los correos internos de RED. Sirve para comparar con lo que muestra Brevo.',
  metricas: 'Sin correos internos de RED. Es la cifra que se usa en porcentajes, totales y meses.',
  mes: 'Mes de la primera fecha de envío (Send_Date) de la campaña.',
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

/** Agrega los porcentajes (proporción de 0 a 1, 4 decimales) o null si hay pocos datos. */
function conPorcentajes(m) {
  const pocosDatos = m.entregados < MINIMO_ENTREGADOS
  const pct = (n) => (pocosDatos ? null : Math.round((n / m.entregados) * 10000) / 10000)
  return { ...m, pctApertura: pct(m.aperturasReales), pctClic: pct(m.personasConClic), pocosDatos, notaPctApertura: notaApertura(m) }
}

const porPaisVacio = () => Object.fromEntries(PAISES.map((p) => [p, metricasVacias()]))
const cerrarPorPais = (pp) => Object.fromEntries(PAISES.map((p) => [p, conPorcentajes(pp[p])]))

/**
 * @param {object[]} filas  filas estándar del canal mailing
 */
export function calcularMailing(filas) {
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
  const campanas = [...grupos.values()].map((g) => {
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
      excluida: patron !== null,
      motivoExclusion: patron ? `Campaña de prueba: el nombre coincide con "${patron}".` : null,
      destinatariosInternos: { enviados: internos.enviados, aperturasReales: internos.aperturasReales, personasConClic: internos.personasConClic },
      duplicadosDescartados: g.duplicados,
      totalBrevo: conPorcentajes(total),
      metricas: conPorcentajes(sinInternos),
      porPais: cerrarPorPais(porPais),
    }
  })
  campanas.sort((a, b) => b.fechaEnvio.localeCompare(a.fechaEnvio) || b.id.localeCompare(a.id, undefined, { numeric: true }))

  // 3. Totales por mes y generales: solo campañas NO excluidas, sin internos.
  const incluidas = campanas.filter((c) => !c.excluida)
  const meses = new Map()
  const totales = { campanas: 0, ...metricasVacias() }
  const totalesPorPais = porPaisVacio()
  for (const c of incluidas) {
    if (!meses.has(c.mes)) meses.set(c.mes, { mes: c.mes, campanas: 0, ...metricasVacias() })
    const m = meses.get(c.mes)
    m.campanas += 1
    sumarMetricas(m, c.metricas)
    totales.campanas += 1
    sumarMetricas(totales, c.metricas)
    for (const p of PAISES) sumarMetricas(totalesPorPais[p], c.porPais[p])
  }

  const pruebas = campanas.filter((c) => c.excluida)
  const conInternos = incluidas.filter((c) => c.destinatariosInternos.enviados > 0)
  const sumaInternos = (campo) => conInternos.reduce((s, c) => s + c.destinatariosInternos[campo], 0)

  return {
    campanas,
    meses: [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map(conPorcentajes),
    totales: { ...conPorcentajes(totales), porPais: cerrarPorPais(totalesPorPais) },
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
      duplicadosDescartados: campanas.reduce((s, c) => s + c.duplicadosDescartados, 0),
    },
    reglas: {
      patronesCampanaPrueba: PATRONES_CAMPANA_PRUEBA,
      dominiosInternos: DOMINIOS_INTERNOS,
      minimoEntregados: MINIMO_ENTREGADOS,
      definiciones: DEFINICIONES,
    },
  }
}
