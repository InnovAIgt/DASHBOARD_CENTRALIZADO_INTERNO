// Prueba de la FUENTE intercambiable: con una fuente falsa (Excel de ejemplo) todo funciona sin
// cambiar nada más; sin archivo, mensaje claro y sin detalles técnicos.
import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { obtenerRedes } from '../marketingRedes.js'
import { obtenerArchivoRRSS } from './fuente.js'
import { crearLibroEjemplo } from './ejemplo/crearEjemplo.js'
import { prepararDatos, totales } from '../../src/modulos/marketing/redes/logica/calculos.js'

const aqui = path.dirname(fileURLToPath(import.meta.url))

test('la fuente de hoy lee el Excel y la fecha de info.json', async () => {
  const archivo = await obtenerArchivoRRSS()
  assert.ok(archivo.bytes.length > 1000)
  assert.match(archivo.actualizado, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(archivo.origen, 'Copia del Excel en línea de Marketing')
})

test('con una fuente FALSA (Excel de ejemplo en memoria) la ruta responde igual', async () => {
  const fuenteFalsa = async () => ({ bytes: crearLibroEjemplo(), actualizado: '2026-01-15', origen: 'Servicio de prueba' })
  const r = await obtenerRedes({ fuente: fuenteFalsa, sinCache: true })
  assert.equal(r.status, 200)
  const cuerpo = JSON.parse(r.body)
  assert.equal(cuerpo.origen, 'Servicio de prueba')
  assert.equal(cuerpo.filas.length, 13)
  const datos = prepararDatos(cuerpo.filas, '2026-11-17')
  assert.equal(totales(datos.filas, datos.publicaciones).publicaciones, 10)
})

test('con otra carpeta (copia de ejemplo en disco) también funciona', async () => {
  const r = await obtenerRedes({ fuente: () => obtenerArchivoRRSS({ carpeta: path.join(aqui, 'ejemplo', 'datos') }), sinCache: true })
  assert.equal(r.status, 200)
  assert.equal(JSON.parse(r.body).actualizado, '2026-01-15')
})

test('sin archivo: mensaje claro, sin rutas ni errores técnicos', async () => {
  const r = await obtenerRedes({ fuente: () => obtenerArchivoRRSS({ carpeta: path.join(aqui, 'no-existe') }), sinCache: true })
  assert.equal(r.status, 503)
  const cuerpo = JSON.parse(r.body)
  assert.equal(cuerpo.error, 'No hay datos de Redes sociales disponibles.')
  assert.ok(!r.body.includes(aqui) && !/ENOENT|stack|at /.test(r.body))
})

test('archivo dañado: mismo mensaje claro', async () => {
  const r = await obtenerRedes({ fuente: async () => ({ bytes: Buffer.from('esto no es un excel'), actualizado: null, origen: 'x' }), sinCache: true })
  assert.equal(r.status, 503)
  assert.equal(JSON.parse(r.body).error, 'No hay datos de Redes sociales disponibles.')
})

test('solo acepta GET', async () => {
  assert.equal((await obtenerRedes({ method: 'POST' })).status, 405)
})
