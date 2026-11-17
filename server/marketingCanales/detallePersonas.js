/**
 * Marketing por canales — DETALLE POR PERSONA de una campaña (D34).
 *
 * ⚠️ Esta lista SÍ contiene correos de clientes. Solo se entrega por la ruta protegida
 * /api/marketing/mailing-detalle (server/marketingMailingDetalle.js), nunca por la ruta principal.
 *
 * Usa EXACTAMENTE las mismas reglas que los cálculos:
 * - una persona cuenta una vez por campaña (se queda la primera fila del correo);
 * - estado final = gana el último evento con fecha (estadoFinal, D21);
 * - país por terminación del correo (.gt / .sv); "Desconocido" se muestra como null ("—");
 * - "Sin internos" quita los correos internos; "Total en Brevo" los incluye marcados.
 * Y calcula el CUADRE: los números de la tarjeta (calcularMailing) contra los de la lista.
 */
import { calcularMailing, estadoFinal } from './calculos.js'
import { FECHA_ILEGIBLE } from './filaEstandar.js'
import { PAIS_DESCONOCIDO, esCorreoInterno, paisDeCorreo } from './reglas.js'

/**
 * Resultado de cada persona: uno solo, el primero que aplique en este orden.
 * (Rebotes y sin estado son su ESTADO FINAL; van antes que baja, clic y apertura.)
 */
export const RESULTADOS = [
  { clave: 'queja', texto: 'Queja' },
  { clave: 'permanente', texto: 'Rebote permanente' },
  { clave: 'temporal', texto: 'Rebote temporal' },
  { clave: 'sinEstado', texto: 'Sin estado' },
  { clave: 'baja', texto: 'Se dio de baja' },
  { clave: 'clic', texto: 'Hizo clic' },
  { clave: 'abrio', texto: 'Abrió (lectura real)' },
  { clave: 'automatico', texto: 'Abrió solo automático (iPhone)' },
  { clave: 'sinAbrir', texto: 'Entregado sin abrir' },
]

/** Campos del cuadre: deben ser iguales en la lista y en la tarjeta de la campaña. */
export const CAMPOS_CUADRE = ['enviados', 'entregados', 'aperturasReales', 'personasConClic', 'rebotesPermanentes', 'rebotesTemporales', 'sinEstado', 'bajas', 'quejas']

function resultadoDe(f, estado) {
  if (f.queja) return 'queja'
  if (estado === 'permanente') return 'permanente'
  if (estado === 'temporal') return 'temporal'
  if (estado === 'sinEstado') return 'sinEstado'
  if (f.baja) return 'baja'
  if (f.clicsTotales > 0) return 'clic'
  if (f.aperturaReal) return 'abrio'
  if (f.aperturasApple > 0) return 'automatico'
  return 'sinAbrir'
}

/** Si antes de una queja, rebote, baja o sin estado la persona abrió o hizo clic, se indica. */
function antesDe(f, resultado) {
  if (!['queja', 'permanente', 'temporal', 'sinEstado', 'baja'].includes(resultado)) return null
  if (f.clicsTotales > 0) return 'había hecho clic'
  if (f.aperturaReal) return 'había abierto'
  return null
}

const ultimaFecha = (fechas) => fechas.filter((x) => x && x !== FECHA_ILEGIBLE).sort().at(-1) ?? (fechas.includes(FECHA_ILEGIBLE) ? FECHA_ILEGIBLE : null)

/** Fecha del evento que decide el resultado. */
function fechaFinal(f, resultado) {
  switch (resultado) {
    case 'queja': return f.fechaQueja
    case 'permanente': return f.fechaReboteDuro
    case 'temporal': return f.fechaReboteSuave
    case 'sinEstado': return f.fechaEnvio
    case 'baja': return f.fechaBaja
    case 'clic': return ultimaFecha((f.enlaces ?? []).map((e) => e.fecha)) ?? f.fechaApertura ?? f.fechaEntrega
    case 'abrio': return f.fechaApertura
    default: return f.fechaEntrega
  }
}

/** "https://www.red.com.gt/planes/empresas/?utm=x" → "red.com.gt/planes/empresas". */
export function enlaceCorto(url, maximo = 48) {
  let texto
  try {
    const u = new URL(url)
    texto = `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`
  } catch {
    texto = String(url).replace(/^https?:\/\//i, '').split(/[?#]/)[0]
  }
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto
}

/**
 * Lista por persona de UNA campaña.
 * @param {object[]} filas  filas estándar (todas las de la fuente)
 * @param {string} campanaId
 * @param {'metricas'|'totalBrevo'} vista
 * @returns {null | { excluida: true, campana, motivo } | { excluida: false, campana, vista, personas, conteos, cuadre }}
 */
export function armarDetallePersonas(filas, campanaId, vista) {
  // Mismo descarte de correos repetidos que calcularMailing: se queda la primera fila de cada correo.
  const vistos = new Set()
  const propias = []
  for (const f of filas) {
    if (f.canal !== 'mailing' || f.campanaId !== campanaId || vistos.has(f.correo)) continue
    vistos.add(f.correo)
    propias.push(f)
  }
  if (propias.length === 0) return null

  // La tarjeta de esta campaña, con el cálculo de siempre.
  const c = calcularMailing(filas, { soloCampanas: new Set([campanaId]) }).campanas[0]
  const campana = { id: c.id, nombre: c.nombre, fechaEnvio: c.fechaEnvio, cargo: c.cargo }
  if (c.excluida) return { excluida: true, campana, motivo: c.motivoExclusion }

  const incluidas = vista === 'totalBrevo' ? propias : propias.filter((f) => !esCorreoInterno(f.correo))
  const lista = Object.fromEntries(CAMPOS_CUADRE.map((k) => [k, 0]))
  const conteos = Object.fromEntries(RESULTADOS.map((r) => [r.clave, 0]))
  const personas = incluidas.map((f) => {
    const estado = estadoFinal(f)
    const resultado = resultadoDe(f, estado)
    // Cuadre con los mismos campos que la tarjeta (no con los botones de resultado).
    lista.enviados += 1
    if (estado === 'entregado') lista.entregados += 1
    if (estado === 'permanente') lista.rebotesPermanentes += 1
    if (estado === 'temporal') lista.rebotesTemporales += 1
    if (estado === 'sinEstado') lista.sinEstado += 1
    if (f.aperturaReal) lista.aperturasReales += 1
    if (f.clicsTotales > 0) lista.personasConClic += 1
    if (f.baja) lista.bajas += 1
    if (f.queja) lista.quejas += 1
    conteos[resultado] += 1
    const pais = paisDeCorreo(f.correo)
    return {
      correo: f.correo,
      pais: pais === PAIS_DESCONOCIDO ? null : pais,
      interno: esCorreoInterno(f.correo),
      resultado,
      antes: antesDe(f, resultado),
      clics: f.clicsTotales,
      enlaces: (f.enlaces ?? []).map((e) => ({ corto: enlaceCorto(e.url), url: e.url })),
      fechaFinal: fechaFinal(f, resultado) ?? null,
    }
  })
  const orden = Object.fromEntries(RESULTADOS.map((r, i) => [r.clave, i]))
  personas.sort((a, b) => orden[a.resultado] - orden[b.resultado] || a.correo.localeCompare(b.correo))

  const bloque = vista === 'totalBrevo' ? c.totalBrevo : c.metricas
  const tarjeta = Object.fromEntries(CAMPOS_CUADRE.map((k) => [k, bloque[k]]))
  return {
    excluida: false,
    campana,
    vista,
    personas,
    conteos,
    resultados: RESULTADOS,
    cuadre: { campos: CAMPOS_CUADRE, lista, tarjeta, cuadra: CAMPOS_CUADRE.every((k) => lista[k] === tarjeta[k]) },
  }
}
