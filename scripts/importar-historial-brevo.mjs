// Canales de marketing · carga inicial del historial (MAILING.md, sección 10.3).
// Lee los CSV de Brevo de una carpeta FUERA del repo y los guarda en mkt_brevo_eventos (origen = historial) del
// proyecto «Dashboard Canales de marketing». Nunca toca Cumplimiento de Clientes. Nunca imprime correos ni motivos.
//
// Uso (desde la raíz del proyecto):
//   node scripts/importar-historial-brevo.mjs --carpeta "C:\ruta\fuera\del\repo" --campanas 1,2,3
//   node scripts/importar-historial-brevo.mjs --carpeta "…" --campanas 1,2,3 --cargar   ← solo así escribe
// Sin --cargar es una PRUEBA EN SECO: muestra conteos y no escribe nada. Correrlo dos veces no duplica (huella).
// Cada archivo debe conservar «campaign-[ID]» en el nombre, como lo exporta Brevo.
import fs from 'node:fs'
import path from 'node:path'
import { eventosDesdeCsv } from '../server/mailing/historialCsv.js'
import { resumirCampana } from '../server/mailing/resumen.js'

const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null }
const carpeta = arg('--carpeta')
const ids = String(arg('--campanas') ?? '').split(',').map((x) => Number(x.trim())).filter((x) => Number.isInteger(x) && x > 0)
const cargar = process.argv.includes('--cargar')
if (!carpeta || !ids.length) { console.log('Uso: --carpeta <carpeta con los CSV> --campanas 1,2,3 [--cargar]'); process.exit(1) }
if (path.resolve(carpeta).startsWith(path.resolve('.'))) { console.log('Los CSV deben estar FUERA del repo.'); process.exit(1) }

const archivos = fs.readdirSync(carpeta).filter((f) => /\.csv$/i.test(f))
const todas = []
console.log(cargar ? '=== CARGA REAL ===' : '=== PRUEBA EN SECO (no se escribe nada) ===')
for (const id of ids) {
  const archivo = archivos.find((f) => f.includes(`campaign-[${id}]`))
  if (!archivo) { console.log(`Campaña ${id}: no hay CSV`); continue }
  const { filas, problemas } = eventosDesdeCsv(fs.readFileSync(path.join(carpeta, archivo), 'utf8'), id)
  const r = resumirCampana(filas)
  const tipos = filas.reduce((m, f) => ({ ...m, [f.evento]: (m[f.evento] ?? 0) + 1 }), {})
  console.log(`Campaña ${id}: ${r.destinatarios} destinatarios · eventos ${JSON.stringify(tipos)} · estado final ${JSON.stringify(r.estados)} · CORREGIR ${r.status.CORREGIR}`)
  if (problemas.length) console.log(`  Problemas (${problemas.length}): ${problemas.slice(0, 5).join(' | ')}`)
  todas.push(...filas)
}

if (cargar && todas.length) {
  const env = fs.readFileSync('.env.local', 'utf8')
  const v = (n) => (env.match(new RegExp(`^${n}=(.*)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, '')
  const SB = v('MKT_SUPABASE_URL').replace(/\/+$/, '')
  const KEY = v('MKT_SUPABASE_SECRET_KEY')
  let nuevos = 0
  for (let i = 0; i < todas.length; i += 500) {
    const r = await fetch(`${SB}/rest/v1/mkt_brevo_eventos?on_conflict=huella&select=id`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(todas.slice(i, i + 500)),
    })
    if (!r.ok) { console.log(`Lote ${i / 500 + 1}: HTTP ${r.status}`); process.exit(1) }
    nuevos += (await r.json()).length
  }
  console.log(`Guardados nuevos: ${nuevos} de ${todas.length} (los demás ya estaban).`)
}
