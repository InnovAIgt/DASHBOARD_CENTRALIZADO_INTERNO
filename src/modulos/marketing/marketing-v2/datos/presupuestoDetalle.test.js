// Pruebas de Presupuestos más efectivos y del nombre de las campañas (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { nombreConTexto, presupuestosDe } from './anunciosFase2.js'
import {
  dineroYMensajes, estadoMeta, lecturaPresupuestos, presupuestoDelMes, recomendacionesCampana, resultadoCampana, resumenPresupuestos, semanasCampana,
} from './presupuestoDetalle.js'

const pres = presupuestosDe([
  { id: 'a', campana: '2026 - OCTUBRE 30 - BF', gastado: 87, mensajes: 67, presupuestoDiario: 3.5, campanaInfo: { inicio: '2026-10-30T10:00:00-0600', objetivo: 'OUTCOME_ENGAGEMENT' },
    anuncios: [{ id: 'x', tipo: 'VIDEO', posicion: 'instagram_reels', gastado: 47, mensajes: 41, publicacion: '1_2' }, { id: 'y', tipo: 'PHOTO', posicion: 'feed', gastado: 40, mensajes: 26 }],
    porSemana: [{ desde: '2026-11-01', hasta: '2026-11-07', gastado: 24, mensajes: 22 }, { desde: '2026-11-08', hasta: '2026-11-14', gastado: 25, mensajes: 21 }, { desde: '2026-11-15', hasta: '2026-11-21', gastado: 24, mensajes: 13 }] },
  { id: 'b', campana: 'Noviembre 18', gastado: 47, mensajes: 24 },
  { id: 'c', campana: 'Prueba', gastado: 11, mensajes: 4 },
], 'USD')

test('tarjeta: total, mejor campaña (5+), promedio, estado frente a la meta, pocos datos y dinero vs mensajes', () => {
  const r = resumenPresupuestos(pres)
  assert.deepEqual([r.total, r.mejor.id, Math.round(r.promedio * 100) / 100, r.pocos.cantidad, r.pocos.gastado], [145, 'a', 1.53, 1, 11])
  assert.deepEqual(estadoMeta(1.3, 1.5), { enMeta: true, texto: 'en meta' })
  assert.deepEqual(estadoMeta(1.94, 1.5), { enMeta: false, texto: '29 % sobre la meta' })
  assert.equal(estadoMeta(3, 1.5, true), null, 'con pocos datos no hay estado')
  const dm = dineroYMensajes(pres)
  assert.deepEqual(dm.map((x) => x.id), ['a', 'b', 'pocos'])
  assert.equal(Math.round(dm.reduce((n, x) => n + x.pctInversion, 0)), 100)
  assert.match(lecturaPresupuestos(pres), /^«2026 - OCTUBRE 30 - BF» se llevó el 60 % de la inversión y trajo el 71 % de los mensajes: rindió más de lo que costó. «Noviembre 18» trajo menos de lo que costó.$/)
})

test('ventana: presupuesto del mes, semanas con cansancio, resultado y recomendaciones', () => {
  const p = presupuestoDelMes(pres[0], '2026-11', '2026-11-24')
  assert.deepEqual([p.tipo, p.dias, p.previsto, Math.round(p.usado)], ['diario', 24, 84, 104], 'desde el 1 (empezó antes) hasta hoy')
  const s = semanasCampana(pres[0])
  assert.deepEqual(s.cansancio, { semana: 3, caida: 38 }, 'bajó 38 % la 3.ª semana con gasto parecido')
  const r = resultadoCampana(pres[0], pres, 2.5)
  assert.deepEqual([r.leadsEst, Math.round(r.costoLead * 10) / 10, Math.round(r.pctInversion)], [2.5, 34.8, 60])
  assert.equal(resultadoCampana(pres[0], pres, null).costoLead, null, 'sin dato de leads: sin costo por lead')
  const reco = recomendacionesCampana(pres[0], pres, 1.5, s.cansancio)
  assert.match(reco[0], /mejor rinde/)
  assert.ok(reco.some((x) => x.includes('video · reels')))
  assert.ok(reco.some((x) => x.includes('renovar el anuncio')))
  assert.deepEqual(recomendacionesCampana(pres[2], pres, 1.5, null), [], 'pocos datos: sin recomendación')
})

test('nombre de campaña: título = texto promocionado; debajo «Campaña: … · objetivo»; sin texto, el nombre', () => {
  assert.deepEqual(nombreConTexto({ texto: '🔥 ¡Black Friday en radios PTT!', campana: '2026 - OCTUBRE 30 - BF', objetivo: 'OUTCOME_ENGAGEMENT' }),
    { titulo: '¡Black Friday en radios PTT!', sub: 'Campaña: Octubre 30 - BF · Interacción', tip: '🔥 ¡Black Friday en radios PTT!' })
  assert.deepEqual(nombreConTexto({ texto: null, campana: 'Noviembre 18', objetivo: null }), { titulo: 'Noviembre 18', sub: null, tip: 'Noviembre 18' })
})

test('semanas sin gasto se rellenan con 0; comodines de Meta no cuentan como texto', () => {
  const s = semanasCampana({ porSemana: [{ desde: '2026-11-01', hasta: '2026-11-07', gastado: 10, mensajes: 8 }, { desde: '2026-11-22', hasta: '2026-11-25', gastado: 5, mensajes: 2 }] })
  assert.deepEqual(s.semanas.map((w) => [w.desde, w.hasta, w.gastado]), [['2026-11-01', '2026-11-07', 10], ['2026-11-08', '2026-11-14', 0], ['2026-11-15', '2026-11-21', 0], ['2026-11-22', '2026-11-25', 5]])
  assert.equal(nombreConTexto({ texto: '{{user_first_name}}', campana: 'Noviembre 18', objetivo: null }).titulo, 'Noviembre 18')
  assert.equal(nombreConTexto({ texto: 'Hola {{user_first_name}}, mirá esto', campana: 'X' }).titulo, 'Hola, mirá esto')
})
