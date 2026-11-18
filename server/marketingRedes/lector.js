/**
 * Redes sociales — LECTOR del Excel de métricas (docs/marketing-redes/DECISIONES.md, D6–D12).
 *
 * Recibe los BYTES del archivo y no sabe de dónde vinieron (eso lo decide fuente.js).
 * Devuelve filas limpias, una por publicación y red:
 *   { id, hoja, marca, marcaClave, pais, filaExcel, fecha 'AAAA-MM-DD', idExcel, red, campana,
 *     link, linkOriginal, pauta, alcance, visualizaciones, clics, interacciones, comentarios,
 *     compartidos, leads, calificados, cierres, unidades, costosExcel{…}, postIdMeta, publicacionId }
 * más:
 *   totalesExcel        → lo que dice la fila de TOTAL de cada hoja (para compararlo con la suma real)
 *   advertenciasLectura → celdas que no se pudieron interpretar, hojas desconocidas, columnas faltantes
 *   hojas               → resumen por hoja (filas leídas, filas de total ignoradas)
 */
import XLSX from 'xlsx'
import { limpiarNumero } from './numeros.js'
import { linkReal } from './links.js'

/** Quita tildes, mayúsculas, espacios y signos: "Métricas RRSS DATA RED" → "metricasrrssdatared". */
export const normalizarNombre = (texto) => String(texto ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '')

/** Campaña comparable: sin mayúsculas, tildes ni espacios dobles (para identificar la publicación). */
export const normalizarCampana = (texto) => String(texto ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim()

// D-A: Datared es una marca de El Salvador distinta a RED El Salvador.
export const MARCAS = {
  metricasrrssgt: { marca: 'RED Guatemala', marcaClave: 'gt', pais: 'GT' },
  metricasrrsssv: { marca: 'RED El Salvador', marcaClave: 'sv', pais: 'SV' },
  metricasrrssdatared: { marca: 'Datared', marcaClave: 'datared', pais: 'SV' },
}

/** Columnas buscadas por nombre normalizado (no por posición). */
const COLUMNAS = {
  u1: 'fecha',
  id: 'idExcel',
  redsocial: 'red',
  campana: 'campana',
  linkpublicacion: 'link',
  presupuestopauta: 'pauta',
  alcance: 'alcance',
  visualizaciones: 'visualizaciones',
  clics: 'clics',
  costoxclic: 'costoClic',
  interacciones: 'interacciones',
  comentarios: 'comentarios',
  compartidos: 'compartidos',
  mensajesleads: 'leads',
  leadcalificado: 'calificados',
  costoxlead: 'costoLead',
  cierresexitosonoclientes: 'cierres',
  costoxcliente: 'costoCliente',
  nodeunidades: 'unidades',
  costoxunidad: 'costoUnidad',
  postidmeta: 'postIdMeta',
}
const NUMERICAS = ['pauta', 'alcance', 'visualizaciones', 'clics', 'interacciones', 'comentarios', 'compartidos', 'leads', 'calificados', 'cierres', 'unidades']
const COSTOS = ['costoClic', 'costoLead', 'costoCliente', 'costoUnidad']
const ETIQUETA = {
  fecha: 'U1 (fecha)', pauta: 'Presupuesto pauta', alcance: 'Alcance', visualizaciones: 'visualizaciones', clics: 'Clics',
  interacciones: 'Interacciones', comentarios: 'Comentarios', compartidos: 'Compartidos', leads: 'Mensajes/Leads',
  calificados: 'Lead calificado', cierres: 'Cierres exitoso (No. clientes)', unidades: 'No. de unidades',
  costoClic: 'Costo x clic', costoLead: 'Costo x Lead', costoCliente: 'Costo x Cliente', costoUnidad: 'Costo X Unidad',
}

const dosDigitos = (n) => String(n).padStart(2, '0')

/** Fecha de Excel (número de serie) o texto dd/mm/aaaa (también acepta aaaa-mm-dd). */
export function leerFecha(valor) {
  if (valor === null || valor === undefined || valor === '') return { fecha: null, ok: true }
  if (typeof valor === 'number') {
    const p = XLSX.SSF.parse_date_code(valor)
    return p && p.y > 1900 ? { fecha: `${p.y}-${dosDigitos(p.m)}-${dosDigitos(p.d)}`, ok: true } : { fecha: null, ok: false }
  }
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return { fecha: `${valor.getFullYear()}-${dosDigitos(valor.getMonth() + 1)}-${dosDigitos(valor.getDate())}`, ok: true }
  }
  const texto = String(valor).trim()
  let m = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) return fechaValida(Number(m[3]), Number(m[2]), Number(m[1]))
  m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return fechaValida(Number(m[1]), Number(m[2]), Number(m[3]))
  return { fecha: null, ok: false }
}

function fechaValida(y, mes, d) {
  const f = new Date(Date.UTC(y, mes - 1, d))
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) return { fecha: null, ok: false }
  return { fecha: `${y}-${dosDigitos(mes)}-${dosDigitos(d)}`, ok: true }
}

/** "instagram", "Instagram " → "Instagram"; vacía → "Sin red". */
export function normalizarRed(valor) {
  const t = normalizarNombre(valor)
  if (!t) return { red: 'Sin red', conocida: true }
  if (t === 'facebook' || t === 'fb') return { red: 'Facebook', conocida: true }
  if (t === 'instagram' || t === 'ig') return { red: 'Instagram', conocida: true }
  return { red: String(valor).trim(), conocida: false }
}

const textoLimpio = (v) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim())

/** Busca la fila de encabezados: la primera que tiene al menos 5 de las columnas conocidas. */
function buscarEncabezado(filas) {
  for (let i = 0; i < Math.min(filas.length, 15); i++) {
    const mapa = {}
    ;(filas[i] ?? []).forEach((celda, col) => {
      const clave = COLUMNAS[normalizarNombre(celda)]
      if (clave && mapa[clave] === undefined) mapa[clave] = col
    })
    if (Object.keys(mapa).length >= 5) return { indice: i, mapa }
  }
  return null
}

/**
 * @param {Uint8Array|Buffer|ArrayBuffer} bytes contenido del .xlsx
 */
export function leerExcelRRSS(bytes) {
  const libro = XLSX.read(bytes, { type: bytes instanceof ArrayBuffer ? 'array' : 'buffer', cellDates: false })
  const filasSalida = []
  const totalesExcel = {}
  const advertenciasLectura = []
  const hojas = []

  for (const nombreHoja of libro.SheetNames) {
    const marcaInfo = MARCAS[normalizarNombre(nombreHoja)]
    if (!marcaInfo) {
      advertenciasLectura.push({ hoja: nombreHoja, mensaje: `Hoja "${nombreHoja}" no reconocida: no se leyó. Las hojas esperadas son "Métricas RRSS GT", "Métricas RRSS SV" y "Métricas RRSS DATA RED".` })
      continue
    }
    const hoja = libro.Sheets[nombreHoja]
    const rango = XLSX.utils.decode_range(hoja['!ref'] ?? 'A1:A1')
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: null, blankrows: true })
    const encabezado = buscarEncabezado(filas)
    if (!encabezado) {
      advertenciasLectura.push({ hoja: nombreHoja, mensaje: `En la hoja "${nombreHoja}" no se encontró la fila de encabezados (U1, Red social, Campaña…).` })
      continue
    }
    for (const [norm, clave] of Object.entries(COLUMNAS)) {
      if (encabezado.mapa[clave] === undefined) advertenciasLectura.push({ hoja: nombreHoja, mensaje: `Falta la columna "${ETIQUETA[clave] ?? norm}" en la hoja "${nombreHoja}": se toma como vacía.` })
    }

    let leidas = 0
    let totalesIgnoradas = 0
    for (let i = encabezado.indice + 1; i < filas.length; i++) {
      const celdas = filas[i] ?? []
      if (!celdas.some((c) => c !== null && c !== '')) continue
      const filaExcel = rango.s.r + i + 1
      const celda = (clave) => (encabezado.mapa[clave] === undefined ? null : celdas[encabezado.mapa[clave]])

      const fechaCelda = celda('fecha')
      const campana = textoLimpio(celda('campana'))
      const linkTexto = textoLimpio(celda('link'))
      const sinFecha = fechaCelda === null || String(fechaCelda).trim() === ''

      // D11: fila de TOTAL = sin fecha, sin campaña y sin link. Se ignora (si no, todo sale doble).
      if (sinFecha && !campana && !linkTexto) {
        totalesIgnoradas++
        const total = {}
        for (const clave of ['pauta', 'leads', 'calificados', 'cierres', 'unidades']) total[clave] = limpiarNumero(celda(clave)).valor
        totalesExcel[marcaInfo.marcaClave] = { ...total, filaExcel }
        continue
      }

      const avisar = (columna, valor, mensaje) => advertenciasLectura.push({ hoja: nombreHoja, filaExcel, columna, valor: String(valor), mensaje })
      const { fecha, ok: fechaOk } = leerFecha(fechaCelda)
      if (!fechaOk) avisar('U1 (fecha)', fechaCelda, `Fecha "${fechaCelda}" no reconocida (fila ${filaExcel}).`)
      else if (!fecha) avisar('U1 (fecha)', '', `Fila ${filaExcel} sin fecha: no entra en los meses.`)

      const numeros = {}
      for (const clave of [...NUMERICAS, ...COSTOS]) {
        const original = celda(clave)
        const { valor, ok } = limpiarNumero(original)
        if (!ok) avisar(ETIQUETA[clave], original, `"${String(original).trim()}" en ${ETIQUETA[clave]} no es un número: se toma como sin dato (fila ${filaExcel}).`)
        numeros[clave] = valor
      }

      const { red, conocida } = normalizarRed(celda('red'))
      if (!conocida) avisar('Red social', celda('red'), `Red social "${red}" desconocida (fila ${filaExcel}).`)

      const idCelda = celda('idExcel')
      const idExcel = idCelda === null || String(idCelda).trim() === '' ? null : String(idCelda).trim()
      const linkOriginal = linkTexto || null
      // D12: identificar la publicación. Con id → marca + id; sin id → marca + fecha + campaña normalizada.
      const publicacionId = idExcel
        ? `${marcaInfo.marcaClave}|id:${idExcel}`
        : `${marcaInfo.marcaClave}|${fecha ?? 'sin-fecha'}|${normalizarCampana(campana)}`

      filasSalida.push({
        id: `${marcaInfo.marcaClave}-${filaExcel}`,
        hoja: nombreHoja,
        ...marcaInfo,
        filaExcel,
        fecha,
        idExcel,
        red,
        campana,
        link: linkReal(linkOriginal),
        linkOriginal,
        pauta: numeros.pauta,
        alcance: numeros.alcance,
        visualizaciones: numeros.visualizaciones,
        clics: numeros.clics,
        interacciones: numeros.interacciones,
        comentarios: numeros.comentarios,
        compartidos: numeros.compartidos,
        leads: numeros.leads,
        calificados: numeros.calificados,
        cierres: numeros.cierres,
        unidades: numeros.unidades,
        costosExcel: { clic: numeros.costoClic, lead: numeros.costoLead, cliente: numeros.costoCliente, unidad: numeros.costoUnidad },
        postIdMeta: textoLimpio(celda('postIdMeta')) || null,
        publicacionId,
      })
      leidas++
    }
    hojas.push({ nombre: nombreHoja, ...marcaInfo, filas: leidas, filasTotalIgnoradas: totalesIgnoradas })
  }

  for (const clave of Object.keys(MARCAS)) {
    const m = MARCAS[clave]
    if (!hojas.some((h) => h.marcaClave === m.marcaClave)) advertenciasLectura.push({ mensaje: `No se encontró la hoja de ${m.marca}.` })
  }
  return { filas: filasSalida, totalesExcel, advertenciasLectura, hojas }
}
