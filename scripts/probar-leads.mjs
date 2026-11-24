// Canales de marketing · Mailing: prueba de lectura de los leads de Prospekt y su atribución a campañas.
//
// SOLO LEE (Prospekt con GET, campañas de Brevo y mkt_brevo_eventos en Supabase) y SOLO IMPRIME CONTEOS: nunca
// correos, teléfonos, nombres, códigos de prospecto ni la llave. No lee Cumplimiento de Clientes.
// Uso (desde la carpeta del repo, con las variables en .env.local):
//   node scripts/probar-leads.mjs
// Documentación: docs/marketing/v2/MAILING.md, sección 11.
import fs from 'node:fs'
import { leerEventos } from '../server/mktSupabase.js'
import { cargarCampanas } from '../server/mailing/campanas.js'
import { armarLeads, campanasParaLeads } from '../server/mailing/leads.js'
import { leerLeadsCalificados } from '../server/mailing/prospekt.js'

const texto = fs.readFileSync('.env.local', 'utf8')
const v = (n) => (texto.match(new RegExp(`^${n}=(.*)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, '')
const env = Object.fromEntries(['PROSPEKT_API_KEY', 'BREVO_API_KEY', 'MKT_SUPABASE_URL', 'MKT_SUPABASE_SECRET_KEY'].map((n) => [n, v(n)]))

// Forma (no valor) de fecha_creado y hora_creado: cada dígito se cambia por 9, para revisar el formato.
const formas = { fecha: new Map(), hora: new Map(), listas: [] }
const sumar = (m, k) => m.set(k, (m.get(k) ?? 0) + 1)
const fetchEspia = async (url, op) => {
  const r = await fetch(url, op)
  if (!String(url).includes('prospektia')) return r
  const cuerpo = await r.text()
  try {
    const j = JSON.parse(cuerpo)
    formas.listas = Object.entries(j).map(([k, x]) => `${k}: ${Array.isArray(x) ? `lista de ${x.length}` : x && typeof x === 'object' ? `objeto con ${Object.keys(x).length} claves` : typeof x}`)
    for (const l of Array.isArray(j.leads) ? j.leads : []) {
      sumar(formas.fecha, String(l.fecha_creado ?? '(vacío)').replace(/\d/g, '9'))
      sumar(formas.hora, String(l.hora_creado ?? '(vacío)').replace(/\d/g, '9'))
    }
  } catch { /* no es JSON: lo reporta leerLeadsCalificados */ }
  return new Response(cuerpo, { status: r.status, headers: r.headers })
}

const lectura = await leerLeadsCalificados({ env, fetchFn: fetchEspia })
const { campanas } = await cargarCampanas({ env, leerCargos: async () => new Map() })
const eventos = await leerEventos({ env })
const { filas, resumen } = armarLeads({ leads: lectura.leads, campanas, eventos, ejecutivos: null })

const tabla = (m) => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `   ${k}: ${n}`).join('\n')
const contar = (lista, clave) => lista.reduce((m, x) => sumar(m, clave(x)), new Map())

console.log('Respuesta de Prospekt:', formas.listas.join(' · '))
console.log(`Registros: ${lectura.registros} · únicos por código: ${lectura.leads.length} · sin código: ${lectura.sinCodigo}`)
console.log('Forma de fecha_creado:\n' + tabla(formas.fecha))
console.log('Forma de hora_creado:\n' + tabla(formas.hora))
console.log(`Campañas que pueden recibir leads (enviadas, no de prueba): ${campanasParaLeads(campanas).length} de ${campanas.length}`)
console.log(`Eventos leídos de mkt_brevo_eventos: ${eventos.length}`)
console.log(`\nLeads: ${resumen.total} · exactos: ${resumen.exactas} · estimados: ${resumen.estimadas} · sin campaña: ${resumen.sinCampana} · cerrados (etapa 6): ${resumen.cerrados} · sin fecha: ${resumen.sinFecha}`)
console.log('Exactos por motivo:\n' + tabla(contar(filas.filter((f) => f.atribucion === 'exacta'), (f) => f.motivo)))
console.log('Por campaña o grupo (exactos + estimados):')
const porCampana = new Map()
for (const f of filas.filter((x) => x.atribucion !== 'sin_campana')) {
  const k = f.grupo ?? `Campaña ${f.campanas[0]}`
  const g = porCampana.get(k) ?? { exactos: 0, estimados: 0, cerrados: 0 }
  g[f.atribucion === 'exacta' ? 'exactos' : 'estimados']++
  if (f.cerrado) g.cerrados++
  porCampana.set(k, g)
}
for (const [k, g] of [...porCampana].sort((a, b) => b[1].exactos + b[1].estimados - a[1].exactos - a[1].estimados)) console.log(`   ${k}: exactos ${g.exactos} · estimados ${g.estimados} · cerrados ${g.cerrados}`)
console.log('Origen (validator_source) de los leads:\n' + tabla(contar(filas, (f) => f.origen ?? '(vacío)')))
console.log('Origen de los SIN campaña:\n' + tabla(contar(filas.filter((f) => f.atribucion === 'sin_campana'), (f) => f.origen ?? '(vacío)')))
console.log('País:\n' + tabla(contar(filas, (f) => f.pais ?? '(vacío)')))
console.log('Etapa (opportunity_stage):\n' + tabla(contar(filas, (f) => String(f.etapa ?? '(vacío)'))))
