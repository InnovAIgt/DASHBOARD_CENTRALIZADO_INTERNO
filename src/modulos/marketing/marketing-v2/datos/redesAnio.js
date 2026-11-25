// Canales de marketing · Redes sociales · «AÑO» de Resumen: por mes (enero → mes actual) publicaciones, alcance de las
// cuentas, inversión y mensajes de la pauta (sin reclutamiento) y leads de Redes (Prospekt). Cálculos puros, probados
// con node --test. Entrada: la respuesta de /api/marketing/redes/anio y los leads de /api/marketing/redes/leads.
//   anio = { meses: ['2026-01', …], filas: [{mes, marca, pais, red, publicaciones, alcance}],
//            anuncios: [{mes, marca, pais, moneda, gastado, mensajes, reclutamiento}] }

/** Medidas de la gráfica del año (una a la vez: nunca dos escalas en la misma gráfica). */
export const MEDIDAS_ANIO = [
  { k: 'publicaciones', nombre: 'Publicaciones', color: '#7fb0f0' },
  { k: 'alcance', nombre: 'Alcance', color: '#3987e5' },
  { k: 'inversion', nombre: 'Inversión', color: '#d9a520', dinero: true },
  { k: 'mensajes', nombre: 'Mensajes', color: '#3fcf8e' },
  { k: 'leads', nombre: 'Leads', color: '#d6589b' },
]

/**
 * Por mes, con los filtros de país, marca y red. Los leads se filtran por país (en El Salvador, Prospekt no dice la
 * marca: con una marca de SV elegida se cuentan los de todo SV y `leadsPorPais` lo avisa). La inversión va en la moneda
 * de la pauta (una sola; si hubiera varias, se usa la que más gastó y `otrasMonedas` lo avisa).
 */
export function anioPorMes(anio, leads = [], filtros = {}) {
  if (!anio?.meses?.length) return { meses: [], moneda: 'USD', otrasMonedas: false, leadsPorPais: false }
  const pais = filtros.pais || (filtros.marca === 'gt' ? 'GT' : filtros.marca ? 'SV' : '')
  const pasa = (x) => (!filtros.pais || x.pais === filtros.pais) && (!filtros.marca || x.marca === filtros.marca)
  const ads = (anio.anuncios ?? []).filter((a) => !a.reclutamiento && pasa(a))
  const porMoneda = {}
  for (const a of ads) porMoneda[a.moneda] = (porMoneda[a.moneda] ?? 0) + (Number(a.gastado) || 0)
  const moneda = Object.entries(porMoneda).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'USD'
  const meses = anio.meses.map((mes) => {
    const f = (anio.filas ?? []).filter((x) => x.mes === mes && pasa(x) && (!filtros.red || x.red === filtros.red))
    const a = ads.filter((x) => x.mes === mes && x.moneda === moneda)
    return {
      mes,
      publicaciones: f.reduce((n, x) => n + (x.publicaciones || 0), 0),
      alcance: f.reduce((n, x) => n + (x.alcance || 0), 0),
      inversion: Math.round(a.reduce((n, x) => n + (Number(x.gastado) || 0), 0) * 100) / 100,
      mensajes: a.reduce((n, x) => n + (Number(x.mensajes) || 0), 0),
      leads: leads.filter((l) => String(l.fecha).startsWith(mes) && (!pais || l.pais === pais)).length,
    }
  })
  return { meses, moneda, otrasMonedas: Object.keys(porMoneda).length > 1, leadsPorPais: Boolean(filtros.marca && filtros.marca !== 'gt') }
}

/** Totales del año (suma de los meses). */
export const totalesAnio = (meses = []) => Object.fromEntries(MEDIDAS_ANIO.map((m) => [m.k, meses.reduce((n, x) => n + (x[m.k] || 0), 0)]))
