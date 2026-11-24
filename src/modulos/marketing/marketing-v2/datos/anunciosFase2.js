// Canales de marketing · Redes sociales · ANUNCIOS (fase 2, pedido de Ismael): cálculos y DATOS DE EJEMPLO de lo que
// la fase 1 todavía no pide a Meta.
//   Con forma real (rutas de la fase 1): impresiones, alcance, clics, gasto y mensajes por campaña → indicadores,
//   presupuestos (inversión vs mensajes) y tabla.
//   SOLO EJEMPLO hasta conectarlos (PENDIENTES): horarios (breakdown por hora), edad y sexo (breakdowns age, gender),
//   segmentaciones (por conjunto de anuncios), plataforma y ubicación (publisher_platform, platform_position) y
//   formularios (leads de Meta). Se generan proporcionales a los totales filtrados, con semilla fija, y la pantalla los
//   marca «Ejemplo». Nada de esto es real.
import { semaforoCosto } from './redesVista.js'

export const EDADES = ['18–24', '25–34', '35–44', '45–54', '55–64', '65+']
const PESO_EDAD = [0.08, 0.27, 0.31, 0.21, 0.1, 0.03]
const SEGMENTOS = [['Empresas logística GT 30–55', 'gt'], ['Dueños de flotas GT', 'gt'], ['Seguridad privada GT', 'gt'], ['Empresas SV 25–55', 'sv'],
  ['Transporte SV', 'sv'], ['Pymes tecnología SV', 'dr'], ['Gerentes TI SV', 'dr']]
export const UBICACIONES = [['fb-feed', 'FB · Feed', 'fb', 0.34, 1.3], ['fb-stories', 'FB · Stories', 'fb', 0.08, 1.9], ['fb-reels', 'FB · Reels', 'fb', 0.1, 1.6],
  ['ig-feed', 'IG · Feed', 'ig', 0.2, 1.7], ['ig-stories', 'IG · Stories', 'ig', 0.16, 1.4], ['ig-reels', 'IG · Reels', 'ig', 0.12, 1.2]]

function azar(semilla) { let s = semilla; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 } }
const semillaDe = (texto) => [...String(texto)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 233280, 7)

/** Totales con forma real: impresiones, alcance, frecuencia, clics, CTR, CPC y costo por mensaje (una moneda). */
export function indicadoresAnuncios(anuncios = []) {
  const suma = (k) => anuncios.reduce((n, a) => n + (Number(a[k]) || 0), 0)
  const impresiones = suma('visualizaciones')
  const alcance = suma('alcance')
  const clics = suma('clics')
  const gastado = suma('gastado')
  const mensajes = suma('mensajes')
  const div = (a, b) => (b > 0 ? a / b : null)
  return { impresiones, alcance, frecuencia: div(impresiones, alcance), clics, ctr: div(clics * 100, impresiones), gastado, cpc: div(gastado, clics), mensajes, costoMensaje: div(gastado, mensajes) }
}

/** Moneda principal de la selección (la de más campañas) y las campañas de esa moneda; nunca se mezclan monedas. */
export function monedaPrincipal(anuncios = []) {
  const cuenta = new Map()
  for (const a of anuncios) cuenta.set(a.moneda, (cuenta.get(a.moneda) ?? 0) + 1)
  const moneda = [...cuenta].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { moneda, campanas: anuncios.filter((a) => a.moneda === moneda), otras: [...cuenta.keys()].filter((m) => m !== moneda) }
}

/** Presupuestos: cada campaña con gasto, mensajes y si rinde mejor o peor que la meta de su moneda. */
export const presupuestos = (anuncios = []) => anuncios.map((a) => {
  const costo = a.mensajes > 0 ? a.gastado / a.mensajes : null
  return { id: a.id, campana: a.campana, marca: a.marca, moneda: a.moneda, gastado: a.gastado, mensajes: a.mensajes, costo, semaforo: semaforoCosto(costo, a.moneda) }
})

/** DATOS DE EJEMPLO de la fase 2, proporcionales a los totales filtrados. marcas = las que pasan el filtro. */
export function ejemploFase2({ mes, mensajes = 0, gastado = 0, impresiones = 0, marcas = ['gt', 'sv', 'dr'], redes = ['fb', 'ig'] }) {
  const r = azar(semillaDe(`${mes}|${marcas.join()}|${redes.join()}`))
  // Horarios: 7 días × 12 bloques de 2 horas (mensajes).
  const horas = Array.from({ length: 7 }, (_, d) => Array.from({ length: 12 }, (_, b) => {
    const h = b * 2
    let v = (h >= 8 && h <= 18 ? 1 : h >= 19 && h <= 21 ? 0.7 : 0.15) * (d < 5 ? 1 : 0.55) * (0.6 + r() * 0.8) * (mensajes / 40)
    if (d === 1 && (h === 10 || h === 12)) v *= 1.8
    if (d === 3 && h === 16) v *= 1.6
    return Math.round(v)
  }))
  const edades = EDADES.map((rango, i) => {
    const total = mensajes * PESO_EDAD[i]
    const hombres = Math.round(total * (0.58 + r() * 0.1))
    const gasto = gastado * PESO_EDAD[i] * (i === 0 || i === 5 ? 1.5 : i === 2 ? 0.8 : 1)
    return { rango, hombres, mujeres: Math.max(0, Math.round(total) - hombres), costo: total > 0 ? gasto / total : null }
  })
  const segs = SEGMENTOS.filter(([, m]) => marcas.includes(m))
  const segmentos = segs.map(([nombre, marca]) => {
    const g = (gastado / Math.max(1, segs.length)) * (0.6 + r() * 0.8)
    const m = Math.max(1, Math.round(g / (0.9 + r() * 2.4)))
    return { nombre, marca, gastado: g, mensajes: m, costo: g / m }
  }).sort((a, b) => a.costo - b.costo)
  const ubicaciones = UBICACIONES.filter(([, , red]) => redes.includes(red))
    .map(([clave, nombre, red, peso, costo]) => ({ clave, nombre, red, impresiones: Math.round(impresiones * peso), costoMensaje: costo }))
  return { fuente: 'ejemplo', horas, edades, segmentos, ubicaciones, formularios: Math.round(mensajes * 0.18) }
}
