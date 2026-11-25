// Pruebas de Anuncios fase 2 (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { edadesDe, filtrarDetalle, formulariosDe, horasDe, masBarato, presupuestosDe, segmentosDe, textoPublico, ubicacionesDe } from './anunciosFase2.js'

test('«pocos datos»: menos de 5 mensajes nunca sale como el más barato', () => {
  const edades = edadesDe([
    { marca: 'sv', edad: '18-24', sexo: 'hombres', gastado: 1, mensajes: 4 },
    { marca: 'sv', edad: '25-34', sexo: 'hombres', gastado: 10, mensajes: 4 },
    { marca: 'sv', edad: '25-34', sexo: 'mujeres', gastado: 5, mensajes: 2 },
    { marca: 'sv', edad: '35-44', sexo: 'mujeres', gastado: 30, mensajes: 10 },
  ])
  assert.deepEqual(edades.map((e) => [e.edad, e.mensajes, e.pocos]), [['18–24', 4, true], ['25–34', 6, false], ['35–44', 10, false]])
  assert.equal(masBarato(edades).edad, '25–34', '18–24 es más barato pero tiene pocos datos')
  const u = ubicacionesDe([{ plataforma: 'facebook', posicion: 'feed', impresiones: 100, gastado: 10, mensajes: 5 }, { plataforma: 'instagram', posicion: 'instagram_reels', impresiones: 50, gastado: 1, mensajes: 1 }])
  assert.deepEqual(u.map((x) => [x.nombre, x.red, x.pocos]), [['Facebook · Feed', 'fb', false], ['Instagram · Reels', 'ig', true]])
  assert.equal(masBarato(u).nombre, 'Facebook · Feed')
})

test('horarios: matriz 7×12 y el mejor solo con 5+ mensajes', () => {
  assert.equal(horasDe([{ dia: 0, franja: 6, mensajes: 4 }]).mejor, null)
  const h = horasDe([{ dia: 1, franja: 5, mensajes: 3 }, { dia: 1, franja: 5, mensajes: 3 }, { dia: 4, franja: 9, mensajes: 5 }])
  assert.deepEqual(h.mejor, { dia: 1, franja: 5, mensajes: 6 })
  assert.equal(h.total, 11)
})

test('segmentos, presupuestos, formularios y filtros por marca, país y red', () => {
  const s = segmentosDe([{ id: 'a', mensajes: 2, gastado: 1, publico: {} }, { id: 'b', mensajes: 10, gastado: 20, publico: {} }, { id: 'c', mensajes: 8, gastado: 8, publico: {} }], 'USD')
  assert.deepEqual(s.map((x) => x.id), ['c', 'b', 'a'], 'ganadores por costo; «pocos datos» al final')
  const [p] = presupuestosDe([{ id: 'x', mensajes: 3, gastado: 9, presupuestoDiario: 5 }], 'USD')
  assert.deepEqual([p.pocos, p.semaforo, p.costo], [true, null, 3])
  assert.equal(formulariosDe([{ formularios: 3 }, { formularios: 1 }]), 4)
  assert.equal(textoPublico({ edad: '25–54', sexo: 'Ambos', ubicaciones: 'Automáticas', paises: ['SV'], intereses: ['A', 'B', 'C', 'D'] }), 'Edad 25–54 · Ambos · ubicaciones automáticas · SV · intereses: A, B, C (+1)')
  const det = { edadSexo: [{ marca: 'sv' }, { marca: '' }, { marca: 'gt' }], ubicaciones: [{ marca: 'sv', plataforma: 'facebook' }, { marca: 'sv', plataforma: 'instagram' }], horas: [], segmentos: [], presupuestos: [], formularios: [] }
  assert.equal(filtrarDetalle(det, {}).edadSexo.length, 3)
  assert.equal(filtrarDetalle(det, { pais: 'SV' }, { sv: 'SV', gt: 'GT' }).edadSexo.length, 1, 'sin página no entra con filtro de país')
  assert.equal(filtrarDetalle(det, { red: 'ig' }).ubicaciones.length, 1)
  assert.equal(filtrarDetalle(null, {}), null)
})
