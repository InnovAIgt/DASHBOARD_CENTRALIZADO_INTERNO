// CANDADO de Cumplimiento de Clientes: SOLO LECTURA (regla de CLAUDE.md).
// Esta prueba FALLA si algún archivo de server/clientes/ contiene una operación de escritura (SQL o HTTP), y revisa
// que la lectura corra en una transacción READ ONLY que siempre se deshace. No se conecta a ninguna base.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { CONSULTA_CARTERA, CONSULTA_CONTEOS, CONSULTA_CRUCE, contactosCumplimiento, exigirSoloLectura, leerSoloLectura, vaciarCacheCumplimiento } from './cumplimiento.js'

const CARPETA = path.dirname(fileURLToPath(import.meta.url))
const ARCHIVOS = fs.readdirSync(CARPETA).filter((f) => /\.(js|mjs|ts)$/.test(f) && !f.endsWith('.test.js'))

/** Patrones de escritura reales (SQL y HTTP). */
const ESCRITURA = [
  /\binsert\s+into\b/i, /\bupdate\s+[\w."]+\s+set\b/i, /\bdelete\s+from\b/i, /\bupsert\b/i, /\bmerge\s+into\b/i,
  /\btruncate\s+(table\s+)?[\w."]/i, /\balter\s+(table|role|policy|function|schema|database|default)\b/i,
  /\bcreate\s+(or\s+replace\s+)?(table|function|role|policy|index|view|schema|trigger|extension|user)\b/i,
  /\bdrop\s+(table|function|role|policy|index|view|schema|trigger|extension|user)\b/i,
  /\bgrant\s+\w+\s+on\b/i, /\brevoke\s+\w+\s+on\b/i, /['"`]\s*commit\s*['"`]/i, /\bcopy\s+[\w."]+\s+from\b/i,
  /\/rpc\//i, /\.rpc\s*\(/i, /method\s*:\s*['"`](post|patch|put|delete)['"`]/i, /resolution\s*=\s*merge-duplicates/i,
]

test('ningún archivo de server/clientes/ contiene operaciones de escritura', () => {
  assert.ok(ARCHIVOS.length > 0, 'debe haber al menos un archivo que revisar')
  for (const archivo of ARCHIVOS) {
    const texto = fs.readFileSync(path.join(CARPETA, archivo), 'utf8')
    for (const patron of ESCRITURA) assert.ok(!patron.test(texto), `${archivo} contiene una escritura (${patron})`)
  }
})

test('las consultas del módulo son de solo lectura', () => {
  exigirSoloLectura(CONSULTA_CRUCE)
  exigirSoloLectura(CONSULTA_CONTEOS)
  exigirSoloLectura(CONSULTA_CARTERA)
})

test('exigirSoloLectura rechaza cualquier escritura o truco', () => {
  for (const sql of [
    "insert into public.clientes values ('x')",
    "update public.contactos set email = ''",
    'delete from public.clientes',
    'select 1; delete from public.clientes',
    'with x as (delete from public.clientes returning *) select * from x',
    'select * from public.clientes for update',
    'select set_config(1)', // palabra «set» no permitida
    'drop table public.clientes',
    'truncate public.clientes',
    '',
  ]) assert.throws(() => exigirSoloLectura(sql), /Cumplimiento/, sql)
  assert.doesNotThrow(() => exigirSoloLectura('select 1'))
})

/** Cliente de Postgres falso: anota las consultas y la configuración. No se conecta a nada. */
function clienteFalso(filas = [{ email: 'persona1@example.com' }]) {
  const registro = { consultas: [], config: null, conecto: false, cerro: false }
  class Falso {
    constructor(config) { registro.config = config }
    async connect() { registro.conecto = true }
    async query(sql) { registro.consultas.push(sql); return { rows: /^\s*(select|with)/i.test(sql) ? filas : [] } }
    async end() { registro.cerro = true }
  }
  return { Falso, registro }
}

test('la lectura corre en transacción READ ONLY y SIEMPRE termina con ROLLBACK', async () => {
  const { Falso, registro } = clienteFalso()
  const filas = await leerSoloLectura('select 1', { env: { CC_DB_PASSWORD: 'clave-inventada' }, Cliente: Falso })
  assert.equal(filas.length, 1)
  assert.equal(registro.config.options, '-c default_transaction_read_only=on')
  assert.ok(registro.config.statement_timeout > 0)
  assert.equal(registro.consultas[0], 'BEGIN TRANSACTION READ ONLY')
  assert.match(registro.consultas[1], /^SET LOCAL statement_timeout = \d+$/)
  assert.equal(registro.consultas.at(-1), 'ROLLBACK')
  assert.ok(!registro.consultas.some((q) => /commit/i.test(q)), 'nunca confirma')
  assert.ok(registro.cerro)
})

test('una consulta de escritura se rechaza ANTES de conectarse', async () => {
  const { Falso, registro } = clienteFalso()
  await assert.rejects(leerSoloLectura('delete from public.clientes', { env: { CC_DB_PASSWORD: 'clave-inventada' }, Cliente: Falso }), /solo se permiten/)
  assert.equal(registro.conecto, false)
})

test('sin CC_DB_PASSWORD no se conecta', async () => {
  const { Falso, registro } = clienteFalso()
  await assert.rejects(leerSoloLectura('select 1', { env: {}, Cliente: Falso }), /CC_DB_PASSWORD/)
  assert.equal(registro.conecto, false)
})

test('caché de 30 minutos', async () => {
  vaciarCacheCumplimiento()
  const { Falso, registro } = clienteFalso()
  const env = { CC_DB_PASSWORD: 'clave-inventada' }
  await contactosCumplimiento({ env, Cliente: Falso, ahora: 0 })
  await contactosCumplimiento({ env, Cliente: Falso, ahora: 60_000 })
  assert.equal(registro.consultas.filter((q) => /public\.contactos/.test(q)).length, 1)
})
