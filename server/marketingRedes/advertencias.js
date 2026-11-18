/**
 * Redes sociales — ADVERTENCIAS DE DATOS (docs/marketing-redes/DECISIONES.md, D13).
 *
 * Reglas automáticas (nada se marca a mano). Solo se MUESTRAN en el Informe detallado (D-H):
 * ícono ⚠ en la fila, filtro "⚠ A revisar" y el detalle en la ficha de la publicación.
 *
 *   calificados_mayor   Calificados > leads en una fila.
 *   link_repetido       El mismo link en publicaciones distintas (aunque sean de otra marca).
 *   link_fb_ig          El mismo link en la fila de Facebook y en la de Instagram de una publicación.
 *   link_otra_red       Link de Facebook en la fila de Instagram o al revés.
 *   sin_red             Fila sin red social.
 *   costo_distinto      Costo escrito en el Excel distinto al recalculado con la pauta.
 *   total_distinto      La fila de TOTAL del Excel no coincide con la suma real de la hoja.
 *
 * No cambia ningún dato: solo agrega `advertencias` a cada fila y devuelve la lista general.
 */
import { claveLink, redDelLink } from './links.js'

const MARGEN = 0.01
const fechaCorta = (iso) => (iso ? iso.split('-').reverse().join('/') : 'sin fecha')
const describir = (f) => `${f.marca} · ${f.red} · ${fechaCorta(f.fecha)} (fila ${f.filaExcel} de "${f.hoja}")`
const dinero = (n) => `$${n.toFixed(2)}`

const COSTOS = [
  { clave: 'clic', etiqueta: 'Costo x clic', divisor: 'clics' },
  { clave: 'lead', etiqueta: 'Costo x Lead', divisor: 'leads' },
  { clave: 'cliente', etiqueta: 'Costo x Cliente', divisor: 'cierres' },
  { clave: 'unidad', etiqueta: 'Costo X Unidad', divisor: 'unidades' },
]

const TOTALES = [
  { clave: 'pauta', etiqueta: 'pauta', formato: dinero },
  { clave: 'leads', etiqueta: 'leads', formato: String },
  { clave: 'calificados', etiqueta: 'calificados', formato: String },
  { clave: 'cierres', etiqueta: 'cierres', formato: String },
  { clave: 'unidades', etiqueta: 'unidades', formato: String },
]

export function detectarAdvertencias(filas, totalesExcel = {}) {
  const porFila = new Map(filas.map((f) => [f.id, []]))
  const agregar = (fila, tipo, mensaje) => porFila.get(fila.id).push({ tipo, mensaje })
  const generales = []

  // 1. Calificados mayor que leads
  for (const f of filas) {
    if (f.leads !== null && f.calificados !== null && f.calificados > f.leads) {
      agregar(f, 'calificados_mayor', `Tiene ${f.calificados} calificados pero ${f.leads} leads. No calificados sale en ${f.leads - f.calificados}. Pídele a Marketing que corrija los leads o los calificados de esta fila.`)
    }
  }

  // 2 y 3. Links repetidos
  const porLink = new Map()
  for (const f of filas) {
    if (!f.link) continue
    const clave = claveLink(f.link)
    if (!porLink.has(clave)) porLink.set(clave, [])
    porLink.get(clave).push(f)
  }
  const conLinkFbIg = new Set()
  for (const grupo of porLink.values()) {
    if (grupo.length < 2) continue
    const publicaciones = new Set(grupo.map((f) => f.publicacionId))
    if (publicaciones.size > 1) {
      for (const f of grupo) {
        const otras = grupo.filter((o) => o.publicacionId !== f.publicacionId).map(describir)
        agregar(f, 'link_repetido', `El mismo link se usa en otra publicación: ${otras.join('; ')}. Revisa cuál es el link correcto.`)
      }
    }
    // Misma publicación con el mismo link en su fila de Facebook y en la de Instagram
    const porPublicacion = new Map()
    for (const f of grupo) {
      if (!porPublicacion.has(f.publicacionId)) porPublicacion.set(f.publicacionId, [])
      porPublicacion.get(f.publicacionId).push(f)
    }
    for (const mismas of porPublicacion.values()) {
      const redes = new Set(mismas.map((f) => f.red))
      if (redes.has('Facebook') && redes.has('Instagram')) {
        for (const f of mismas) {
          conLinkFbIg.add(f.id)
          agregar(f, 'link_fb_ig', `La fila de Facebook y la de Instagram tienen el mismo link (${redDelLink(f.link) ?? 'otro sitio'}). Falta el link de la otra red.`)
        }
      }
    }
  }

  // 4. Link de otra red (si ya se avisó con la regla 3, no se repite)
  for (const f of filas) {
    if (!f.link || conLinkFbIg.has(f.id) || (f.red !== 'Facebook' && f.red !== 'Instagram')) continue
    const delLink = redDelLink(f.link)
    if (delLink && delLink !== f.red) agregar(f, 'link_otra_red', `La fila es de ${f.red} pero el link es de ${delLink}.`)
  }

  // 5. Sin red social
  for (const f of filas) {
    if (f.red === 'Sin red') agregar(f, 'sin_red', 'La fila no tiene red social (Facebook o Instagram). Cuenta para la meta, pero no entra en "Facebook vs. Instagram".')
  }

  // 6. Costos del Excel distintos a los recalculados (si no hay divisor, Excel suele poner 0: eso no se avisa)
  for (const f of filas) {
    if (f.pauta === null) continue
    for (const c of COSTOS) {
      const excel = f.costosExcel?.[c.clave]
      if (excel === null || excel === undefined) continue
      const divisor = f[c.divisor]
      const calculado = divisor ? f.pauta / divisor : null
      const distinto = calculado === null ? excel !== 0 : Math.abs(calculado - excel) > MARGEN
      if (distinto) {
        // Pista: en el Excel actual "Costo x Lead" suele estar dividido entre los calificados.
        const conCalificados = c.clave === 'lead' && f.calificados ? f.pauta / f.calificados : null
        const pista = conCalificados !== null && Math.abs(conCalificados - excel) <= MARGEN
          ? ` Parece calculado con los calificados (${dinero(f.pauta)} ÷ ${f.calificados}), no con los leads.`
          : ''
        agregar(f, 'costo_distinto', `${c.etiqueta}: el Excel dice ${dinero(excel)} y con la pauta da ${calculado === null ? '— (no hay ' + c.divisor + ')' : dinero(calculado)}.${pista} El dashboard usa el recalculado.`)
      }
    }
  }

  // 7. Totales de la fila de TOTAL vs. suma real
  const marcas = [...new Map(filas.map((f) => [f.marcaClave, f])).values()]
  for (const m of marcas) {
    const total = totalesExcel[m.marcaClave]
    if (!total) continue
    const propias = filas.filter((f) => f.marcaClave === m.marcaClave)
    for (const t of TOTALES) {
      if (total[t.clave] === null || total[t.clave] === undefined) continue
      const suma = propias.reduce((s, f) => s + (f[t.clave] ?? 0), 0)
      if (Math.abs(suma - total[t.clave]) > MARGEN) {
        generales.push({
          tipo: 'total_distinto',
          marca: m.marca,
          mensaje: `${m.marca}: la fila de total del Excel (fila ${total.filaExcel} de "${m.hoja}") dice ${t.formato(total[t.clave])} de ${t.etiqueta}, pero la suma real es ${t.formato(suma)}. Excel no suma las celdas escritas como texto (por ejemplo "$20,00"). El dashboard usa la suma real.`,
        })
      }
    }
  }

  // Resumen por tipo para la lista general
  const conteo = {}
  for (const lista of porFila.values()) for (const a of lista) conteo[a.tipo] = (conteo[a.tipo] ?? 0) + 1
  return {
    filas: filas.map((f) => ({ ...f, advertencias: porFila.get(f.id) })),
    generales,
    conteo,
  }
}
