// Pruebas de la limpieza de números (todos los ejemplos reales del Excel, DECISIONES D9).
import assert from 'node:assert/strict'
import test from 'node:test'
import { limpiarNumero } from './numeros.js'

const valor = (v) => limpiarNumero(v).valor

test('"mil" multiplica por 1000, con o sin espacio', () => {
  assert.equal(valor('5,8 mil '), 5800)
  assert.equal(valor('17,5mil'), 17500)
  assert.equal(valor('11mil'), 11000)
  assert.equal(valor('1,5 mil'), 1500)
  assert.equal(valor('10,5 mil'), 10500)
})

test('dinero con coma o punto decimal', () => {
  assert.equal(valor('$30,00'), 30)
  assert.equal(valor('$10.00'), 10)
  assert.equal(valor('$20,00'), 20)
  assert.equal(valor('$232,50'), 232.5)
})

test('quita saltos de línea y espacios', () => {
  assert.equal(valor('6\n'), 6)
  assert.equal(valor('  42 '), 42)
})

test('punto seguido de exactamente 3 dígitos = miles; si no, decimal', () => {
  assert.equal(valor('12.400'), 12400)
  assert.equal(valor('1.234.567'), 1234567)
  assert.equal(valor('12.4'), 12.4)
  assert.equal(valor('1.234,56'), 1234.56)
  assert.equal(valor('1,234.56'), 1234.56)
})

test('vacío, "-", "–" y "—" son SIN DATO (null), no cero; un 0 escrito sí es 0', () => {
  for (const v of [null, undefined, '', '   ', '-', '–', '—', '$ -']) assert.deepEqual(limpiarNumero(v), { valor: null, ok: true }, `valor ${JSON.stringify(v)}`)
  assert.deepEqual(limpiarNumero(0), { valor: 0, ok: true })
  assert.deepEqual(limpiarNumero('0'), { valor: 0, ok: true })
  assert.deepEqual(limpiarNumero('$0,00'), { valor: 0, ok: true })
})

test('números de Excel pasan tal cual', () => {
  assert.equal(valor(47), 47)
  assert.equal(valor(0.425531914893617), 0.43)
})

test('lo que no se puede interpretar queda como sin dato y avisa (ok = false)', () => {
  assert.deepEqual(limpiarNumero('abc'), { valor: null, ok: false })
  assert.deepEqual(limpiarNumero('1.2.3'), { valor: null, ok: false })
  assert.deepEqual(limpiarNumero('5 mil y algo'), { valor: null, ok: false })
})
