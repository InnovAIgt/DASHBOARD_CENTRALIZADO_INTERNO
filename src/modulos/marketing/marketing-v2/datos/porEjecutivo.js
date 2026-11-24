// Canales de marketing · Mailing · «Por comercial»: resultados por ejecutivo de ventas.
// Se calcula con el DETALLE POR PERSONA (historial importado + webhook) cruzado con Cumplimiento de Clientes (solo
// lectura), porque los totales de Brevo no se pueden separar por cliente. Solo cuenta la coincidencia EXACTA: los
// «posibles por dominio» y los que no están en la base van a «Sin identificar» (decisión de Keily).
// La cartera (clientes asignados por país) viene de la consulta de solo lectura aprobada el 23/11/2026.
import { porcentaje, semaforoEntrega } from './calculos.js'

export const SIN_IDENTIFICAR = 'Sin identificar'
export const NOMBRE_PAIS = { GT: 'Guatemala', SV: 'El Salvador' }

/** «El Salvador», «Guatemala» o «GT y SV». */
export function textoPaises(paises) {
  const lista = [...paises].filter(Boolean).sort()
  if (!lista.length) return ''
  return lista.length === 1 ? (NOMBRE_PAIS[lista[0]] ?? lista[0]) : lista.join(' y ')
}

/**
 * Una fila por ejecutivo con sus cifras. filas = correo + campaña (ya con los filtros de arriba).
 * carteras = [{ejecutivo, pais, clientes}] o null si no se pudo leer.
 */
export function metricasPorEjecutivo(filas = [], carteras = null) {
  const grupos = new Map()
  const grupo = (nombre) => {
    if (!grupos.has(nombre)) {
      grupos.set(nombre, { ejecutivo: nombre, sinIdentificar: nombre === SIN_IDENTIFICAR, filas: [], campanas: new Set(), paisesEnvio: new Set(), clientesAlcanzados: new Set() })
    }
    return grupos.get(nombre)
  }
  for (const f of filas) {
    const exactas = f.clientes ?? []
    const nombres = [...new Set(exactas.map((e) => e.ejecutivo || SIN_IDENTIFICAR))]
    for (const nombre of nombres.length ? nombres : [SIN_IDENTIFICAR]) {
      const g = grupo(nombre)
      g.filas.push(f)
      g.campanas.add(f.campana_id)
      for (const e of exactas.filter((x) => (x.ejecutivo || SIN_IDENTIFICAR) === nombre)) {
        g.paisesEnvio.add(e.pais)
        g.clientesAlcanzados.add(`${e.pais}-${e.codigo}`)
      }
    }
  }
  return [...grupos.values()].map((g) => {
    const t = { enviados: g.filas.length, entregados: 0, aperturas: 0, clics: 0, rebotes: 0, casosCorregir: 0 }
    const corregir = new Set()
    for (const f of g.filas) {
      if (f.estado === 'entregado') t.entregados += 1
      if (f.apertura === 'APERTURA REGISTRADA') t.aperturas += 1
      if (f.clic === 'CLIC REGISTRADO') t.clics += 1
      if (f.estado === 'rebote_temporal' || f.estado === 'rebote_permanente') t.rebotes += 1
      if (f.status === 'CORREGIR') { t.casosCorregir += 1; corregir.add(String(f.correo).toLowerCase()) }
    }
    const propias = g.sinIdentificar || !carteras ? [] : carteras.filter((c) => c.ejecutivo === g.ejecutivo)
    const paisesCartera = new Set(propias.filter((c) => c.clientes > 0).map((c) => c.pais))
    return {
      ejecutivo: g.ejecutivo,
      sinIdentificar: g.sinIdentificar,
      filas: g.filas,
      totales: { ...t, corregir: corregir.size },
      campanas: [...g.campanas].sort((a, b) => b - a),
      // Cartera completa (Cumplimiento); null si no se pudo leer o si es «Sin identificar».
      cartera: g.sinIdentificar || !carteras ? null : propias.reduce((n, c) => n + c.clientes, 0),
      clientesAlcanzados: g.clientesAlcanzados.size,
      paises: paisesCartera.size ? paisesCartera : g.paisesEnvio,
      tasas: {
        entrega: porcentaje(t.entregados, t.enviados),
        apertura: porcentaje(t.aperturas, t.entregados),
        clic: porcentaje(t.clics, t.entregados),
        rebote: porcentaje(t.rebotes, t.enviados),
        corregir: porcentaje(t.casosCorregir, t.enviados),
      },
      semaforo: semaforoEntrega(t.entregados, t.enviados),
    }
  })
}

/**
 * Detalle de la cartera de UN ejecutivo (acordeón de «Por comercial»), con sus filas correo + campaña.
 * Agrupa por empresa (País + Código) de ese ejecutivo; en «Sin identificar» agrupa por dirección de correo.
 *  - interesados: dio clic en alguna campaña, o abrió (apertura registrada) 2 o más campañas → «Llamar».
 *  - noReciben: tiene direcciones marcadas CORREGIR (rebotaron) → motivo y «Corregir».
 *  - nuncaAbren: recibió campañas pero ninguna apertura registrada ni clic → «0 de N».
 *  - campanas: por campaña, entrega y apertura de SU cartera (semáforo en la entrega).
 */
export function detalleCartera(e) {
  const nombre = e.ejecutivo
  const grupos = new Map()
  for (const f of e.filas) {
    const propias = (f.clientes ?? []).filter((x) => (x.ejecutivo || SIN_IDENTIFICAR) === nombre)
    const claves = propias.length ? propias.map((x) => [`${x.pais}-${x.codigo}`, x.cliente]) : [[`correo:${String(f.correo).toLowerCase()}`, String(f.correo).toLowerCase()]]
    for (const [clave, etiqueta] of claves) {
      const g = grupos.get(clave) ?? { clave, nombre: etiqueta, filas: [] }
      g.filas.push(f)
      grupos.set(clave, g)
    }
  }
  const interesados = []
  const noReciben = []
  const nuncaAbren = []
  for (const g of grupos.values()) {
    const campanas = new Set(g.filas.map((f) => f.campana_id))
    const clic = g.filas.find((f) => f.clic === 'CLIC REGISTRADO')
    const abiertas = new Set(g.filas.filter((f) => f.apertura === 'APERTURA REGISTRADA').map((f) => f.campana_id))
    if (clic) interesados.push({ nombre: g.nombre, motivo: 'clic', campanaId: clic.campana_id, abiertas: abiertas.size, de: campanas.size })
    else if (abiertas.size >= 2) interesados.push({ nombre: g.nombre, motivo: 'aperturas', abiertas: abiertas.size, de: campanas.size })
    const corregir = g.filas.filter((f) => f.status === 'CORREGIR')
    if (corregir.length) noReciben.push({ nombre: g.nombre, motivo: corregir[0].motivoTecnico ?? 'Pendiente de verificar', correos: new Set(corregir.map((f) => String(f.correo).toLowerCase())).size })
    const entregadas = new Set(g.filas.filter((f) => f.estado === 'entregado').map((f) => f.campana_id))
    if (entregadas.size && !abiertas.size && !clic) nuncaAbren.push({ nombre: g.nombre, de: entregadas.size })
  }
  const porId = new Map()
  for (const f of e.filas) porId.set(f.campana_id, [...(porId.get(f.campana_id) ?? []), f])
  const campanas = [...porId].map(([id, filas]) => {
    const entregados = filas.filter((f) => f.estado === 'entregado').length
    return { id, enviados: filas.length, entrega: porcentaje(entregados, filas.length), apertura: porcentaje(filas.filter((f) => f.apertura === 'APERTURA REGISTRADA').length, entregados), semaforo: semaforoEntrega(entregados, filas.length) }
  }).sort((a, b) => b.id - a.id)
  const orden = (a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es')
  return {
    interesados: interesados.sort((a, b) => (a.motivo === b.motivo ? orden(a, b) : a.motivo === 'clic' ? -1 : 1)),
    noReciben: noReciben.sort(orden),
    nuncaAbren: nuncaAbren.sort((a, b) => b.de - a.de || orden(a, b)),
    campanas,
  }
}
/**
 * Vista por ejecutivo y territorio: una fila por EJECUTIVO + PAÍS (territorio del cliente en Cumplimiento) y un
 * subtotal por país. Una fila correo + campaña cuenta en cada (ejecutivo, país) de sus clientes EXACTOS; sin
 * coincidencia exacta va a «Sin identificar» (país «—»). cartera = clientes de ese ejecutivo en ese país (o null).
 */
export function metricasPorTerritorio(filas = [], carteras = null) {
  const grupos = new Map()
  const sumar = (clave, base, f, cliente) => {
    if (!grupos.has(clave)) grupos.set(clave, { ...base, filas: 0, entregados: 0, aperturas: 0, clics: 0, casosCorregir: 0, corregir: new Set(), clientes: new Set(), campanas: new Set() })
    const g = grupos.get(clave)
    g.filas += 1
    if (f.estado === 'entregado') g.entregados += 1
    if (f.apertura === 'APERTURA REGISTRADA') g.aperturas += 1
    if (f.clic === 'CLIC REGISTRADO') g.clics += 1
    if (f.status === 'CORREGIR') { g.casosCorregir += 1; g.corregir.add(String(f.correo).toLowerCase()) }
    if (cliente) g.clientes.add(cliente)
    g.campanas.add(f.campana_id)
  }
  for (const f of filas) {
    const pares = new Map()
    for (const e of f.clientes ?? []) {
      const clave = `${e.ejecutivo || SIN_IDENTIFICAR}|${e.pais || '—'}`
      if (!pares.has(clave)) pares.set(clave, { ejecutivo: e.ejecutivo || SIN_IDENTIFICAR, pais: e.pais || '—', cliente: `${e.pais}-${e.codigo}` })
    }
    if (!pares.size) pares.set(`${SIN_IDENTIFICAR}|—`, { ejecutivo: SIN_IDENTIFICAR, pais: '—', cliente: null })
    for (const [clave, p] of pares) sumar(clave, { ejecutivo: p.ejecutivo, pais: p.pais }, f, p.cliente)
  }
  const cerrar = (g) => ({
    ejecutivo: g.ejecutivo,
    pais: g.pais,
    sinIdentificar: g.ejecutivo === SIN_IDENTIFICAR,
    cartera: g.ejecutivo === SIN_IDENTIFICAR || !carteras ? null : carteras.filter((c) => c.ejecutivo === g.ejecutivo && c.pais === g.pais).reduce((n, c) => n + c.clientes, 0),
    clientesAlcanzados: g.clientes.size,
    campanas: g.campanas.size,
    totales: { enviados: g.filas, entregados: g.entregados, aperturas: g.aperturas, clics: g.clics, casosCorregir: g.casosCorregir, corregir: g.corregir.size },
    tasas: { entrega: porcentaje(g.entregados, g.filas), apertura: porcentaje(g.aperturas, g.entregados), clic: porcentaje(g.clics, g.entregados) },
    semaforo: semaforoEntrega(g.entregados, g.filas),
  })
  const lista = [...grupos.values()].map(cerrar)
    .sort((a, b) => a.sinIdentificar - b.sinIdentificar || a.pais.localeCompare(b.pais) || b.totales.enviados - a.totales.enviados || a.ejecutivo.localeCompare(b.ejecutivo, 'es'))
  // Subtotal por país (territorio): filas únicas correo + campaña de ese país, sin contar dos veces.
  const paises = [...new Set(lista.filter((x) => !x.sinIdentificar).map((x) => x.pais))].sort()
  const territorios = paises.map((pais) => {
    const propias = filas.filter((f) => (f.clientes ?? []).some((e) => e.pais === pais))
    const t = { enviados: propias.length, entregados: 0, aperturas: 0, clics: 0 }
    const corregir = new Set()
    for (const f of propias) {
      if (f.estado === 'entregado') t.entregados += 1
      if (f.apertura === 'APERTURA REGISTRADA') t.aperturas += 1
      if (f.clic === 'CLIC REGISTRADO') t.clics += 1
      if (f.status === 'CORREGIR') corregir.add(String(f.correo).toLowerCase())
    }
    return {
      pais,
      ejecutivos: lista.filter((x) => x.pais === pais && !x.sinIdentificar).length,
      cartera: carteras ? carteras.filter((c) => c.pais === pais).reduce((n, c) => n + c.clientes, 0) : null,
      totales: { ...t, corregir: corregir.size },
      tasas: { entrega: porcentaje(t.entregados, t.enviados), apertura: porcentaje(t.aperturas, t.entregados), clic: porcentaje(t.clics, t.entregados) },
      semaforo: semaforoEntrega(t.entregados, t.enviados),
    }
  })
  return { filas: lista, territorios }
}
