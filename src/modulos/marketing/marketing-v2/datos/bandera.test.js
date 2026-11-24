// Pruebas de la bandera de Redes sociales.
import assert from 'node:assert/strict'
import test from 'node:test'
import { redesVisible } from './bandera.js'

test('redesVisible: Production muestra «Próximamente»; Preview y local, la pantalla; MKT_REDES_VISIBLE manda', () => {
  assert.equal(redesVisible({ VERCEL_ENV: 'production' }), false)
  assert.equal(redesVisible({ VERCEL_ENV: 'preview' }), true)
  assert.equal(redesVisible({}), true, 'en local no hay VERCEL_ENV')
  assert.equal(redesVisible({ VERCEL_ENV: 'production', MKT_REDES_VISIBLE: 'si' }), true)
  assert.equal(redesVisible({ VERCEL_ENV: 'production', MKT_REDES_VISIBLE: 'Sí' }), true)
  assert.equal(redesVisible({ VERCEL_ENV: 'preview', MKT_REDES_VISIBLE: 'no' }), false)
  assert.equal(redesVisible({ VERCEL_ENV: 'production', MKT_REDES_VISIBLE: 'quizá' }), false, 'un valor raro no cambia nada')
})
