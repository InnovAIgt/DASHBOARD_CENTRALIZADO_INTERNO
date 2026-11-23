// Pruebas de «Guardar cargo y objetivo» con clave de Marketing (datos y claves inventados; Supabase falso).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { firmarPermiso, leerPermiso, MAX_FALLOS, PERMISO_MS, responderCargo, vaciarIntentos } from './cargoEditar.js'
import { borrarCargoDeCampana, guardarCargoDeCampana, TABLA_CARGO } from '../mktSupabase.js'

const ENV = { MKT_CLAVE_EDICION: 'clave-inventada', MKT_SUPABASE_URL: 'https://proyecto-inventado.supabase.co', MKT_SUPABASE_SECRET_KEY: 'llave-inventada' }
const conocidas = async () => new Set([74, 75])
/** Supabase falso en memoria: registra cada escritura. */
function falso(filaPrevia = null) {
  const escrituras = []
  return {
    escrituras,
    leer: async () => filaPrevia,
    guardar: async (fila) => { escrituras.push(['guardar', fila]); return { cargo: fila.cargo, objetivo: fila.objetivo, asignadoPor: fila.asignado_por } },
    borrar: async (id) => { escrituras.push(['borrar', id]); return 1 },
  }
}
const base = (extra = {}) => ({ env: ENV, esperaFallo: 0, ip: 'ip-prueba', conocidas, ...extra })
const entrar = (clave, extra = {}) => responderCargo({ ...base(extra), method: 'POST', body: { accion: 'entrar', clave, nombre: 'Persona Inventada' } })
const json = (r) => JSON.parse(r.body)

test('clave correcta: da un permiso (sin la clave) y con él se guarda', async () => {
  vaciarIntentos()
  const r = await entrar('clave-inventada')
  assert.equal(r.status, 200)
  const { permiso, nombre } = json(r)
  assert.equal(nombre, 'Persona Inventada')
  assert.ok(!r.body.includes('clave-inventada'), 'la clave nunca se devuelve')
  const s = falso()
  const g = await responderCargo({ ...base(s), method: 'POST', body: { accion: 'guardar', permiso, campana_id: 74, cargo: 'GF', objetivo: '  Promover el dashboard de rondas ' } })
  assert.equal(g.status, 200)
  const [accion, fila] = s.escrituras[0]
  assert.equal(accion, 'guardar')
  assert.deepEqual([fila.campana_id, fila.cargo, fila.objetivo, fila.asignado_por], [74, 'GF', 'Promover el dashboard de rondas', 'Persona Inventada'])
  assert.ok(fila.asignado_en && fila.objetivo_asignado_en)
})

test('clave incorrecta o sin clave: no guarda nada', async () => {
  vaciarIntentos()
  const r = await entrar('otra')
  assert.equal(r.status, 401)
  assert.match(json(r).error, /Clave incorrecta/)
  const s = falso()
  const sinPermiso = await responderCargo({ ...base(s), method: 'POST', body: { accion: 'guardar', campana_id: 74, cargo: 'GG' } })
  assert.equal(sinPermiso.status, 401)
  const falsificado = await responderCargo({ ...base(s), method: 'POST', body: { accion: 'guardar', permiso: firmarPermiso('X', 'otra-clave'), campana_id: 74, cargo: 'GG' } })
  assert.equal(falsificado.status, 401)
  assert.equal(s.escrituras.length, 0)
})

test('sin MKT_CLAVE_EDICION en el servidor: 503 y nada se guarda', async () => {
  const s = falso()
  const r = await responderCargo({ ...base(s), env: { ...ENV, MKT_CLAVE_EDICION: '' }, method: 'POST', body: { accion: 'entrar', clave: 'x', nombre: 'Y' } })
  assert.equal(r.status, 503)
  assert.equal(s.escrituras.length, 0)
})

test('campaña inexistente, cargo inválido, sin nada que guardar y nombre vacío', async () => {
  const permiso = firmarPermiso('Persona Inventada', 'clave-inventada')
  const s = falso()
  assert.equal((await responderCargo({ ...base(s), method: 'POST', body: { accion: 'guardar', permiso, campana_id: 999, cargo: 'GG' } })).status, 404)
  assert.equal((await responderCargo({ ...base(s), method: 'POST', body: { accion: 'guardar', permiso, campana_id: 74, cargo: 'XX' } })).status, 400)
  assert.equal((await responderCargo({ ...base(s), method: 'POST', body: { accion: 'guardar', permiso, campana_id: 74, cargo: '', objetivo: '  ' } })).status, 400)
  assert.equal((await responderCargo({ ...base(s), method: 'POST', body: { accion: 'entrar', clave: 'clave-inventada', nombre: '   ' } })).status, 400)
  assert.equal(s.escrituras.length, 0)
})

test('volver a lo sugerido: borra solo la fila de esa campaña', async () => {
  const permiso = firmarPermiso('Persona Inventada', 'clave-inventada')
  const s = falso()
  const r = await responderCargo({ ...base(s), method: 'DELETE', body: { permiso, campana_id: 75 } })
  assert.equal(r.status, 200)
  assert.deepEqual(s.escrituras, [['borrar', 75]])
})

test('las fechas solo cambian si cambió ese dato; sin objetivo, su fecha queda vacía', async () => {
  const permiso = firmarPermiso('Persona Inventada', 'clave-inventada')
  const previa = { cargo: 'GG', objetivo: 'Control de turnos y personal', asignado_en: '2026-01-01T00:00:00.000Z', objetivo_asignado_en: '2026-01-02T00:00:00.000Z' }
  const s = falso(previa)
  await responderCargo({ ...base(s), method: 'POST', body: { accion: 'guardar', permiso, campana_id: 74, cargo: 'GG', objetivo: 'Mejorar la productividad' } })
  const [, f] = s.escrituras[0]
  assert.equal(f.asignado_en, previa.asignado_en, 'el cargo no cambió')
  assert.notEqual(f.objetivo_asignado_en, previa.objetivo_asignado_en, 'el objetivo cambió')
  const s2 = falso(previa)
  await responderCargo({ ...base(s2), method: 'POST', body: { accion: 'guardar', permiso, campana_id: 74, cargo: 'GF', objetivo: '' } })
  assert.equal(s2.escrituras[0][1].objetivo_asignado_en, null)
})

test('límite de intentos: tras 5 claves incorrectas, 429 aunque la clave sea correcta', async () => {
  vaciarIntentos()
  for (let i = 0; i < MAX_FALLOS; i++) assert.equal((await entrar('mala', { ip: 'ip-atacante' })).status, 401)
  assert.equal((await entrar('clave-inventada', { ip: 'ip-atacante' })).status, 429)
  assert.equal((await entrar('clave-inventada', { ip: 'otra-ip' })).status, 200, 'otra dirección no queda bloqueada')
})

test('permiso: vence a las 8 horas y no se puede alterar', () => {
  const p = firmarPermiso('Persona Inventada', 'clave-inventada', 0)
  assert.equal(leerPermiso(p, 'clave-inventada', PERMISO_MS - 1), 'Persona Inventada')
  assert.equal(leerPermiso(p, 'clave-inventada', PERMISO_MS + 1), null)
  const [datos, sello] = p.split('.')
  const otro = Buffer.from(JSON.stringify({ n: 'Otra Persona', v: PERMISO_MS })).toString('base64url')
  assert.equal(leerPermiso(`${otro}.${sello}`, 'clave-inventada', 0), null)
  assert.equal(leerPermiso(`${datos}.${sello}`, 'otra-clave', 0), null)
})

test('nunca escribe en otra tabla: Supabase solo recibe mkt_campana_cargo; el archivo no nombra otras tablas ni Cumplimiento', async () => {
  const llamadas = []
  const fetchFn = async (url, op) => { llamadas.push({ url, metodo: op?.method ?? 'GET' }); return Response.json([{ campana_id: 74, cargo: 'GG' }]) }
  await guardarCargoDeCampana({ campana_id: 74, cargo: 'GG', objetivo: null, asignado_por: 'X', asignado_en: 'hoy' }, { env: ENV, fetchFn })
  await borrarCargoDeCampana(74, { env: ENV, fetchFn })
  assert.equal(TABLA_CARGO, 'mkt_campana_cargo')
  for (const l of llamadas) assert.ok(l.url.startsWith('https://proyecto-inventado.supabase.co/rest/v1/mkt_campana_cargo?'), l.url)
  assert.deepEqual(llamadas.map((l) => l.metodo), ['POST', 'DELETE'])
  const codigo = readFileSync(new URL('./cargoEditar.js', import.meta.url), 'utf8').replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, '')
  assert.ok(!/clientes\/|cumplimiento|mkt_brevo_eventos|from\(['"`]|rest\/v1\//i.test(codigo), 'la ruta no toca Cumplimiento ni otras tablas')
})
