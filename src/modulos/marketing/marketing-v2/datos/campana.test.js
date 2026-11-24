// Pruebas de cómo se nombra una campaña (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { campanaEnCorreo, columnasCampana, limpiarCampo, textosCampana } from './campana.js'

const C = { id: 74, asunto: 'Su industria está perdiendo productividad.', nombre: 'GERENTE GENERAL NOVIEMBRE 5', fecha: '2026-11-05T18:21:19.000Z', cargo: 'GG' }

test('textosCampana: asunto arriba y «#id · nombre · fecha» abajo', () => {
  const t = textosCampana(C)
  assert.equal(t.titulo, 'Su industria está perdiendo productividad.')
  assert.equal(t.linea, '#74 · GERENTE GENERAL NOVIEMBRE 5 · 05/11/2026')
  assert.equal(t.unaLinea, 'Su industria está perdiendo productividad. — #74 GERENTE GENERAL NOVIEMBRE 5')
  assert.equal(t.corto, 'Su industria está perdiendo productividad. · #74')
  assert.equal(textosCampana(C, 74, { fecha: false, cargo: true }).linea, '#74 · GERENTE GENERAL NOVIEMBRE 5 · Gerente General')
})

test('textosCampana: sin asunto, el nombre es el título y no se repite', () => {
  const t = textosCampana({ id: 3, asunto: '', nombre: 'Logistica Junio', fecha: null })
  assert.equal(t.titulo, 'Logistica Junio')
  assert.equal(t.linea, '#3')
  assert.equal(t.unaLinea, 'Logistica Junio — #3')
  assert.equal(textosCampana(null, 9).titulo, 'Campaña #9')
})

test('limpiarCampo y correo: {{ contact.NOMBRE }} → [NOMBRE]; «asunto (#id)»', () => {
  assert.equal(limpiarCampo('{{ contact.NOMBRE }}, Antes de\nllamar'), '[NOMBRE], Antes de llamar')
  assert.equal(campanaEnCorreo(C), 'Su industria está perdiendo productividad. (#74)')
})

test('columnasCampana: «Campaña (#)», «Asunto» y «Nombre de campaña», varias juntas', () => {
  const cols = columnasCampana((f) => f.campanas)
  assert.deepEqual(cols.map((c) => c.label), ['Campaña (#)', 'Asunto', 'Nombre de campaña'])
  const fila = { campanas: [C, { id: 75, asunto: 'Reduce tu tiempo muerto', nombre: 'GF NOV 9' }] }
  assert.deepEqual(cols.map((c) => c.valor(fila)), ['#74 / #75', 'Su industria está perdiendo productividad. / Reduce tu tiempo muerto', 'GERENTE GENERAL NOVIEMBRE 5 / GF NOV 9'])
})
