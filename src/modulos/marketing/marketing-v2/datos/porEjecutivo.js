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
