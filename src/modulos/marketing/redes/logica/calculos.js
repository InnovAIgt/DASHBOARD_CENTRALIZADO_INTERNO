/**
 * Redes sociales — CÁLCULOS (docs/marketing-redes/DECISIONES.md, D14–D18).
 *
 * Un solo lugar para todas las cifras: lo usan el Resumen, el Informe detallado, el Excel
 * exportado y las pruebas del servidor. Así la misma cifra sale igual en todas partes.
 * No depende de React ni de Node: solo recibe filas (las que entrega /api/marketing/redes).
 *
 * Reglas principales:
 *  - Leads = Mensajes/Leads · Calificados = Lead calificado · No calificados = leads − calificados
 *    (si sale negativo se muestra con ⚠, no se cambia).
 *  - Costos SIEMPRE recalculados con la pauta: pauta ÷ leads, ÷ calificados, ÷ cierres.
 *    Si el divisor es 0 → null (en pantalla "—"); nunca Infinity ni NaN.
 *  - Estados (D-F): Programada = fecha posterior a hoy · Sin métricas = todas las métricas vacías ·
 *    Incompleta = tiene alcance o visualizaciones pero faltan leads o calificados · Publicada = el resto.
 *  - Meta (D17): 14 publicaciones por marca al mes. Facebook + Instagram del mismo post = 1.
 *  - "Pocos datos": menos de 5 datos.
 */

export const META_MENSUAL = 14
export const MINIMO_DATOS = 5

export const MARCAS = [
  { clave: 'gt', nombre: 'RED Guatemala', pais: 'GT' },
  { clave: 'sv', nombre: 'RED El Salvador', pais: 'SV' },
  { clave: 'datared', nombre: 'Datared', pais: 'SV' },
]
export const PAISES = [
  { clave: 'GT', nombre: 'Guatemala' },
  { clave: 'SV', nombre: 'El Salvador' },
]
export const REDES = ['Facebook', 'Instagram', 'Sin red']

export const ESTADOS = {
  publicada: { etiqueta: 'Publicada', tono: 'verde', explicacion: 'Tiene sus resultados cargados (leads y calificados).' },
  incompleta: { etiqueta: 'Incompletas', tono: 'amarillo', explicacion: 'Tiene alcance o visualizaciones, pero faltan leads o calificados.' },
  sin_metricas: { etiqueta: 'Sin métricas', tono: 'ambar', explicacion: 'Todas las métricas están vacías.' },
  programada: { etiqueta: 'Programada', tono: 'azul', explicacion: 'Fecha posterior a hoy (el Excel no tiene columna de estado).' },
}

/** Métricas que cuentan para decidir si una fila "tiene métricas" (la pauta no cuenta). */
export const METRICAS = ['alcance', 'visualizaciones', 'clics', 'interacciones', 'comentarios', 'compartidos', 'leads', 'calificados', 'cierres', 'unidades']

const dos = (n) => String(n).padStart(2, '0')
/** Hoy en formato AAAA-MM-DD (hora local de quien mira el dashboard). */
export const hoyISO = (d = new Date()) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
export const mesDe = (iso) => (iso ? iso.slice(0, 7) : null)
/** División segura: null si el divisor es 0 o falta. */
export const dividir = (a, b) => (a === null || a === undefined || !b ? null : a / b)
export const pocos = (n) => n < MINIMO_DATOS

/** Meses AAAA-MM entre dos meses, incluidos. */
export function rangoMeses(desde, hasta) {
  if (!desde || !hasta || desde > hasta) return []
  const salida = []
  let [y, m] = desde.split('-').map(Number)
  const [yf, mf] = hasta.split('-').map(Number)
  while (y < yf || (y === yf && m <= mf)) {
    salida.push(`${y}-${dos(m)}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return salida
}

// ---------- Estados ----------

export function estadoFila(f, hoy) {
  if (f.fecha && f.fecha > hoy) return 'programada'
  if (METRICAS.every((k) => f[k] === null || f[k] === undefined)) return 'sin_metricas'
  const conAlcance = f.alcance !== null || f.visualizaciones !== null
  if (conAlcance && (f.leads === null || f.calificados === null)) return 'incompleta'
  return 'publicada'
}

/**
 * Estado de la PUBLICACIÓN a partir de sus filas (una por red). Decisión del 17/11/2026 (DECISIONES D15):
 * si al menos una de sus redes tiene sus resultados (leads y calificados cargados, es decir, la fila está
 * "Publicada"), la publicación cuenta como Publicada. Cada FILA conserva su propio estado en el Informe.
 */
export function estadoPublicacion(estadosFilas) {
  if (estadosFilas.includes('programada')) return 'programada'
  if (estadosFilas.every((e) => e === 'sin_metricas')) return 'sin_metricas'
  if (estadosFilas.includes('publicada')) return 'publicada'
  return 'incompleta'
}

// ---------- Preparación (se hace una vez al recibir los datos) ----------

/**
 * Agrega a cada fila: mes, estadoFila, estado (de su publicación), noCalificados y costos
 * recalculados. Arma la lista de publicaciones y el primer mes de cada marca (D-G).
 */
export function prepararDatos(filasServidor, hoy = hoyISO()) {
  const conEstado = filasServidor.map((f) => ({ ...f, mes: mesDe(f.fecha), estadoFila: estadoFila(f, hoy) }))

  const grupos = new Map()
  for (const f of conEstado) {
    if (!grupos.has(f.publicacionId)) grupos.set(f.publicacionId, [])
    grupos.get(f.publicacionId).push(f)
  }
  const publicaciones = new Map()
  for (const [id, filas] of grupos) {
    const fecha = filas.map((f) => f.fecha).filter(Boolean).sort()[0] ?? null
    publicaciones.set(id, {
      id,
      marcaClave: filas[0].marcaClave,
      marca: filas[0].marca,
      pais: filas[0].pais,
      fecha,
      mes: mesDe(fecha),
      campana: filas.find((f) => f.campana)?.campana ?? '(sin nombre)',
      redes: filas.map((f) => f.red),
      filas: filas.map((f) => f.id),
      estado: estadoPublicacion(filas.map((f) => f.estadoFila)),
    })
  }

  const filas = conEstado.map((f) => {
    const noCalificados = f.leads === null && f.calificados === null ? null : (f.leads ?? 0) - (f.calificados ?? 0)
    return {
      ...f,
      estado: publicaciones.get(f.publicacionId).estado,
      noCalificados,
      costoLead: dividir(f.pauta, f.leads),
      costoCalificado: dividir(f.pauta, f.calificados),
      costoCliente: dividir(f.pauta, f.cierres),
      advertencias: f.advertencias ?? [],
    }
  })

  const primerMes = {}
  for (const p of publicaciones.values()) {
    if (p.mes && (!primerMes[p.marcaClave] || p.mes < primerMes[p.marcaClave])) primerMes[p.marcaClave] = p.mes
  }
  const mesesConDatos = [...new Set(filas.map((f) => f.mes).filter(Boolean))].sort()
  const meses = rangoMeses(mesesConDatos[0], mesesConDatos[mesesConDatos.length - 1])

  return { filas, publicaciones, primerMes, meses, hoy }
}

// ---------- Filtros (Marca, País, Red, Período) ----------

export const FILTROS_VACIOS = { marca: null, pais: null, red: null, desde: null, hasta: null }

export function filtrarFilas(filas, filtros = FILTROS_VACIOS) {
  return filas.filter((f) => (!filtros.marca || f.marcaClave === filtros.marca)
    && (!filtros.pais || f.pais === filtros.pais)
    && (!filtros.red || f.red === filtros.red)
    && (!filtros.desde || (f.mes && f.mes >= filtros.desde))
    && (!filtros.hasta || (f.mes && f.mes <= filtros.hasta)))
}

/** Meses visibles: los del Excel, recortados por el período elegido. */
export const mesesVisibles = (meses, filtros) => meses.filter((m) => (!filtros.desde || m >= filtros.desde) && (!filtros.hasta || m <= filtros.hasta))

// ---------- Totales de cualquier grupo de filas ----------

const sumar = (filas, k) => filas.reduce((s, f) => s + (f[k] ?? 0), 0)

export function totales(filas, publicaciones) {
  const ids = [...new Set(filas.map((f) => f.publicacionId))]
  const pubs = ids.map((id) => publicaciones.get(id)).filter(Boolean)
  const leads = sumar(filas, 'leads')
  const calificados = sumar(filas, 'calificados')
  const cierres = sumar(filas, 'cierres')
  const pauta = sumar(filas, 'pauta')
  return {
    filas: filas.length,
    publicaciones: pubs.length,
    hechas: pubs.filter((p) => p.estado !== 'programada').length,
    programadas: pubs.filter((p) => p.estado === 'programada').length,
    leads,
    calificados,
    noCalificados: leads - calificados,
    cierres,
    unidades: sumar(filas, 'unidades'),
    pauta,
    alcance: sumar(filas, 'alcance'),
    visualizaciones: sumar(filas, 'visualizaciones'),
    clics: sumar(filas, 'clics'),
    interacciones: sumar(filas, 'interacciones'),
    costoLead: dividir(pauta, leads),
    costoCalificado: dividir(pauta, calificados),
    costoCliente: dividir(pauta, cierres),
    pctCalificados: dividir(calificados, leads),
    publicacionesIds: ids,
  }
}

// ---------- Resumen ----------

/** Pauta de cada marca (desglose del indicador "Pauta invertida"). */
export function pautaPorMarca(filas) {
  return MARCAS.map((m) => ({ ...m, pauta: sumar(filas.filter((f) => f.marcaClave === m.clave), 'pauta'), filas: filas.filter((f) => f.marcaClave === m.clave).length }))
    .filter((m) => m.filas > 0)
}

/**
 * Meta de 14 al mes: celda por marca y mes.
 * estado: cumplio (verde) · faltan (amarillo) · sin_posts (gris) · inicio (gris, D-G) · en_curso (gris, D-E)
 */
export function metaPorMarcaMes(filas, { publicaciones, meses, primerMes, hoy, marcas = MARCAS }) {
  const mesActual = mesDe(hoy)
  return marcas.map((m) => ({
    ...m,
    celdas: meses.map((mes) => {
      const propias = filas.filter((f) => f.marcaClave === m.clave && f.mes === mes)
      const ids = [...new Set(propias.map((f) => f.publicacionId))]
      const n = ids.length
      let estado
      if (mes === primerMes[m.clave]) estado = 'inicio'
      else if (mes === mesActual) estado = 'en_curso'
      else if (n >= META_MENSUAL) estado = 'cumplio'
      else if (n > 0) estado = 'faltan'
      else estado = 'sin_posts'
      return { mes, n, estado, faltan: Math.max(0, META_MENSUAL - n), filas: propias, publicaciones: ids.map((id) => publicaciones.get(id)) }
    }),
  }))
}

/** Leads por mes. "sin datos" = ninguna fila del mes tiene sus resultados cargados. */
export function leadsPorMes(filas, meses) {
  return meses.map((mes) => {
    const propias = filas.filter((f) => f.mes === mes)
    const leads = sumar(propias, 'leads')
    const calificados = sumar(propias, 'calificados')
    return {
      mes,
      leads,
      calificados,
      noCalificados: leads - calificados,
      cierres: sumar(propias, 'cierres'),
      unidades: sumar(propias, 'unidades'),
      sinDatos: !propias.some((f) => f.estadoFila === 'publicada'),
      filas: propias,
    }
  })
}

/** Resultados por país (El Salvador = RED El Salvador + Datared) con fila de Total. */
export function porPais(filas, publicaciones) {
  const paises = PAISES.map((p) => {
    const propias = filas.filter((f) => f.pais === p.clave)
    const marcas = MARCAS.filter((m) => m.pais === p.clave && propias.some((f) => f.marcaClave === m.clave)).map((m) => m.nombre)
    return { ...p, marcas, filasLista: propias, ...totales(propias, publicaciones) }
  }).filter((p) => p.filas > 0)
  return { paises, total: totales(filas, publicaciones) }
}

export function porMarca(filas, publicaciones) {
  return MARCAS.map((m) => {
    const propias = filas.filter((f) => f.marcaClave === m.clave)
    return { ...m, filasLista: propias, ...totales(propias, publicaciones) }
  }).filter((m) => m.filas > 0)
}

export function porRed(filas, publicaciones) {
  return REDES.map((red) => {
    const propias = filas.filter((f) => f.red === red)
    return { red, filasLista: propias, ...totales(propias, publicaciones) }
  }).filter((r) => r.filas > 0)
}

const pct = (n) => `${Math.round(n * 100)} %`

/** Nota de "Facebook vs. Instagram" calculada con los datos (no es texto fijo). */
export function hallazgoRedes(redes) {
  const fb = redes.find((r) => r.red === 'Facebook')
  const ig = redes.find((r) => r.red === 'Instagram')
  const sinRed = redes.find((r) => r.red === 'Sin red')
  const alcanceTotal = (fb?.alcance ?? 0) + (ig?.alcance ?? 0)
  const leadsTotal = redes.reduce((s, r) => s + r.leads, 0)
  const partes = []
  if (!fb || !ig) {
    const unica = fb ?? ig
    if (unica) partes.push(`Con los filtros actuales solo hay datos de ${unica.red}.`)
  } else if (pocos(leadsTotal)) {
    partes.push(`Hay muy pocos leads (${leadsTotal}) para comparar las dos redes.`)
  } else {
    const mas = fb.leads >= ig.leads ? fb : ig
    const menos = mas === fb ? ig : fb
    const alcMenos = dividir(menos.alcance, alcanceTotal) ?? 0
    const leadsMenos = dividir(menos.leads, leadsTotal) ?? 0
    if (alcMenos > 0 && leadsMenos < alcMenos / 2) {
      const parteLeads = leadsMenos < 0.01 ? 'casi ningún lead' : `solo el ${pct(leadsMenos)} de los leads`
      partes.push(`${menos.red} da el ${pct(alcMenos)} del alcance pero ${parteLeads} (${menos.leads} de ${leadsTotal}). Los leads llegan sobre todo por ${mas.red} (${mas.leads}).`)
    } else {
      partes.push(`${mas.red} trae el ${pct(dividir(mas.leads, leadsTotal) ?? 0)} de los leads (${mas.leads} de ${leadsTotal}) con el ${pct(dividir(mas.alcance, alcanceTotal) ?? 0)} del alcance.`)
    }
  }
  if (sinRed) partes.push(`Además, hay ${sinRed.filas} ${sinRed.filas === 1 ? 'fila' : 'filas'} sin red social que no entran en ninguna de las dos.`)
  return partes.join(' ')
}

// ---------- Informe detallado ----------

/**
 * Botones del Informe: publicaciones por su estado de PUBLICACIÓN (conteos y meta) y filas por su
 * estado PROPIO (lo que se ve en cada fila de la tabla).
 */
export function conteoEstados(filas, publicaciones) {
  const conteo = {}
  for (const clave of Object.keys(ESTADOS)) {
    const ids = new Set(filas.filter((f) => f.estado === clave).map((f) => f.publicacionId))
    conteo[clave] = { publicaciones: ids.size, filas: filas.filter((f) => f.estadoFila === clave).length }
  }
  conteo.revisar = { filas: filas.filter((f) => f.advertencias.length).length }
  return conteo
}

export const ORDEN_INFORME = {
  leads: (a, b) => (b.leads ?? -1) - (a.leads ?? -1) || (b.fecha ?? '').localeCompare(a.fecha ?? ''),
  recientes: (a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '') || a.marca.localeCompare(b.marca) || a.red.localeCompare(b.red),
}

export function filasInforme(filas, { vista = 'leads', busqueda = '' } = {}) {
  const texto = busqueda.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  let lista = filas
  // Las vistas de estado filtran por el estado PROPIO de cada fila (el que se ve en la tabla).
  if (vista === 'sin_metricas') lista = lista.filter((f) => f.estadoFila === 'sin_metricas')
  if (vista === 'incompleta') lista = lista.filter((f) => f.estadoFila === 'incompleta')
  if (vista === 'revisar') lista = lista.filter((f) => f.advertencias.length)
  if (texto) {
    lista = lista.filter((f) => `${f.campana} ${f.marca} ${f.red} ${f.link ?? ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(texto))
  }
  const orden = vista === 'recientes' ? ORDEN_INFORME.recientes : vista === 'leads' ? ORDEN_INFORME.leads : ORDEN_INFORME.recientes
  return [...lista].sort(orden)
}
