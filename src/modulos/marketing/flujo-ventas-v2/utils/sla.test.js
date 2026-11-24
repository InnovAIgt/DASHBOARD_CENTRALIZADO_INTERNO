import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluarSlaEtapa, diasHabilesEntre, resumirSlaEtapas } from './sla.js'

const hacerLead = (id, etapa, fechaInicio, estado = 'activo') => {
  const campoFecha = { 2: 'fecha_reunion_iso', 3: 'fecha_demo', 4: 'fecha_envio', 5: 'fecha_seguimiento', 6: 'fecha_cierre_real' }[etapa]
  return {
    id,
    apiStage: etapa,
    estado,
    fechaCreacion: '2026-11-23',
    raw: { stage_feedback_json: { [String(etapa)]: fechaInicio && campoFecha ? { [campoFecha]: fechaInicio } : {} } },
  }
}

test('SLA counts weekdays and separates on-time, yellow grace, and red delays', () => {
  const monday = new Date(2026, 10, 23, 12)
  assert.equal(diasHabilesEntre(monday, new Date(2026, 10, 25, 12)), 2)
  assert.equal(diasHabilesEntre(monday, new Date(2026, 10, 30, 12)), 5)
  assert.equal(evaluarSlaEtapa(hacerLead('a', 5, '2026-11-23'), new Date(2026, 10, 25, 12)).estado, 'verde')
  assert.equal(evaluarSlaEtapa(hacerLead('b', 5, '2026-11-23'), new Date(2026, 10, 26, 12)).estado, 'amarillo')
  assert.equal(evaluarSlaEtapa(hacerLead('c', 5, '2026-11-23'), new Date(2026, 10, 30, 12)).estado, 'rojo')
})

test('stage SLA uses its milestone date or approximate creation date', () => {
  const fromStage = evaluarSlaEtapa(hacerLead('a', 5, '2026-11-20'), new Date(2026, 10, 24, 12))
  const fromCreation = evaluarSlaEtapa(hacerLead('b', 5, null), new Date(2026, 10, 24, 12))

  assert.equal(fromStage.aproximada, false)
  assert.equal(fromCreation.aproximada, true)
  assert.equal(fromCreation.fechaInicio.getDate(), 23)
})

test('team SLA summary counts only open stages and computes on-time compliance', () => {
  const now = new Date(2026, 10, 26, 12)
  const summary = resumirSlaEtapas([
    hacerLead('a', 2, '2026-11-25'),
    hacerLead('b', 2, '2026-11-23'),
    hacerLead('c', 3, '2026-11-23'),
    hacerLead('d', 4, '2026-11-23', 'ganado'),
  ], now)

  assert.equal(summary.verdes, 1)
  assert.equal(summary.amarillos, 2)
  assert.equal(summary.rojos, 0)
  assert.equal(summary.vencidas, 2)
  assert.equal(summary.porEtapa[1].total, 2)
  assert.equal(summary.cumplimiento, 1 / 3)
})
