// Pruebas de leads de Redes y de la ventana de detalle (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { estimarLeads, leadsDelMes, leadsPorMarca, leadsPorPublicacion, resumenLeadsRedes } from './redesLeads.js'
import { detalleIndicador, detalleLead, detalleListaLeads, detalleMarca, detallePublicacion } from './redesDetalle.js'

const pub = (id, marca, pais, fecha, hora) => ({ id, marca, pais, fecha, hora, red: 'fb', estado: 'publicada', titulo: `Pub ${id}`, formato: 'foto', alcance: 100, interacciones: 5 })
const lead = (codigo, pais, fechaUtc, etapa = 1) => ({ codigo, nombre: `Cliente ${codigo}`, pais, fechaUtc, fecha: new Date(Date.parse(fechaUtc) - 6 * 3600000).toISOString().slice(0, 10), etapa, status: etapa === 6 ? 'cerrado' : 'en_proceso', gestiones: [] })

test('estimado: la publicación más reciente de su país en los 7 días anteriores; varias el mismo día comparten fila', () => {
  const pubs = [pub('p1', 'sv', 'SV', '2026-11-02', 9), pub('p2', 'dr', 'SV', '2026-11-05', 8), pub('p3', 'sv', 'SV', '2026-11-05', 15), pub('g1', 'gt', 'GT', '2026-10-01', 9)]
  const [a, b, c, d] = estimarLeads([
    lead('A', 'SV', '2026-11-05T22:00:00Z'), // 16:00 GT del 5: p2 y p3 del mismo día → grupo, dos marcas → sin marca
    lead('B', 'SV', '2026-11-05T15:00:00Z'), // 09:00 GT del 5: solo p2 (8 h) ese día
    lead('C', 'SV', '2026-11-20T15:00:00Z'), // más de 7 días después → sin estimada
    lead('D', 'GT', '2026-11-03T15:00:00Z', 6), // GT siempre RED GT
  ], pubs)
  assert.deepEqual([a.estimada.ids.sort(), a.marca], [['p2', 'p3'], ''])
  assert.deepEqual([b.estimada.ids, b.marca], [['p2'], 'dr'])
  assert.deepEqual([c.estimada, c.marca], [null, ''])
  assert.deepEqual([d.estimada, d.marca], [null, 'gt'])
  const mes = leadsDelMes([a, b, c, d], '2026-11', {})
  assert.deepEqual(resumenLeadsRedes(mes).porPais, { GT: 1, SV: 3 })
  assert.equal(resumenLeadsRedes(mes).cerrados, 1)
  assert.deepEqual(leadsPorMarca(mes), { gt: 1, sv: 0, dr: 1, sinMarca: { GT: 0, SV: 2 } })
  assert.deepEqual(leadsPorPublicacion(mes).map((g) => [g.leads, g.ids.sort()]), [[2, ['p2', 'p3']]], 'A y B: mismo país y día → una fila')
  assert.equal(leadsDelMes(mes, '2026-11', { marca: 'dr' }).length, 1)
})

test('detalle: publicación, marca, indicador, lista de leads y ficha', () => {
  const p = pub('p1', 'sv', 'SV', '2026-11-02', 9)
  const l = { ...lead('A', 'SV', '2026-11-05T22:00:00Z'), estimada: { ids: ['p1'], fecha: '2026-11-02' } }
  assert.equal(detallePublicacion(p, [l]).kpis.find((k) => k.t === 'Leads (estimado)').v, '1')
  assert.ok(detallePublicacion(p, [l]).kpis.find((k) => k.t === 'Leads (estimado)').ir.tabla.filas[0].ir.titulo === 'Cliente A')
  assert.equal(detalleMarca('sv', { items: [p], cuentas: [], mes: '2026-11', alcance: 10 }).titulo, 'RED Intelfon El Salvador')
  assert.equal(detalleIndicador('publicaciones', { items: [p], mes: '2026-11' }).titulo, 'Publicaciones · 1')
  const ficha = detalleLead(l, [p])
  assert.equal(ficha.bloques[0].filas[0].v, 'Prospekt no lo envía')
  assert.equal(ficha.bloques.at(-1).filas[0].l, 'Pub p1')
  assert.equal(detalleListaLeads([l]).tabla.filas.length, 1)
})

test('costo por lead: inversión ÷ leads de SV; Guatemala sin pauta; cerrados dicen «ganados o perdidos»', async () => {
  const { costoPorLead, etiquetaEtapa, TEXTO_CERRADOS } = await import('./redesLeads.js')
  const { detalleCostoLead } = await import('./redesDetalle.js')
  const leads = [{ pais: 'SV' }, { pais: 'SV' }, { pais: 'GT' }, { pais: 'GT' }, { pais: 'GT' }]
  assert.deepEqual(costoPorLead({ gasto: 100, leads, filtros: {} }), { sinPauta: false, leadsSV: 2, costo: 50 }, 'no se divide entre los 5, solo entre los 2 de SV')
  assert.equal(costoPorLead({ gasto: 100, leads, filtros: { pais: 'GT' } }).sinPauta, true)
  assert.equal(costoPorLead({ gasto: 100, leads, filtros: { marca: 'gt' } }).sinPauta, true)
  assert.equal(costoPorLead({ gasto: 100, leads: [], filtros: {} }).costo, null)
  assert.equal(detalleCostoLead({ gasto: 100, leads, filtros: {} }).titulo, 'Costo por lead · US$ 50.00')
  assert.equal(detalleCostoLead({ gasto: 100, leads, filtros: { pais: 'GT' } }).titulo, 'Costo por lead · sin pauta')
  assert.equal(TEXTO_CERRADOS, 'Cerrados (ganados o perdidos)')
  assert.equal(etiquetaEtapa(6), 'Etapa 6 · cerrado (ganado o perdido)')
})
