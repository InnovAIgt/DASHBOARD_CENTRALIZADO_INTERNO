import assert from 'node:assert/strict'
import test from 'node:test'
import { createDemoLeads } from './demoLeads.js'
import { summarize } from './analytics.js'
import { resumirSlaEtapas } from './sla.js'
import { aplicarFiltros, FILTROS_POR_DEFECTO, periodoPorDefecto } from '../pantalla/datos.js'

test('demo leads render useful, synthetic data for both countries and pipeline states', () => {
  const today = new Date(2026, 10, 24, 12)
  const leads = createDemoLeads(today)
  const countries = new Set(leads.map((lead) => lead.pais))
  const states = new Set(leads.map((lead) => lead.estado))
  const stages = new Set(leads.map((lead) => lead.apiStage))
  const filtered = aplicarFiltros(leads, FILTROS_POR_DEFECTO, periodoPorDefecto(today))
  const sla = resumirSlaEtapas(filtered, today)

  assert.ok(leads.length >= 15)
  assert.deepEqual(countries, new Set(['Guatemala', 'El Salvador']))
  assert.deepEqual(states, new Set(['activo', 'en_espera', 'detenido', 'ganado', 'perdido']))
  assert.deepEqual(stages, new Set([1, 2, 3, 4, 5, 6]))
  assert.ok(filtered.length > 0)
  assert.ok(summarize(filtered).won > 0)
  assert.ok(sla.verdes > 0 && sla.amarillos > 0 && sla.rojos > 0)
  assert.ok(leads.some((lead) => lead.apiStage === 5 && lead.comentarioGestion && lead.proximaGestion))
  assert.ok(leads.every((lead) => lead.id.startsWith('DEMO-FV2-') && !('client_phone' in lead.raw)))
})
