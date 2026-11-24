// Canales de marketing · Redes sociales: cálculos de las pantallas Resumen y Publicaciones (mockup v6).
// Sin pantalla ni red; se prueban con node --test. Trabajan con «items» del mes: publicaciones con estado
// (publicada / no_publicada / programada), como los arma datos/redesProgramadas.js.
import { costoPorMensaje, FORMATOS, MARCAS, resumenPublicaciones } from './redes.js'

export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/**
 * Meta de costo por mensaje por moneda, para el semáforo de la pauta. Por confirmar con el ingeniero (PENDIENTES):
 * hoy solo la del mockup en US$. Si una moneda no tiene meta, no hay semáforo (se muestra el costo sin color).
 */
export const META_COSTO_MENSAJE = { USD: 1.5 }
/** Tolerancia «cerca de la meta»: hasta 2.5 en US$ como el mockup (por confirmar). */
export const CERCA_COSTO_MENSAJE = { USD: 2.5 }

/** Día del mes de «hoy» si el mes pedido es el mes en curso; si no, null (mes cerrado). */
export function diaDeCorte(mes, hoy) {
  return hoy && String(hoy).slice(0, 7) === mes ? Number(String(hoy).slice(8, 10)) : null
}

/** Mismo período del mes anterior: solo los días ≤ corte (si el mes está en curso). */
export const mismoPeriodo = (items = [], corte = null) => (corte ? items.filter((p) => Number(String(p.fecha).slice(8, 10)) <= corte) : items)

/** Variación % de a contra b (null si no se puede). */
export const variacion = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? ((a - b) / b) * 100 : null)

/** Día de la semana (0 = lunes) de una fecha AAAA-MM-DD. */
export const diaSemana = (fecha) => (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7

/** Mejor día para publicar: interacciones promedio de las publicadas por día de la semana. */
export function mejorDia(items = []) {
  const dias = DIAS.map((nombre, i) => {
    const q = items.filter((p) => p.estado === 'publicada' && diaSemana(p.fecha) === i)
    return { dia: i, nombre, publicaciones: q.length, promedio: q.length ? q.reduce((n, p) => n + (Number(p.interacciones) || 0), 0) / q.length : 0 }
  })
  const max = Math.max(...dias.map((d) => d.promedio))
  return { dias, mejor: max > 0 ? dias.findIndex((d) => d.promedio === max) : null }
}

/** Calendario del mes: semanas que empiezan en lunes; cada día con sus items. */
export function calendarioMes(items = [], mes) {
  const [a, m] = String(mes).split('-').map(Number)
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate()
  const vacios = diaSemana(`${mes}-01`)
  return { vacios, dias: Array.from({ length: dias }, (_, i) => {
    const fecha = `${mes}-${String(i + 1).padStart(2, '0')}`
    return { dia: i + 1, fecha, items: items.filter((p) => p.fecha === fecha) }
  }) }
}

/** Programado vs publicado por marca (solo lo que ya debía salir): [{marca, programadas, publicadas, cumplimiento}]. */
export const programadoVsPublicado = (items = [], marcas = Object.keys(MARCAS)) => marcas.map((marca) => {
  const r = resumenPublicaciones(items.filter((p) => p.marca === marca))
  return { marca, programadas: r.aFecha, publicadas: r.cumplidas, cumplimiento: r.cumplimiento, semaforo: r.semaforo }
})

/** Top de publicaciones por interacciones. */
export const topPublicaciones = (items = [], n = 5) => items.filter((p) => p.estado === 'publicada')
  .sort((a, b) => b.interacciones - a.interacciones || a.fecha.localeCompare(b.fecha)).slice(0, n)

/** Semáforo del costo por mensaje de una campaña según la meta de su moneda: 'verde' | 'amarillo' | 'rojo' | null. */
export function semaforoCosto(costo, moneda) {
  const meta = META_COSTO_MENSAJE[moneda]
  if (!Number.isFinite(costo) || !meta) return null
  return costo <= meta ? 'verde' : costo <= (CERCA_COSTO_MENSAJE[moneda] ?? meta * 1.5) ? 'amarillo' : 'rojo'
}

/** Campañas con su costo por mensaje y semáforo, de la más barata a la más cara. */
export const pautaPorCampana = (anuncios = []) => anuncios.map((a) => {
  const costo = costoPorMensaje(a)
  return { ...a, costoMensaje: costo, semaforo: semaforoCosto(costo, a.moneda) }
}).sort((a, b) => (a.costoMensaje ?? Infinity) - (b.costoMensaje ?? Infinity))

/**
 * «Lo importante del mes» (píldoras de una línea), como el mockup v6:
 * marca con menor cumplimiento · formato que mejor rinde · mejor publicación · campañas caras.
 */
export function loImportante(items = [], anuncios = [], marcas = Object.keys(MARCAS)) {
  const out = []
  const cm = programadoVsPublicado(items, marcas).filter((x) => x.programadas > 0).sort((a, b) => a.cumplimiento - b.cumplimiento)
  if (cm.length) {
    const w = cm[0]
    out.push(w.cumplimiento < 100
      ? { tipo: 'cumplimiento', tono: 'rojo', texto: `${MARCAS[w.marca].corto}: faltaron ${w.programadas - w.publicadas}`, detalle: `publicó ${w.publicadas} de ${w.programadas}`, tip: 'La marca con menor cumplimiento de lo programado hasta hoy' }
      : { tipo: 'cumplimiento', tono: 'verde', texto: 'Todo lo programado salió', detalle: '', tip: 'Todas las marcas cumplieron lo programado hasta hoy' })
  }
  const pub = items.filter((p) => p.estado === 'publicada')
  const fs = Object.keys(FORMATOS).map((f) => {
    const q = pub.filter((p) => p.formato === f)
    return { f, n: q.length, prom: q.length ? q.reduce((n, p) => n + p.interacciones, 0) / q.length : 0 }
  }).filter((x) => x.n)
  if (fs.length > 1) {
    const prom = fs.reduce((n, x) => n + x.prom * x.n, 0) / fs.reduce((n, x) => n + x.n, 0)
    const b = [...fs].sort((a, c) => c.prom - a.prom)[0]
    if (prom > 0) out.push({ tipo: 'formato', tono: 'morado', formato: b.f, texto: `${FORMATOS[b.f]}s rinden ${(b.prom / prom).toFixed(1)}×`, detalle: 'el promedio', tip: `Interacciones promedio por ${FORMATOS[b.f].toLowerCase()} contra el promedio de todo` })
  }
  const [top] = topPublicaciones(items, 1)
  if (top) out.push({ tipo: 'top', tono: 'marca', marca: top.marca, texto: top.titulo, detalle: `${top.interacciones.toLocaleString('es-GT')} interacciones`, tip: `Mejor publicación · ${MARCAS[top.marca]?.corto ?? top.marca} · ${FORMATOS[top.formato] ?? top.formato}` })
  const conMeta = pautaPorCampana(anuncios).filter((a) => a.semaforo)
  if (conMeta.length) {
    const caras = conMeta.filter((a) => a.semaforo !== 'verde').length
    out.push({ tipo: 'pauta', tono: caras ? 'amarillo' : 'verde', texto: caras ? `${caras} de ${conMeta.length} campañas sobre la meta` : 'Pauta dentro de la meta',
      detalle: caras ? 'de costo por mensaje' : '', tip: 'Campañas con costo por mensaje arriba de la meta (meta por confirmar con el ingeniero)' })
  }
  return out
}

/** Ordenar la tabla de publicaciones: clave = fecha | marca | alcance | interacciones | tasa. */
export function ordenarPublicaciones(items = [], clave = 'fecha', dir = 'asc') {
  const valor = { fecha: (p) => p.fecha, marca: (p) => p.marca, alcance: (p) => p.alcance, interacciones: (p) => p.interacciones,
    tasa: (p) => (p.alcance ? p.interacciones / p.alcance : -1) }[clave] ?? ((p) => p.fecha)
  const s = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => (valor(a) > valor(b) ? 1 : valor(a) < valor(b) ? -1 : 0) * s || a.id.localeCompare(b.id))
}
