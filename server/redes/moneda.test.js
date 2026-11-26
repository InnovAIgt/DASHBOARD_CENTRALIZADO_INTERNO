// Pruebas de la conversión de la pauta a US$ y de juntar el detalle de dos cuentas (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { conOriginal, filasEnUsd, tipoCambio, TIPO_CAMBIO_POR_DEFECTO } from './moneda.js'
import { juntarDetalles } from './rutas.js'
import { anunciosPorPagina } from './transformar.js'

test('tipo de cambio: USD = 1; GTQ de la variable o 7.64 por defecto (por confirmar); moneda desconocida = null', () => {
  assert.equal(tipoCambio('USD', {}), 1)
  assert.equal(tipoCambio('GTQ', {}), 7.64)
  assert.equal(TIPO_CAMBIO_POR_DEFECTO.GTQ, 7.64)
  assert.equal(tipoCambio('GTQ', { TIPO_CAMBIO_GTQ_USD: '7,80' }), 7.8, 'acepta coma decimal')
  assert.equal(tipoCambio('GTQ', { TIPO_CAMBIO_GTQ_USD: 'abc' }), 7.64, 'valor inválido → por defecto')
  assert.equal(tipoCambio('EUR', {}), null)
})

test('filas de Meta en US$ y el monto original en Q en cada fila', () => {
  const [f] = filasEnUsd([{ spend: '76.40', daily_budget: '7640' }], 7.64)
  assert.deepEqual([Math.round(Number(f.spend) * 100) / 100, f.daily_budget], [10, '1000'])
  assert.equal(filasEnUsd([{ spend: '5' }], 1)[0].spend, '5', 'US$: sin cambios')
  const filas = anunciosPorPagina({
    insights: filasEnUsd([{ ad_id: 'a1', campaign_id: 'c1', campaign_name: 'Promo GT', date_start: '2026-11-01', spend: '152.80', actions: [] }], 7.64),
    ads: [{ id: 'a1', creative: { object_story_spec: { page_id: 'p-gt' } } }], cuentaAds: { currency: 'USD' }, marcaDe: new Map([['p-gt', 'gt']]), paisDe: { gt: 'GT' },
  }).map((x) => conOriginal(x, 'GTQ', 7.64))
  assert.deepEqual([filas[0].moneda, filas[0].gastado, filas[0].monedaOriginal, filas[0].gastadoOriginal, filas[0].pais], ['USD', 20, 'GTQ', 152.8, 'GT'])
})

test('detalle de dos cuentas: una sola lista en US$, con las marcas de cada una y errores unidos', () => {
  const sv = { moneda: 'USD', zonaHoraria: 'America/El_Salvador', presupuestos: [{ id: 'c1-sv', marca: 'sv', gastado: 10 }], segmentos: [], edadSexo: [], ubicaciones: [], horas: [], formularios: [], cuentas: [{ id: '1', moneda: 'USD' }], errores: {}, guardados: [], sinMarcas: false }
  const gt = { ...sv, moneda: 'USD', presupuestos: [{ id: 'c9-gt', marca: 'gt', gastado: 20, monedaOriginal: 'GTQ', gastadoOriginal: 152.8 }], cuentas: [{ id: '2', moneda: 'GTQ', tipoCambio: 7.64 }], errores: { horas: 'Meta no respondió' }, guardados: ['edadSexo'] }
  const j = juntarDetalles([sv, gt])
  assert.deepEqual(j.presupuestos.map((p) => p.marca), ['sv', 'gt'])
  assert.deepEqual([j.moneda, j.cuentas.length, j.errores.horas, j.guardados], ['USD', 2, 'Meta no respondió', ['edadSexo']])
  assert.equal(juntarDetalles([sv]), sv, 'una sola cuenta: igual que antes')
})
