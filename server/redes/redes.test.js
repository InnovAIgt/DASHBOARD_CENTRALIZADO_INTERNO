// Pruebas de las rutas de Redes sociales con respuestas INVENTADAS de Meta (nunca se llama a Meta).
import assert from 'node:assert/strict'
import test from 'node:test'
import { clasificarError, configuracionMeta, llamarMeta, llamarMetaTodo } from './meta.js'
import { responderRedes, vaciarCacheRedes } from './rutas.js'
import { anunciosCuenta, fechaGt, mesAnterior, programadasFacebook, publicacionesFacebook, publicacionesInstagram, rangoMes, tituloDe } from './transformar.js'

const ENV = { META_TOKEN: 'token-inventado', META_APP_SECRET: 'secreto-inventado' }
const CUADRO = {
  gt: { nombre: 'RED Intelfon Guatemala', pais: 'GT', paginaFacebook: '111', instagram: '222', cuentasAnuncios: ['act_333'] },
  sv: { nombre: 'RED Intelfon El Salvador', pais: 'SV', paginaFacebook: '444', instagram: '', cuentasAnuncios: [] },
  dr: { nombre: 'DATA RED', pais: 'SV', paginaFacebook: '', instagram: '', cuentasAnuncios: [] },
}
const AHORA = () => new Date('2026-11-24T15:00:00Z')
const GT = { marca: 'gt', pais: 'GT' }

/** Meta inventada: responde según la ruta pedida y anota cada llamada. */
function metaFalsa(respuestas, llamadas = []) {
  return async (url) => {
    const u = new URL(url)
    llamadas.push(u)
    const ruta = u.pathname.replace(/^\/v\d+\.\d+/, '')
    const r = typeof respuestas[ruta] === 'function' ? respuestas[ruta](u) : respuestas[ruta]
    if (!r) return { ok: false, status: 400, json: async () => ({ error: { code: 100, message: 'ruta inventada desconocida' } }) }
    if (r.error) return { ok: false, status: r.status ?? 400, json: async () => ({ error: r.error }) }
    return { ok: true, status: 200, json: async () => r }
  }
}

test('transformar: fechas en hora de Guatemala, título corto, rango y mes anterior', () => {
  assert.equal(fechaGt('2026-11-01T03:00:00+0000'), '2026-10-31', '3 a. m. UTC es el día anterior en Guatemala')
  assert.equal(fechaGt(1764000000), '2025-11-24')
  assert.equal(tituloDe(''), 'Sin texto')
  assert.equal(tituloDe('a'.repeat(80)).length, 60)
  assert.equal(mesAnterior('2026-01'), '2025-12')
  assert.deepEqual(rangoMes('2026-11'), { since: Date.UTC(2026, 10, 1, 6) / 1000, until: Date.UTC(2026, 11, 1, 6) / 1000 })
})

test('transformar: Facebook, Instagram, programadas y anuncios con la forma del dashboard', () => {
  const [fb] = publicacionesFacebook([{ id: '1_2', created_time: '2026-11-10T15:00:00+0000', message: 'Radios PTT en cuotas',
    attachments: { data: [{ media_type: 'album' }] }, reactions: { summary: { total_count: 40 } }, comments: { summary: { total_count: 5 } },
    shares: { count: 3 }, insights: { data: [{ name: 'post_impressions_unique', values: [{ value: 1200 }] }] }, permalink_url: 'https://facebook.example/1' }], GT)
  assert.deepEqual([fb.red, fb.formato, fb.fecha, fb.alcance, fb.interacciones, fb.estado], ['fb', 'carrusel', '2026-11-10', 1200, 48, 'publicada'])
  const ig = publicacionesInstagram([
    { id: '9', timestamp: '2026-11-11T20:00:00+0000', caption: 'Reel inventado', media_type: 'VIDEO', media_product_type: 'REELS', like_count: 10, comments_count: 2,
      insights: { data: [{ name: 'reach', values: [{ value: 900 }] }, { name: 'total_interactions', values: [{ value: 70 }] }] } },
    { id: '8', timestamp: '2026-11-11T20:00:00+0000', media_type: 'IMAGE', media_product_type: 'STORY' },
  ], GT)
  assert.equal(ig.length, 1, 'las historias no se cuentan')
  assert.deepEqual([ig[0].formato, ig[0].alcance, ig[0].interacciones], ['reel', 900, 70])
  const [p] = programadasFacebook([{ id: '5', message: 'Promo', scheduled_publish_time: 1764600000 }], GT)
  assert.deepEqual([p.red, p.fuente, p.fecha], ['fb', 'facebook', '2025-12-01'])
  const [ad] = anunciosCuenta([{ campaign_id: '7', campaign_name: 'Campaña inventada', date_start: '2026-11-01', spend: '123.45', reach: '5000', impressions: '9000', clicks: '150',
    actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '40' }, { action_type: 'link_click', value: '99' }] }],
  [{ id: '7', daily_budget: '2500' }], { currency: 'gtq' }, GT)
  assert.deepEqual([ad.mes, ad.moneda, ad.gastado, ad.mensajes, ad.presupuestoDiario, ad.presupuesto], ['2026-11', 'GTQ', 123.45, 40, 25, null])
})

test('meta: firma appsecret_proof, errores clasificados y páginas', async () => {
  const c = configuracionMeta(ENV)
  assert.match(c.prueba, /^[0-9a-f]{64}$/)
  assert.equal(c.version, 'v23.0')
  assert.equal(clasificarError({ code: 190 }).tipo, 'token')
  assert.equal(clasificarError({ code: 17 }).tipo, 'limite')
  assert.equal(clasificarError({ code: 10, message: 'requires pages_read_engagement' }).message, 'Falta el permiso pages_read_engagement en el token de Meta.')
  assert.ok(!clasificarError({ code: 190, message: 'token-inventado' }).message.includes('token-inventado'), 'nunca repite el texto de Meta')
  const llamadas = []
  const fetchFn = metaFalsa({ '/111/published_posts': (u) => (u.searchParams.get('after') ? { data: [{ id: 'b' }] } : { data: [{ id: 'a' }], paging: { next: 'x', cursors: { after: 'c1' } } }) }, llamadas)
  const filas = await llamarMetaTodo('/111/published_posts', {}, { env: ENV, fetchFn })
  assert.deepEqual(filas.map((f) => f.id), ['a', 'b'])
  assert.ok(llamadas.every((u) => u.searchParams.get('appsecret_proof') && u.hostname === 'graph.facebook.com'))
  await assert.rejects(llamarMeta('/x', {}, { env: {}, fetchFn }), (e) => e.tipo === 'sin_token')
})

test('rutas: sin token responde «sin_token» (la pantalla usa ejemplo) y sin llamar a Meta', async () => {
  vaciarCacheRedes()
  const llamadas = []
  const r = await responderRedes({ recurso: 'publicaciones', method: 'GET', env: {}, fetchFn: metaFalsa({}, llamadas), ahora: AHORA, cuadro: CUADRO })
  assert.equal(r.status, 200)
  assert.equal(JSON.parse(r.body).fuente, 'sin_token')
  assert.equal(llamadas.length, 0)
  assert.equal((await responderRedes({ recurso: 'otra', method: 'GET', env: ENV })).status, 404)
  assert.equal((await responderRedes({ recurso: 'cuentas', method: 'POST', env: ENV })).status, 405)
  assert.equal((await responderRedes({ recurso: 'cuentas', method: 'GET', query: { mes: '2026-13' }, env: ENV })).status, 400)
})

test('rutas: publicaciones de Facebook e Instagram del mes y del anterior, con aviso si una cuenta falla, y caché', async () => {
  vaciarCacheRedes()
  const llamadas = []
  const fetchFn = metaFalsa({
    '/111': { access_token: 'token-pagina-inventado' },
    '/111/published_posts': { data: [{ id: 'p1', created_time: '2026-11-05T15:00:00+0000', message: 'Hola' }] },
    '/222/media': { data: [{ id: 'm1', timestamp: '2026-10-20T15:00:00+0000', media_type: 'IMAGE', media_product_type: 'FEED', like_count: 3, comments_count: 1 }] },
    '/444': { error: { code: 10, message: 'sin acceso inventado' }, status: 403 },
  }, llamadas)
  const r = await responderRedes({ recurso: 'publicaciones', method: 'GET', query: { mes: '2026-11' }, env: ENV, fetchFn, ahora: AHORA, cuadro: CUADRO })
  const c = JSON.parse(r.body)
  assert.equal(r.status, 200)
  assert.deepEqual(c.meses, ['2026-11', '2026-10'])
  assert.deepEqual(c.publicaciones.map((p) => [p.red, p.fecha]).sort(), [['fb', '2026-11-05'], ['ig', '2026-10-20']])
  assert.equal(c.avisos.length, 1)
  assert.match(c.avisos[0], /RED Intelfon El Salvador \(Facebook\)/)
  assert.ok(llamadas.filter((u) => u.pathname.endsWith('/published_posts')).every((u) => u.searchParams.get('access_token') === 'token-pagina-inventado'), 'las métricas de página van con el token de la página')
  assert.ok(!r.body.includes('token-'), 'nunca devuelve tokens')
  const n = llamadas.length
  await responderRedes({ recurso: 'publicaciones', method: 'GET', query: { mes: '2026-11' }, env: ENV, fetchFn, ahora: AHORA, cuadro: CUADRO })
  assert.equal(llamadas.length, n, 'la segunda vez sale de la caché')
})

test('rutas: token vencido en todas las cuentas da error claro; con caché vieja devuelve lo guardado con aviso', async () => {
  vaciarCacheRedes()
  const vencido = metaFalsa({ '/111': { error: { code: 190 }, status: 400 } })
  const r = await responderRedes({ recurso: 'programadas', method: 'GET', query: { mes: '2026-11' }, env: ENV, fetchFn: vencido, ahora: AHORA,
    cuadro: { ...CUADRO, sv: { ...CUADRO.sv, paginaFacebook: '' } } })
  assert.equal(r.status, 502)
  assert.equal(JSON.parse(r.body).tipo, 'token')
  // Primero bien (queda en caché), 31 min después Meta limita → datos guardados con aviso.
  vaciarCacheRedes()
  const cuadro = { ...CUADRO, sv: { ...CUADRO.sv, paginaFacebook: '' } }
  const bien = metaFalsa({ '/111': { access_token: 'tp' }, '/111/scheduled_posts': { data: [{ id: 's1', message: 'Programada', scheduled_publish_time: 1764700000 }] } })
  await responderRedes({ recurso: 'programadas', method: 'GET', query: { mes: '2026-11' }, env: ENV, fetchFn: bien, ahora: AHORA, cuadro })
  const tarde = () => new Date(AHORA().getTime() + 31 * 60 * 1000)
  const limite = metaFalsa({ '/111': { error: { code: 17 }, status: 400 } })
  const r2 = await responderRedes({ recurso: 'programadas', method: 'GET', query: { mes: '2026-11' }, env: ENV, fetchFn: limite, ahora: tarde, cuadro })
  const c2 = JSON.parse(r2.body)
  assert.equal(r2.status, 200)
  assert.equal(c2.programadas.length, 1)
  assert.match(c2.avisos.at(-1), /datos guardados/)
})

test('rutas: anuncios por cuenta publicitaria con su moneda; sin cuadro avisa qué falta', async () => {
  vaciarCacheRedes()
  const fetchFn = metaFalsa({
    '/act_333': { name: 'Cuenta inventada', currency: 'USD' },
    '/act_333/campaigns': { data: [{ id: '7', name: 'C', lifetime_budget: '50000' }] },
    '/act_333/insights': (u) => {
      assert.deepEqual(JSON.parse(u.searchParams.get('time_range')), { since: '2026-10-01', until: '2026-11-30' })
      return { data: [{ campaign_id: '7', campaign_name: 'C', date_start: '2026-11-01', spend: '10', reach: '1', impressions: '2', clicks: '3', actions: [] }] }
    },
  })
  const r = await responderRedes({ recurso: 'anuncios', method: 'GET', query: { mes: '2026-11' }, env: ENV, fetchFn, ahora: AHORA, cuadro: CUADRO })
  const [ad] = JSON.parse(r.body).anuncios
  assert.deepEqual([ad.moneda, ad.presupuesto, ad.marca], ['USD', 500, 'gt'])
  const vacio = { gt: { ...CUADRO.gt, paginaFacebook: '', instagram: '', cuentasAnuncios: [] }, sv: { ...CUADRO.sv, paginaFacebook: '' }, dr: CUADRO.dr }
  assert.equal((await responderRedes({ recurso: 'cuentas', method: 'GET', env: ENV, cuadro: vacio })).status, 503)
})
