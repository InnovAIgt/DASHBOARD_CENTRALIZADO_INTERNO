// Flujo de ventas v2 · Informe detallado: columnas, vistas rápidas y semáforo.
//
// Lee los campos de cada registro de Prospekt IA (lead.raw, que guarda la lógica copiada) y los
// campos que ya calcula esa lógica (estado, motivo, próxima gestión, fecha de reunión, unidades…).
// No cambia ninguna fórmula de ../utils. Nunca usa client_phone (además, el servidor ya lo quita).
// Inventario de campos y cuáles quedan fuera: docs/marketing/DECISIONES.md (D11).
import { isOpen, isWon, leadUnits, PIPELINE_STAGES, qualificationLabel } from '../utils/analytics.js'
import { isOverdue, toDate } from '../utils/dates.js'
import { leadDisplayId, lossReasonLabel, stateLabel } from '../utils/leads.js'

// ---------- Lectura segura de los campos de la API ----------
const limpiar = (valor) => {
  if (typeof valor === 'string') return valor.trim()
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor)
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  return ''
}
const unir = (...textos) => textos.map(limpiar).filter(Boolean).join(' · ')
const etapas = (raw) => {
  const v = raw?.stage_feedback_json
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
}
/** Datos de una etapa (2 a 6). Si la etapa viene como texto libre, se devuelve en `_texto`. */
const etapa = (raw, numero) => {
  const v = etapas(raw)[String(numero)]
  if (v && typeof v === 'object' && !Array.isArray(v)) return v
  return typeof v === 'string' ? { _texto: v } : {}
}
// 26 leads traen algunos campos sueltos en la raíz de stage_feedback_json (formato antiguo). Solo
// para los campos que existen en una única etapa se usa ese valor como respaldo.
const deEtapa = (raw, numero, campo) => limpiar(etapa(raw, numero)[campo]) || limpiar(etapas(raw)[campo])
const propuestaJson = (raw) => (raw?.propuesta_json && typeof raw.propuesta_json === 'object' ? raw.propuesta_json : {})

/** Fecha de un campo: acepta AAAA-MM-DD, fecha y hora ISO o DD/MM/AAAA. */
export function leerFecha(valor) {
  if (typeof valor === 'string') {
    const m = valor.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  }
  return toDate(valor)
}
const numeroOTexto = (texto) => (/^\s*\d+(\.\d+)?\s*$/.test(texto) ? Number(texto) : texto)

const RESULTADO_VENTA = { perdida: 'Perdida', en_seguimiento: 'En seguimiento', cerrada: 'Cerrada' }

// ---------- Semáforo de la próxima gestión ----------
// Usa la próxima gestión que ya calcula la lógica copiada (la más reciente de cualquier etapa).
// vencida = antes de hoy (misma regla que isOverdue / "vencidos" de calculateMetrics) ·
// hoy = hoy · a_tiempo = después de hoy. Solo aplica a leads abiertos; en los cerrados la fecha
// se muestra sin color.
export function semaforo(lead, ahora = new Date()) {
  const fecha = toDate(lead.proximaGestion)
  if (!fecha) return null
  if (!isOpen(lead)) return 'cerrado'
  if (isOverdue(lead.proximaGestion, ahora)) return 'vencida'
  const mismoDia = fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth() && fecha.getDate() === ahora.getDate()
  return mismoDia ? 'hoy' : 'a_tiempo'
}

export function diasDesdeCreacion(lead, ahora = new Date()) {
  const creado = toDate(lead.fechaCreacion)
  if (!creado) return null
  const inicio = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((inicio(ahora) - inicio(creado)) / 86400000)
}

// ---------- Vistas rápidas ----------
// "Seguimientos vencidos" y "Sin motivo de pérdida" usan las mismas reglas que calculateMetrics
// de la lógica copiada (vencidos y perdidosSinMotivo).
export const VISTAS = [
  { key: 'todos', label: 'Todos', tono: 'neutro', filtro: () => true },
  { key: 'abierto', label: 'Pipeline abierto', tono: 'azul', filtro: isOpen },
  { key: 'ganados', label: 'Ganados', tono: 'verde', filtro: isWon },
  { key: 'perdidos', label: 'Perdidos', tono: 'rojo', filtro: (lead) => lead.estado === 'perdido' },
  { key: 'vencidos', label: 'Seguimientos vencidos', tono: 'rojo', filtro: (lead) => isOpen(lead) && isOverdue(lead.proximaGestion) },
  { key: 'sinMotivo', label: 'Sin motivo de pérdida', tono: 'amarillo', filtro: (lead) => lead.estado === 'perdido' && !lead.motivo },
]

export function conteoVistas(leads) {
  return Object.fromEntries(VISTAS.map((v) => [v.key, leads.filter(v.filtro).length]))
}

// ---------- Grupos y columnas ----------
export const GRUPOS = [
  { key: 'cliente', label: 'Cliente', visible: true },
  { key: 'responsable', label: 'Responsable', visible: true },
  { key: 'calificacion', label: 'Calificación', visible: true },
  { key: 'avance', label: 'Avance', visible: true },
  { key: 'fechas', label: 'Fechas', visible: true },
  { key: 'propuesta', label: 'Propuesta', visible: true },
  { key: 'resultado', label: 'Resultado', visible: true },
  { key: 'comentarios', label: 'Comentarios', visible: false },
]

// tipo: texto | largo (texto recortado) | numero | fecha | etapa | estado | calificacion | semaforo | cliente
// ancho: ancho de la columna en el Excel. valor(lead): dato para ordenar y exportar.
const c = (grupo, key, label, tipo, ancho, valor) => ({ grupo, key, label, tipo, ancho, valor })

export const COLUMNAS = [
  // Cliente
  c('cliente', 'cliente', 'Cliente', 'cliente', 34, (l) => l.clientName ?? `Lead ${leadDisplayId(l)}`),
  c('cliente', 'codigo', 'Código', 'texto', 12, (l) => leadDisplayId(l)),
  c('cliente', 'rubro', 'Rubro', 'texto', 18, (l) => limpiar(l.raw?.rubro)),
  c('cliente', 'industria', 'Industria', 'texto', 22, (l) => unir(etapa(l.raw, 2).industria_sector, etapa(l.raw, 2).industria_otro)),
  c('cliente', 'origen', 'Origen', 'texto', 22, (l) => limpiar(l.raw?.validator_source)),
  // Responsable
  c('responsable', 'ejecutivo', 'Ejecutivo', 'texto', 24, (l) => l.asesor ?? ''),
  c('responsable', 'pais', 'País', 'texto', 12, (l) => l.pais ?? ''),
  // Calificación
  c('calificacion', 'calificacion', 'Calificación', 'calificacion', 14, (l) => qualificationLabel(l.tipoLead)),
  c('calificacion', 'tipoReunion', 'Tipo de reunión', 'texto', 16, (l) => limpiar(etapa(l.raw, 2).tipo_reunion)),
  c('calificacion', 'interes', 'Interés de producto', 'texto', 18, (l) => limpiar(etapa(l.raw, 2).interes_producto)),
  c('calificacion', 'requiereDemo', '¿Requiere demo?', 'texto', 14, (l) => limpiar(etapa(l.raw, 2).requiere_demo)),
  c('calificacion', 'llamada', 'Tipo de llamada preferida', 'texto', 20, (l) => limpiar(l.raw?.preferred_tipo_llamada)),
  // Avance
  c('avance', 'etapa', 'Etapa', 'etapa', 24, (l) => (Number.isFinite(l.apiStage) ? l.apiStage : null)),
  c('avance', 'estado', 'Estado', 'estado', 13, (l) => stateLabel(l.estado)),
  c('avance', 'dias', 'Días desde creación', 'numero', 12, (l) => diasDesdeCreacion(l)),
  c('avance', 'nivelAvance', 'Nivel de avance', 'texto', 16, (l) => deEtapa(l.raw, 5, 'nivel_avance')),
  c('avance', 'respuestaCliente', 'Respuesta del cliente', 'texto', 18, (l) => deEtapa(l.raw, 5, 'respuesta_cliente')),
  c('avance', 'medioSeguimiento', 'Medio de seguimiento', 'texto', 16, (l) => deEtapa(l.raw, 5, 'medio_seguimiento')),
  // Fechas
  c('fechas', 'fCreacion', 'Creación', 'fecha', 13, (l) => toDate(l.fechaCreacion)),
  c('fechas', 'fReunion', 'Reunión', 'fecha', 13, (l) => toDate(l.fechaReunion)),
  c('fechas', 'fDemo', 'Demo', 'fecha', 13, (l) => leerFecha(etapa(l.raw, 3).fecha_demo)),
  c('fechas', 'fEnvio', 'Envío de propuesta', 'fecha', 14, (l) => leerFecha(deEtapa(l.raw, 4, 'fecha_envio'))),
  c('fechas', 'fSeguimiento', 'Seguimiento', 'fecha', 13, (l) => leerFecha(deEtapa(l.raw, 5, 'fecha_seguimiento'))),
  c('fechas', 'fCierre', 'Cierre', 'fecha', 13, (l) => leerFecha(deEtapa(l.raw, 6, 'fecha_cierre_real'))),
  c('fechas', 'proximaGestion', 'Próxima gestión', 'semaforo', 18, (l) => toDate(l.proximaGestion)),
  // Propuesta
  c('propuesta', 'tienePropuesta', '¿Tiene propuesta?', 'texto', 12, (l) => (l.raw?.has_propuesta ? 'Sí' : 'No')),
  c('propuesta', 'productosOfrecidos', 'Productos ofrecidos', 'largo', 30, (l) => limpiar(etapa(l.raw, 2).productos_ofrecidos)),
  c('propuesta', 'productosPropuestos', 'Productos propuestos', 'largo', 30, (l) => deEtapa(l.raw, 4, 'productos_propuestos')),
  c('propuesta', 'modelo', 'Modelo de equipo', 'texto', 20, (l) => deEtapa(l.raw, 4, 'modelo_equipo_propuesto')),
  c('propuesta', 'cantidadEquipos', 'Cantidad de equipos', 'numero', 12, (l) => numeroOTexto(deEtapa(l.raw, 4, 'cantidad_equipos'))),
  c('propuesta', 'planMeses', 'Plan (meses)', 'numero', 11, (l) => numeroOTexto(deEtapa(l.raw, 4, 'plan_contrato_meses'))),
  c('propuesta', 'medioEnvio', 'Medio de envío', 'texto', 14, (l) => deEtapa(l.raw, 4, 'medio_envio')),
  c('propuesta', 'rubroPropuesta', 'Rubro de la propuesta', 'texto', 18, (l) => limpiar(propuestaJson(l.raw).rubro)),
  c('propuesta', 'resumenPropuesta', 'Resumen de la propuesta', 'largo', 36, (l) => limpiar(propuestaJson(l.raw).resumen_general)),
  // Resultado
  c('resultado', 'resultadoVenta', 'Resultado de venta', 'texto', 16, (l) => RESULTADO_VENTA[l.raw?.resultado_venta] ?? limpiar(l.raw?.resultado_venta)),
  c('resultado', 'categoriaCierre', 'Categoría de cierre', 'texto', 20, (l) => limpiar(l.raw?.categoria_cierre)),
  c('resultado', 'resultadoCierre', 'Resultado de cierre', 'texto', 18, (l) => deEtapa(l.raw, 6, 'resultado_cierre')),
  c('resultado', 'razonCierre', 'Razón de cierre', 'largo', 30, (l) => deEtapa(l.raw, 6, 'razon_cierre')),
  c('resultado', 'motivoPerdida', 'Motivo de pérdida', 'texto', 22, (l) => (l.motivo ? lossReasonLabel(l.motivo) : '')),
  c('resultado', 'contactoExitoso', 'Contacto exitoso', 'texto', 12, (l) => limpiar(etapa(l.raw, 6).contacto_exitoso)),
  c('resultado', 'motivoNoContacto', 'Motivo de no contacto', 'texto', 22, (l) => limpiar(etapa(l.raw, 6).motivo_no_contacto)),
  c('resultado', 'descNoContacto', 'Descripción de no contacto', 'largo', 30, (l) => limpiar(etapa(l.raw, 6).descripcion_no_contacto)),
  c('resultado', 'unidades', 'Unidades', 'numero', 10, (l) => (isWon(l) ? leadUnits(l) : null)),
  // Comentarios
  c('comentarios', 'retroEjecutivo', 'Retroalimentación del ejecutivo', 'largo', 40, (l) => limpiar(l.raw?.advisor_feedback)),
  c('comentarios', 'retroReunion', 'Retro de reunión', 'largo', 40, (l) => unir(etapa(l.raw, 2)._texto, etapa(l.raw, 2).retroalimentacion, etapa(l.raw, 2).notes)),
  c('comentarios', 'retroDemo', 'Retro de demo', 'largo', 40, (l) => unir(etapa(l.raw, 3)._texto, etapa(l.raw, 3).retroalimentacion, etapa(l.raw, 3).notes)),
  c('comentarios', 'retroPropuesta', 'Retro de propuesta', 'largo', 40, (l) => unir(etapa(l.raw, 4).retroalimentacion, etapa(l.raw, 4).notes, etapa(l.raw, 4).resumen_general)),
  c('comentarios', 'retroSeguimiento', 'Retro de seguimiento', 'largo', 40, (l) => unir(etapa(l.raw, 5).retroalimentacion, etapa(l.raw, 5).notes, etapa(l.raw, 5).resumen_general)),
  c('comentarios', 'proximoPaso', 'Próximo paso', 'largo', 30, (l) => deEtapa(l.raw, 5, 'proximo_paso')),
  c('comentarios', 'retroCierre', 'Retro de cierre', 'largo', 40, (l) => limpiar(etapa(l.raw, 6).retroalimentacion)),
  c('comentarios', 'comentarioAdmin', 'Comentario administrativo', 'largo', 30, (l) => limpiar(etapa(l.raw, 6).admin_comment)),
  c('comentarios', 'notasGestion', 'Notas de la próxima gestión', 'largo', 36, (l) => limpiar(l.comentarioGestion)),
  c('comentarios', 'notaSeguimiento', 'Nota de seguimiento', 'largo', 36, (l) => limpiar(l.raw?.seguimiento_json)),
  c('comentarios', 'retroAnterior', 'Retro (formato anterior)', 'largo', 36, (l) => unir(etapas(l.raw).retroalimentacion, etapas(l.raw).notes, etapas(l.raw)._notes)),
]

/** Texto de una celda para mostrar o exportar a CSV. */
export function textoCelda(col, valor) {
  if (valor === null || valor === undefined || valor === '') return ''
  if (valor instanceof Date) {
    const dd = String(valor.getDate()).padStart(2, '0')
    const mm = String(valor.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${valor.getFullYear()}`
  }
  if (col.tipo === 'etapa') return `${valor} · ${PIPELINE_STAGES[valor - 1] ?? ''}`.trim()
  return String(valor)
}

/** Filas del informe: un objeto por lead con el valor de cada columna (se calcula una vez). */
export function filasInforme(leads) {
  return leads.map((lead) => ({ lead, v: Object.fromEntries(COLUMNAS.map((col) => [col.key, col.valor(lead)])) }))
}

const CAMPOS_BUSQUEDA = ['cliente', 'codigo', 'ejecutivo', 'pais', 'rubro', 'industria', 'origen', 'productosOfrecidos', 'productosPropuestos', 'modelo']
export function buscarFilas(filas, texto) {
  const t = texto.trim().toLowerCase()
  if (!t) return filas
  return filas.filter((fila) => CAMPOS_BUSQUEDA.some((k) => String(fila.v[k] ?? '').toLowerCase().includes(t)))
}

/** Orden por cualquier columna; los vacíos siempre al final. */
export function ordenarFilas(filas, key, dir) {
  const signo = dir === 'asc' ? 1 : -1
  const vacio = (x) => x === null || x === undefined || x === ''
  return [...filas].sort((a, b) => {
    const x = a.v[key]
    const y = b.v[key]
    if (vacio(x) && vacio(y)) return 0
    if (vacio(x)) return 1
    if (vacio(y)) return -1
    if (x instanceof Date || y instanceof Date) return signo * ((x?.getTime?.() ?? 0) - (y?.getTime?.() ?? 0))
    if (typeof x === 'number' && typeof y === 'number') return signo * (x - y)
    return signo * String(x).localeCompare(String(y), 'es', { numeric: true, sensitivity: 'base' })
  })
}
