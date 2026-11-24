// Pruebas de los leads en la pantalla de Mailing (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { conteoCruce, filtrarLeads, leadsPorCampana, leadsPorEjecutivo, porEtapa, resumenLeads, SIN_CRUCE, textoCampanaLead } from './leads.js'

const lead = (codigo, extra = {}) => ({ codigo, fecha: '2026-11-20T15:00:00.000Z', pais: 'GT', asesor: 'Asesor Uno', ejecutivo: 'Ejecutivo Uno', cruceEjecutivo: 'exacta', status: 'en_proceso', etapa: 3, cerrado: false, origen: 'PostIAlo Mailing', tieneCorreo: false, atribucion: 'sin_campana', campanas: [], grupo: null, motivo: null, ...extra })
const FILAS = [
  lead('LD-1', { atribucion: 'exacta', campanas: [71], motivo: 'clic', tieneCorreo: true, etapa: 6 }),
  lead('LD-2', { atribucion: 'estimada', campanas: [77, 78, 79], grupo: '19 nov (77–79)', pais: 'SV', ejecutivo: null, cruceEjecutivo: 'sin_cruce', asesor: 'Asesor Dos' }),
  lead('LD-3', { atribucion: 'estimada', campanas: [71], etapa: 6, cruceEjecutivo: 'posible' }),
  lead('LD-4', { fecha: '2026-06-02T03:00:00.000Z', pais: 'SV', etapa: null }),
]
const campana = (id, clics, extra = {}) => ({ id, nombre: `Campaña ${id}`, cargo: 'GG', asunto: 'Asunto', totales: { clics }, ...extra })
const CAMPANAS = [campana(71, 10), campana(77, 4), campana(78, 3), campana(79, 3)]

test('resumen: total, exactos, estimados, sin campaña, cerrados y con correo', () => {
  assert.deepEqual(resumenLeads(FILAS), { total: 4, exactas: 1, estimadas: 2, sinCampana: 1, cerrados: 2, conCorreo: 1 })
})

test('filtros: país, período (hora de Guatemala) y buscar', () => {
  assert.deepEqual(filtrarLeads(FILAS, { pais: 'SV' }, CAMPANAS).map((x) => x.codigo), ['LD-2', 'LD-4'])
  // 02/06 03:00 UTC es 01/06 en Guatemala.
  assert.deepEqual(filtrarLeads(FILAS, { desde: '2026-06-01', hasta: '2026-06-01' }, CAMPANAS).map((x) => x.codigo), ['LD-4'])
  assert.deepEqual(filtrarLeads(FILAS, { cliente: 'asesor dos' }, CAMPANAS).map((x) => x.codigo), ['LD-2'])
  assert.deepEqual(filtrarLeads(FILAS, { cliente: 'ld-3' }, CAMPANAS).map((x) => x.codigo), ['LD-3'])
})

test('filtros de campaña: solo los asignados a las campañas que quedan; sin ellos, todos', () => {
  assert.equal(filtrarLeads(FILAS, {}, CAMPANAS).length, 4)
  assert.deepEqual(filtrarLeads(FILAS, { campana: '71' }, [CAMPANAS[0]]).map((x) => x.codigo), ['LD-1', 'LD-3'])
  assert.deepEqual(filtrarLeads(FILAS, { campana: '78' }, [CAMPANAS[2]]).map((x) => x.codigo), ['LD-2'])
  assert.deepEqual(filtrarLeads(FILAS, { cargo: 'GF' }, []).map((x) => x.codigo), [])
})

test('por campaña: el grupo va en su propia fila, sin repartirse; conversión = leads ÷ clics', () => {
  const m = leadsPorCampana(FILAS, CAMPANAS)
  assert.deepEqual([...m.keys()].sort(), ['71', '77,78,79'])
  const c71 = m.get('71')
  assert.deepEqual({ leads: c71.leads, exactas: c71.exactas, estimadas: c71.estimadas, cerrados: c71.cerrados, clics: c71.clics, conversion: c71.conversion }, { leads: 2, exactas: 1, estimadas: 1, cerrados: 2, clics: 10, conversion: 20 })
  const g = m.get('77,78,79')
  assert.equal(g.grupo, '19 nov (77–79)')
  assert.equal(g.clics, 10)
  assert.equal(g.conversion, 10)
})

test('por campaña: sin clics, la conversión queda vacía', () => {
  assert.equal(leadsPorCampana([FILAS[0]], [campana(71, 0)]).get('71').conversion, null)
})

test('por ejecutivo y país: solo atribuidos; sin cruce al final', () => {
  const { filas, territorios, cruce } = leadsPorEjecutivo(FILAS)
  assert.deepEqual(filas.map((x) => [x.ejecutivo, x.pais, x.leads, x.cerrados]), [['Ejecutivo Uno', 'GT', 2, 2], [SIN_CRUCE, 'SV', 1, 0]])
  assert.equal(filas[0].posible, true)
  assert.deepEqual(filas[1].asesores, ['Asesor Dos'])
  assert.deepEqual(territorios.map((t) => [t.pais, t.leads]), [['GT', 2], ['SV', 1]])
  assert.deepEqual(cruce, { exacta: 2, posible: 1, sin_cruce: 1 })
  assert.deepEqual(conteoCruce([]), { exacta: 0, posible: 0, sin_cruce: 0 })
})

test('etapas y texto de campaña', () => {
  assert.deepEqual(porEtapa(FILAS), [{ etapa: 3, n: 1 }, { etapa: 6, n: 2 }, { etapa: null, n: 1 }])
  const nombres = { 71: CAMPANAS[0] }
  assert.equal(textoCampanaLead(FILAS[0], nombres), '#71 · Campaña 71')
  assert.equal(textoCampanaLead(FILAS[1], nombres), '19 nov (77–79)')
  assert.equal(textoCampanaLead(FILAS[3], nombres), '—')
})
