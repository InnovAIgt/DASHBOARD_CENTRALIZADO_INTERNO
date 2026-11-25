// Pruebas de los leads estimados por campaña (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { campanasConDias, leadsDeFila, leadsPorCampana, textoLeadsEst } from './leadsCampana.js'

const pres = [
  { campanaId: '1', marca: 'sv', gastado: 30, porDia: [{ fecha: '2026-11-03', gastado: 5, mensajes: 3 }, { fecha: '2026-11-04', gastado: 5, mensajes: 0 }] },
  { campanaId: '2', marca: 'dr', gastado: 20, porDia: [{ fecha: '2026-11-03', gastado: 4, mensajes: 1 }, { fecha: '2026-11-04', gastado: 15, mensajes: 0 }] },
]

test('reparto: mismo país y mismo día, por mensajes; sin mensajes, por gasto; GT sin campaña conectada', () => {
  const c = campanasConDias(pres)
  assert.deepEqual(c.map((x) => [x.campanaId, x.pais]), [['1', 'SV'], ['2', 'SV']])
  const e = leadsPorCampana(c, [
    { fecha: '2026-11-03', pais: 'SV' }, // 3 y 1 mensajes → 0.75 y 0.25
    { fecha: '2026-11-04', pais: 'SV' }, // sin mensajes → por gasto 5 y 15 → 0.25 y 0.75
    { fecha: '2026-11-09', pais: 'SV' }, // ninguna activa ese día
    { fecha: '2026-11-03', pais: 'GT' }, // GT no tiene campañas conectadas
  ])
  assert.deepEqual([e.porCampana.get('1'), e.porCampana.get('2')], [1, 1])
  assert.deepEqual([e.sinCampanaActiva, e.sinCampanaConectada, e.total], [{ SV: 1 }, { GT: 1 }, 4])
  assert.equal(leadsDeFila(e, '1', 15, 30), 0.5, 'una fila con la mitad del gasto de la campaña lleva la mitad')
  assert.equal(leadsDeFila(e, '9', 1, 1), null, 'campaña sin datos por día: sin dato')
  assert.deepEqual([textoLeadsEst(1.25), textoLeadsEst(0), textoLeadsEst(null)], ['1.3', '0', '—'])
})
