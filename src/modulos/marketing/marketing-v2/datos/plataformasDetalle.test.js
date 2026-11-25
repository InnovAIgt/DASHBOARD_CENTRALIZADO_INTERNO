// Pruebas de «¿Dónde se vieron y dónde escribieron?» (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { plataformasDe } from './anunciosFase2.js'
import { lecturaPlataformas, recomendacionPlataforma, resultadoPlataforma, resumenPlataformas, ubicacionesPlataforma } from './plataformasDetalle.js'

const u = (marca, plataforma, posicion, impresiones, clics, gastado, mensajes) => ({ marca, plataforma, posicion, impresiones, clics, gastado, mensajes })
const plats = plataformasDe([
  u('sv', 'facebook', 'feed', 6000, 120, 60, 50),
  u('dr', 'facebook', 'facebook_reels', 3000, 45, 24, 16),
  u('sv', 'facebook', 'marketplace', 500, 2, 6, 1),
  u('sv', 'instagram', 'instagram_stories', 900, 9, 30, 12),
  u('sv', 'whatsapp', 'whatsapp_status', 100, 1, 5, 2),
  u('sv', 'audience_network', 'an_classic', 50, 0, 0, 0),
])
const d = (v) => `US$ ${v.toFixed(2)}`

test('tarjeta: % por plataforma, CTR, la más barata (5+) y lectura', () => {
  const r = resumenPlataformas(plats)
  assert.deepEqual(r.filas.map((p) => p.k), ['facebook', 'instagram', 'whatsapp', 'otras'])
  assert.deepEqual([r.total.mensajes, r.total.gastado, r.masBarata.k], [81, 125, 'facebook'])
  const fb = r.filas[0]
  assert.deepEqual([fb.marcas, Math.round(fb.ctr * 100) / 100, Math.round(fb.pctMensajes), Math.round(fb.pctInversion)], [['sv', 'dr'], 1.76, 83, 72])
  assert.equal(r.filas[2].pocos, true, 'WhatsApp con 2 mensajes: pocos datos')
  assert.equal(lecturaPlataformas(plats, d), 'Facebook trae 8 de cada 10 mensajes y es la plataforma más barata. Instagram se lleva el 24 % de la inversión pero solo trae el 15 % de los mensajes. WhatsApp se lleva el 4 % de la inversión pero solo trae el 2 % de los mensajes.')
  assert.equal(lecturaPlataformas([], d), '')
})

test('ventana: resultado frente al mes, ubicaciones con qué es y recomendación', () => {
  const fb = plats[0]
  const r = resultadoPlataforma(fb, plats)
  assert.deepEqual([Math.round(r.pctImpresiones), Math.round(r.cpc * 100) / 100, Math.round(r.difCosto)], [90, 0.54, -13])
  const ub = ubicacionesPlataforma(fb)
  assert.deepEqual(ub.map((x) => [x.lugar, x.queEs]), [['Feed', 'Inicio, entre publicaciones'], ['Reels', 'Videos verticales'], ['Marketplace', 'Sección de compra y venta']])
  assert.deepEqual(recomendacionPlataforma(fb, 1.5, d), [
    '**Feed** es la ubicación más barata (US$ 1.20 por mensaje): priorizarla en la próxima pauta.',
    '**Reels** también está en meta (US$ 1.50): mantenerla.',
    'Marketplace casi no trae mensajes (menos de 5): se puede **quitar** si se eligen ubicaciones a mano.',
  ])
  assert.deepEqual(recomendacionPlataforma(plats[2], 1.5, d), [], 'sin ubicaciones con 5+ mensajes: no se recomienda')
  assert.equal(ubicacionesPlataforma(plats[3])[0].lugar, 'Audience Network · Clásico', 'en Otras se dice la plataforma')
})
