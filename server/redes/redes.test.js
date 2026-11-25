// Pruebas de las rutas de Redes sociales con respuestas INVENTADAS de Meta (nunca se llama a Meta).
import assert from 'node:assert/strict'
import test from 'node:test'
import { clasificarError, configuracionMeta, llamarMeta, llamarMetaTodo } from './meta.js'
import { responderRedes, vaciarCacheRedes } from './rutas.js'
import { esReclutamiento, PALABRAS_RECLUTAMIENTO } from './reclutamiento.js'
import { alcancePorDia, anunciosPorPagina, fechaGt, paginaDelAnuncio, horaGt, mesAnterior, metricasInstagram, metricasPagina, programadasFacebook, publicacionesFacebook, publicacionesInstagram, rangoMes, tituloDe, tramos } from './transformar.js'

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
  assert.equal(tituloDe('a'.repeat(200)).length, 150, 'la pantalla corta a 2 líneas; el tooltip muestra hasta 150 caracteres')
  assert.deepEqual(alcancePorDia([{ name: 'reach', values: [{ value: 5, end_time: '2026-11-02T08:00:00+0000' }, { value: 7, end_time: '2026-11-03T08:00:00+0000' }] }], 'reach'),
    { '2026-11-01': 5, '2026-11-02': 7 }, 'el fin del día de Meta corresponde al día anterior')
  assert.equal(mesAnterior('2026-01'), '2025-12')
  assert.deepEqual(rangoMes('2026-11'), { since: Date.UTC(2026, 10, 1, 6) / 1000, until: Date.UTC(2026, 11, 1, 6) / 1000 })
})

test('transformar: Facebook, Instagram, programadas y anuncios con la forma del dashboard', () => {
  const [fb] = publicacionesFacebook([{ id: '1_2', created_time: '2026-11-10T15:00:00+0000', message: 'Radios PTT en cuotas',
    attachments: { data: [{ media_type: 'album' }] }, reactions: { summary: { total_count: 40 } }, comments: { summary: { total_count: 5 } },
    shares: { count: 3 }, permalink_url: 'https://facebook.example/1', insights: { data: [
      { name: 'post_total_media_view_unique', period: 'day', values: [{ value: 7 }] },
      { name: 'post_total_media_view_unique', period: 'lifetime', values: [{ value: 1200 }] },
      { name: 'post_media_view', period: 'lifetime', values: [{ value: 2100 }] },
      { name: 'post_clicks', period: 'lifetime', values: [{ value: 33 }] },
      { name: 'post_reactions_by_type_total', period: 'lifetime', values: [{ value: { like: 30, love: 10 } }] },
    ] } }], GT)
  assert.deepEqual([fb.red, fb.formato, fb.fecha, fb.hora, fb.alcance, fb.vistas, fb.clics, fb.reacciones, fb.interacciones, fb.estado],
    ['fb', 'carrusel', '2026-11-10', 9, 1200, 2100, 33, 40, 48, 'publicada'], 'alcance «lifetime» aunque venga también «day»; reacciones por tipo se suman')
  const ig = publicacionesInstagram([
    { id: '9', timestamp: '2026-11-11T20:00:00+0000', caption: 'Reel inventado', media_type: 'VIDEO', media_product_type: 'REELS', like_count: 10, comments_count: 2,
      insights: { data: [{ name: 'reach', values: [{ value: 900 }] }, { name: 'views', values: [{ value: 1500 }] }, { name: 'total_interactions', values: [{ value: 70 }] }] } },
    { id: '8', timestamp: '2026-11-11T20:00:00+0000', media_type: 'IMAGE', media_product_type: 'STORY' },
  ], GT)
  assert.equal(ig.length, 1, 'las historias no se cuentan')
  assert.deepEqual([ig[0].formato, ig[0].alcance, ig[0].vistas, ig[0].interacciones], ['reel', 900, 1500, 70])
  const [p] = programadasFacebook([{ id: '5', message: 'Promo', scheduled_publish_time: 1764600000 }], GT)
  assert.deepEqual([p.red, p.fuente, p.fecha], ['fb', 'facebook', '2025-12-01'])
  // Anuncios: se reparten por la página del anuncio; lo que no es de una marca queda «sin página».
  const msj = (v) => [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: v }, { action_type: 'link_click', value: '99' }]
  const filas = anunciosPorPagina({
    insights: [
      { ad_id: 'a1', campaign_id: '7', campaign_name: 'Promo radios', date_start: '2026-11-01', spend: '100.10', reach: '5000', impressions: '9000', clicks: '150', actions: msj('40') },
      { ad_id: 'a2', campaign_id: '7', campaign_name: 'Promo radios', date_start: '2026-11-01', spend: '23.35', reach: '10', impressions: '20', clicks: '3', actions: msj('2') },
      { ad_id: 'a3', campaign_id: '7', campaign_name: 'Promo radios', date_start: '2026-11-01', spend: '5', reach: '1', impressions: '1', clicks: '0', actions: [] },
      { ad_id: 'a4', campaign_id: '8', campaign_name: 'Nueva VACANTE RH', date_start: '2026-11-01', spend: '9', reach: '1', impressions: '1', clicks: '1', actions: [] },
    ],
    ads: [
      { id: 'a1', creative: { object_story_spec: { page_id: '444' } } },
      { id: 'a2', creative: { effective_object_story_id: '444_99' } },
      { id: 'a3', creative: { actor_id: '999' } },
      { id: 'a4', creative: { actor_id: '111' } },
    ],
    campanas: [{ id: '7', daily_budget: '2500' }], cuentaAds: { currency: 'usd' },
    marcaDe: new Map([['111', 'gt'], ['444', 'sv']]), paisDe: { gt: 'GT', sv: 'SV' }, esReclutamiento,
  })
  const sv = filas.find((f) => f.marca === 'sv')
  assert.deepEqual([sv.mes, sv.moneda, sv.gastado, sv.mensajes, sv.presupuestoDiario, sv.pais, sv.reclutamiento], ['2026-11', 'USD', 123.45, 42, 25, 'SV', false])
  assert.deepEqual(filas.find((f) => f.marca === '').gastado, 5, 'página que no es de RED → sin página')
  assert.equal(filas.find((f) => f.campana === 'Nueva VACANTE RH').reclutamiento, true)
  assert.equal(paginaDelAnuncio({ creative: { instagram_user_id: '222' } }), '222')
})

test('transformar: fecha y hora en UTC−6 antes de agrupar; tramos de 30 días', () => {
  assert.equal(fechaGt('2026-12-01T05:59:00+0000'), '2026-11-30', 'antes de las 6 UTC es el día anterior (y el mes anterior)')
  assert.equal(horaGt('2026-11-10T02:00:00+0000'), 20)
  assert.deepEqual(tramos(0, 31 * 86400).map((t) => (t.until - t.since) / 86400), [30, 1])
})

test('transformar: métricas de página por mes (suma de alcance diario; seguidores = último valor, no la suma)', () => {
  const ins = [
    { name: 'page_total_media_view_unique', values: [{ value: 100, end_time: '2026-10-31T07:00:00+0000' }, { value: 50, end_time: '2026-11-02T08:00:00+0000' }, { value: 70, end_time: '2026-11-03T08:00:00+0000' }] },
    { name: 'page_media_view', values: [{ value: 300, end_time: '2026-11-03T08:00:00+0000' }] },
    { name: 'page_post_engagements', values: [{ value: 9, end_time: '2026-11-03T08:00:00+0000' }] },
    { name: 'page_follows', values: [{ value: 2430, end_time: '2026-11-02T08:00:00+0000' }, { value: 2434, end_time: '2026-11-03T08:00:00+0000' }] },
  ]
  const m = metricasPagina(ins, ['2026-11', '2026-10'])
  assert.deepEqual(m['2026-11'], { alcanceDiario: 120, vistas: 300, interacciones: 9, cuentasInteraccion: null, seguidores: 2434 })
  assert.equal(m['2026-10'].alcanceDiario, 100)
  const ig = metricasInstagram([{ name: 'reach', values: [{ value: 40 }, { value: 60 }] }],
    [[{ name: 'views', total_value: { value: 500 } }, { name: 'accounts_engaged', total_value: { value: 7 } }], [{ name: 'views', total_value: { value: 20 } }, { name: 'total_interactions', total_value: { value: 8 } }]])
  assert.deepEqual(ig, { alcanceDiario: 100, vistas: 520, interacciones: 8, cuentasInteraccion: 7, seguidores: null })
})

test('meta: firma appsecret_proof, errores clasificados y páginas', async () => {
  const c = configuracionMeta(ENV)
  assert.match(c.prueba, /^[0-9a-f]{64}$/)
  assert.equal(c.version, 'v25.0')
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

test('reclutamiento: palabras y frases completas, sin mayúsculas ni tildes', () => {
  for (const n of ['Nueva vacante RH', '2026 NOVIEMBRE 13 - MARKETING PLAZA', '3 PLAZAS DE TRABAJO', 'Contratación inmediata', 'Estamos contratando',
    '2026 NOVIEMBRE 11 EJECUTIVO DE VENTAS', 'Únete al equipo', 'Empleos', 'Reclutamiento noviembre']) assert.equal(esReclutamiento(n), true, n)
  for (const n of ['2026 NOVIEMBRE 9 - ANIMACIÓN SEGURIDAD', '2026 - OCTUBRE 30 - BF', 'Radios para trabajadores', 'RHINO promo', 'Ventas ejecutivas', 'Reúnete']) assert.equal(esReclutamiento(n), false, n)
  assert.ok(PALABRAS_RECLUTAMIENTO.length >= 10)
})

test('rutas: anuncios repartidos por página del anuncio, con reclutamiento marcado; sin cuadro avisa qué falta', async () => {
  vaciarCacheRedes()
  const llamadas = []
  const fetchFn = metaFalsa({
    '/act_333': { name: 'Cuenta inventada', currency: 'USD' },
    '/act_333/campaigns': { data: [{ id: '7', name: 'C', lifetime_budget: '50000' }] },
    '/act_333/ads': { data: [{ id: 'a1', creative: { actor_id: '111' } }] },
    '/act_333/insights': (u) => {
      assert.deepEqual(JSON.parse(u.searchParams.get('time_range')), { since: '2026-10-01', until: '2026-11-30' })
      assert.equal(u.searchParams.get('level'), 'ad')
      return { data: [{ ad_id: 'a1', campaign_id: '7', campaign_name: 'C', date_start: '2026-11-01', spend: '10', reach: '1', impressions: '2', clicks: '3', actions: [] }] }
    },
  }, llamadas)
  // La misma cuenta anotada en dos marcas se lee una sola vez.
  const cuadro = { ...CUADRO, sv: { ...CUADRO.sv, cuentasAnuncios: ['act_333'] } }
  const r = await responderRedes({ recurso: 'anuncios', method: 'GET', query: { mes: '2026-11' }, env: ENV, fetchFn, ahora: AHORA, cuadro })
  const [ad] = JSON.parse(r.body).anuncios
  assert.deepEqual([ad.moneda, ad.presupuesto, ad.marca, ad.pais, ad.reclutamiento], ['USD', 500, 'gt', 'GT', false])
  assert.deepEqual(JSON.parse(r.body).marcasConAnuncios, ['gt'], 'marcas con algún anuncio en la cuenta, de cualquier mes')
  assert.equal(llamadas.filter((u) => u.pathname.endsWith('/act_333/insights')).length, 1)
  const vacio = { gt: { ...CUADRO.gt, paginaFacebook: '', instagram: '', cuentasAnuncios: [] }, sv: { ...CUADRO.sv, paginaFacebook: '' }, dr: CUADRO.dr }
  assert.equal((await responderRedes({ recurso: 'cuentas', method: 'GET', env: ENV, cuadro: vacio })).status, 503)
})

test('rutas: cuentas con métricas del mes y del anterior (Facebook con token de página; Instagram por tramos)', async () => {
  vaciarCacheRedes()
  const llamadas = []
  const fetchFn = metaFalsa({
    '/111': (u) => (u.searchParams.get('fields') === 'access_token' ? { access_token: 'token-pagina-inventado' } : { name: 'Página', followers_count: 2400, fan_count: 2400 }),
    '/111/insights': { data: [{ name: 'page_total_media_view_unique', values: [{ value: 10, end_time: '2026-11-03T08:00:00+0000' }] },
      { name: 'page_follows', values: [{ value: 2434, end_time: '2026-11-03T08:00:00+0000' }] }] },
    '/222': { username: 'cuenta_inventada', followers_count: 210 },
    '/222/insights': (u) => (u.searchParams.get('metric_type') === 'time_series'
      ? { data: [{ name: 'reach', values: [{ value: 5 }] }] }
      : { data: [{ name: 'views', total_value: { value: 9 } }] }),
  }, llamadas)
  const cuadro = { ...CUADRO, gt: { ...CUADRO.gt, cuentasAnuncios: [] }, sv: { ...CUADRO.sv, paginaFacebook: '' } }
  const r = await responderRedes({ recurso: 'cuentas', method: 'GET', query: { mes: '2026-11' }, env: ENV, fetchFn, ahora: AHORA, cuadro })
  const c = JSON.parse(r.body)
  assert.equal(r.status, 200)
  assert.deepEqual(c.meses, ['2026-11', '2026-10'])
  const fb = c.cuentas.find((x) => x.red === 'fb')
  const ig = c.cuentas.find((x) => x.red === 'ig')
  assert.equal(fb.seguidores, 2434, 'Facebook: último valor de page_follows')
  assert.equal(fb.metricas['2026-11'].alcanceDiario, 10)
  assert.equal(ig.seguidores, 210)
  assert.deepEqual([ig.metricas['2026-11'].alcanceDiario, ig.metricas['2026-11'].vistas], [5, 9])
  const insFb = llamadas.find((u) => u.pathname.endsWith('/111/insights'))
  assert.equal(insFb.searchParams.get('access_token'), 'token-pagina-inventado')
  assert.ok(Number(insFb.searchParams.get('until')) <= AHORA().getTime() / 1000, 'nunca pide fechas futuras')
  assert.ok(llamadas.filter((u) => u.pathname.endsWith('/222/insights')).every((u) => Number(u.searchParams.get('until')) - Number(u.searchParams.get('since')) <= 30 * 86400))
})

test('rutas: el token, la clave, el appsecret_proof y las URLs firmadas nunca salen en la respuesta ni en los logs', async () => {
  vaciarCacheRedes()
  const prueba = configuracionMeta(ENV).prueba
  const logs = []
  const original = console.error
  console.error = (...a) => logs.push(a.join(' '))
  try {
    // Meta «responde» con un mensaje que repite la URL firmada: no debe salir a ninguna parte.
    const eco = async (url) => ({ ok: false, status: 400, json: async () => ({ error: { code: 1, message: `fallo en ${url}` } }) })
    const r = await responderRedes({ recurso: 'programadas', method: 'GET', query: { mes: '2026-11' }, env: ENV, fetchFn: eco, ahora: AHORA, cuadro: CUADRO })
    const lanza = async () => { throw new Error(`red caída en https://graph.facebook.com/x?access_token=${ENV.META_TOKEN}&appsecret_proof=${prueba}`) }
    vaciarCacheRedes()
    const r2 = await responderRedes({ recurso: 'cuentas', method: 'GET', query: { mes: '2026-11' }, env: ENV, fetchFn: lanza, ahora: AHORA, cuadro: CUADRO })
    for (const texto of [r.body, r2.body, ...logs]) {
      for (const secreto of [ENV.META_TOKEN, ENV.META_APP_SECRET, prueba, 'access_token', 'appsecret_proof', 'graph.facebook.com']) assert.ok(!texto.includes(secreto), `se filtró «${secreto}»`)
    }
    assert.ok(logs.length > 0)
  } finally {
    console.error = original
  }
})
