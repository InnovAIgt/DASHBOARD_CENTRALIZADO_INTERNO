// Pruebas de Anuncios fase 2 con respuestas INVENTADAS de Meta (nunca se llama a Meta).
import assert from 'node:assert/strict'
import test from 'node:test'
import { armarDetalle, formulariosDe, franjaDe, leerDetalle, publicoDe, rangoDias, vaciarCacheDetalle } from './detalleAnuncios.js'
import { ErrorMeta, llamarMeta } from './meta.js'
import { responderRedes, vaciarCacheRedes } from './rutas.js'

const MSJ = (v) => ({ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: String(v) })
const ADS = [{ id: 'a1', creative: { actor_id: '444' } }, { id: 'a2', creative: { actor_id: '999' } }, { id: 'a3', creative: { actor_id: '444' } }]
const MARCA = new Map([['444', 'sv']])

test('detalle: edad y sexo, ubicaciones, horas (UTC−6 de la cuenta), sin reclutamiento y con marca por página', () => {
  const d = armarDetalle({
    ads: ADS, marcaDe: MARCA,
    edadSexo: [
      { ad_id: 'a1', campaign_name: 'Promo', age: '25-34', gender: 'male', spend: '10', actions: [MSJ(4)] },
      { ad_id: 'a3', campaign_name: 'Promo', age: '25-34', gender: 'male', spend: '5', actions: [MSJ(2)] },
      { ad_id: 'a1', campaign_name: 'Nueva vacante RH', age: '25-34', gender: 'male', spend: '99', actions: [MSJ(50)] },
    ],
    ubicaciones: [{ ad_id: 'a2', campaign_name: 'Promo', publisher_platform: 'facebook', platform_position: 'feed', spend: '3', impressions: '100', clicks: '4', actions: [] }],
    horas: [{ ad_id: 'a1', campaign_name: 'Promo', date_start: '2026-11-23', hourly_stats_aggregated_by_advertiser_time_zone: '13:00:00 - 13:59:59', spend: '1', actions: [MSJ(1)] }],
  })
  assert.deepEqual(d.edadSexo, [{ marca: 'sv', edad: '25-34', sexo: 'hombres', gastado: 15, mensajes: 6 }], 'se suman los anuncios; el reclutamiento no entra')
  assert.deepEqual(d.ubicaciones[0], { marca: '', plataforma: 'facebook', posicion: 'feed', gastado: 3, mensajes: 0, impresiones: 100, clics: 4 }, 'página que no es de RED → sin marca')
  assert.deepEqual(d.horas[0], { marca: 'sv', dia: 0, franja: 6, gastado: 1, mensajes: 1 }, '23/11/2026 es lunes; 13 h → franja 12–14')
  assert.equal(franjaDe('00:00:00 - 00:59:59'), 0)
})

test('detalle: segmentos con su público, presupuestos (campaña o suma de conjuntos) y formularios (solo conteo)', () => {
  const d = armarDetalle({
    ads: ADS, marcaDe: MARCA,
    porAnuncio: [
      { ad_id: 'a1', adset_id: 's1', campaign_id: 'c1', campaign_name: 'Promo', spend: '20', actions: [MSJ(8), { action_type: 'lead', value: '3' }, { action_type: 'onsite_conversion.lead_grouped', value: '3' }] },
      { ad_id: 'a3', adset_id: 's2', campaign_id: 'c2', campaign_name: 'Radios', spend: '6', actions: [MSJ(1)] },
      { ad_id: 'a1', adset_id: 's9', campaign_id: 'c9', campaign_name: 'Únete al equipo', spend: '50', actions: [MSJ(10), { action_type: 'lead', value: '7' }] },
    ],
    conjuntos: [
      { id: 's1', name: 'Conjunto A', campaign_id: 'c1', targeting: { age_min: 25, age_max: 65, genders: [], flexible_spec: [{ interests: [{ name: 'Logística' }, { name: 'Transporte' }] }], geo_locations: { countries: ['SV'] } } },
      { id: 's2', name: 'Conjunto B', campaign_id: 'c2', daily_budget: '1000', targeting: { age_min: 18, genders: [2], publisher_platforms: ['facebook'] } },
      { id: 's3', name: 'Conjunto C', campaign_id: 'c2', daily_budget: '500' },
    ],
    campanas: [{ id: 'c1', lifetime_budget: '30000' }, { id: 'c2' }],
  })
  const s1 = d.segmentos.find((s) => s.nombre === 'Conjunto A')
  assert.deepEqual(s1.publico, { edad: '25–65+', sexo: 'Ambos', ubicaciones: 'Automáticas', intereses: ['Logística', 'Transporte'], paises: ['SV'], lugares: [], idiomas: 0, publicos: [], posiciones: [] })
  assert.equal(d.segmentos.find((s) => s.nombre === 'Conjunto B').publico.sexo, 'Mujeres')
  assert.equal(d.segmentos.length, 2, 'sin el conjunto de reclutamiento')
  const c1 = d.presupuestos.find((p) => p.campana === 'Promo')
  const c2 = d.presupuestos.find((p) => p.campana === 'Radios')
  assert.deepEqual([c1.presupuestoTotal, c1.presupuestoDiario, c1.mensajes], [300, null, 8])
  assert.deepEqual([c2.presupuestoDiario, c2.presupuestoTotal], [15, null], 'suma de los conjuntos: 10 + 5')
  assert.deepEqual(d.formularios, [{ marca: 'sv', formularios: 3 }], 'lead y lead_grouped son el mismo envío; reclutamiento fuera')
  assert.equal(formulariosDe({ actions: [] }), 0)
  assert.equal(publicoDe({}).edad, 'Todas')
})

test('detalle: el rango no pasa de hoy; la ruta pide solo GET por anuncio y responde sin secretos', async () => {
  assert.deepEqual(rangoDias('2026-11', '2026-11-24'), { since: '2026-11-01', until: '2026-11-24' })
  assert.deepEqual(rangoDias('2026-10', '2026-11-24'), { since: '2026-10-01', until: '2026-10-31' })
  vaciarCacheRedes()
  vaciarCacheDetalle()
  const llamadas = []
  const fetchFn = async (url) => {
    const u = new URL(url)
    llamadas.push(u)
    const ruta = u.pathname.replace(/^\/v\d+\.\d+/, '')
    const r = { '/act_333': { currency: 'USD', timezone_name: 'America/El_Salvador' }, '/act_333/ads': { data: ADS } }[ruta] ?? { data: [] }
    return { ok: true, status: 200, json: async () => r }
  }
  const cuadro = { sv: { nombre: 'RED SV', pais: 'SV', paginaFacebook: '444', instagram: '', cuentasAnuncios: ['act_333'] } }
  const r = await responderRedes({ recurso: 'anuncios-detalle', method: 'GET', query: { mes: '2026-11' }, env: { META_TOKEN: 'token-inventado', META_APP_SECRET: 'secreto-inventado' },
    fetchFn, ahora: () => new Date('2026-11-24T15:00:00Z'), cuadro })
  const c = JSON.parse(r.body)
  assert.equal(r.status, 200)
  assert.deepEqual(c.meses, ['2026-11'])
  assert.equal(c.detalle[0].zonaHoraria, 'America/El_Salvador')
  const ins = llamadas.filter((u) => u.pathname.endsWith('/insights'))
  assert.equal(ins.length, 7)
  assert.equal(ins.filter((u) => u.searchParams.get('time_increment') === '7').length, 1, 'por campaña y semana del mes')
  assert.equal(ins.filter((u) => u.searchParams.get('level') === 'adset').length, 2, 'por conjunto: resultados y horas del mes')
  assert.equal(ins.filter((u) => u.searchParams.get('level') === 'ad').length, 3, 'edad y sexo, ubicaciones y por anuncio: por anuncio')
  assert.equal(ins.filter((u) => u.searchParams.get('level') === 'campaign' && u.searchParams.get('breakdowns')?.startsWith('hourly')).length, 1, 'horarios: por campaña')
  assert.ok(ins.every((u) => JSON.parse(u.searchParams.get('time_range')).until === '2026-11-24'))
  assert.ok(!r.body.includes('token-inventado') && !r.body.includes('appsecret_proof'))
  assert.equal((await leerDetalle({ cuentaId: '1', mes: '2026-12', hoy: '2026-11-24', llamar: async () => [], llamarUno: async () => ({}), op: {}, marcaDe: new Map() })).edadSexo.length, 0, 'mes futuro: sin consultas')
})

test('meta: reintenta con espera los códigos pasajeros (1, 2, 4, 17) y no los demás; respeta el límite de tiempo', async () => {
  const env = { META_TOKEN: 'token-inventado', META_APP_SECRET: 'secreto-inventado' }
  let n = 0
  const falla2luego = async () => (++n < 3 ? { ok: false, status: 500, json: async () => ({ error: { code: 2 } }) } : { ok: true, status: 200, json: async () => ({ id: 'x' }) })
  assert.deepEqual(await llamarMeta('/x', {}, { env, fetchFn: falla2luego, esperasReintento: [0, 0] }), { id: 'x' })
  assert.equal(n, 3, 'dos reintentos')
  let m = 0
  const token = async () => { m++; return { ok: false, status: 400, json: async () => ({ error: { code: 190 } }) } }
  await assert.rejects(llamarMeta('/x', {}, { env, fetchFn: token, esperasReintento: [0, 0] }), (e) => e.tipo === 'token')
  assert.equal(m, 1, 'un token vencido no se reintenta')
  await assert.rejects(llamarMeta('/x', {}, { env, fetchFn: falla2luego, hasta: Date.now() + 100 }), (e) => e instanceof ErrorMeta, 'sin tiempo no se intenta')
})

test('detalle: consultas de a 2, si una falla solo su recuadro da error; lo que cargó queda en caché', async () => {
  vaciarCacheDetalle()
  let activas = 0
  let maxActivas = 0
  let fallarEdad = true
  const llamadas = []
  const llamar = async (ruta, p) => {
    activas++; maxActivas = Math.max(maxActivas, activas); llamadas.push(p.breakdowns ?? ruta)
    await new Promise((r) => setTimeout(r, 5))
    activas--
    if (p.breakdowns === 'age,gender' && fallarEdad) throw new ErrorMeta('otro', 'Meta respondió con un error (código 2).', 2)
    if (ruta.endsWith('/ads')) return ADS.map((a) => ({ ...a, campaign_id: a.id === 'a2' ? 'c2' : 'c1' }))
    if (p.level === 'campaign') return [{ campaign_id: 'c1', campaign_name: 'Promo', date_start: '2026-11-23', hourly_stats_aggregated_by_advertiser_time_zone: '13:00:00 - 13:59:59', spend: '2', actions: [MSJ(3)] }]
    if (p.breakdowns) return [{ ad_id: 'a1', campaign_name: 'Promo', publisher_platform: 'facebook', platform_position: 'feed', spend: '1', impressions: '10', actions: [MSJ(1)] }]
    return []
  }
  const llamarUno = async () => ({ currency: 'USD', timezone_name: 'America/El_Salvador' })
  const base = { cuentaId: '333', mes: '2026-11', hoy: '2026-11-24', llamar, llamarUno, op: {}, marcaDe: MARCA }
  const d = await leerDetalle(base)
  assert.ok(maxActivas <= 2, `consultas a la vez: ${maxActivas}`)
  assert.deepEqual(Object.keys(d.errores), ['edadSexo'], 'solo edad y sexo falla')
  assert.equal(d.ubicaciones.length, 1)
  assert.deepEqual([d.horas[0].marca, d.horas[0].mensajes], ['sv', 3], 'horas por campaña, con la marca de sus anuncios')
  const antes = llamadas.length
  fallarEdad = false
  const d2 = await leerDetalle(base)
  assert.deepEqual(d2.errores, {})
  assert.equal(llamadas.length - antes, 1, 'la segunda vez solo se repite la consulta que falló')
})

test('detalle: con Meta colgada, responde antes del límite y marca los recuadros como error', async () => {
  vaciarCacheDetalle()
  const colgada = (ruta, p, o) => new Promise((_, no) => setTimeout(() => no(new ErrorMeta('otro', 'Meta tardó demasiado: se acabó el tiempo de esta consulta.')), Math.max(0, o.hasta - Date.now())))
  const t0 = Date.now()
  const d = await leerDetalle({ cuentaId: '333', mes: '2026-11', hoy: '2026-11-24', llamar: colgada, llamarUno: colgada, op: {}, marcaDe: MARCA, limiteMs: 300 })
  assert.ok(Date.now() - t0 < 1500, `tardó ${Date.now() - t0} ms`)
  assert.deepEqual(Object.keys(d.errores).sort(), ['edadSexo', 'formularios', 'horas', 'presupuestos', 'segmentos', 'ubicaciones'])
})

test('detalle: cada segmentación trae sus anuncios (nombre, gasto, mensajes) y el texto promocionado del que más gastó', () => {
  const d = armarDetalle({
    ads: [{ id: 'a1', name: 'Anuncio uno', creative: { actor_id: '444', body: 'Radios en cuotas' } }, { id: 'a3', name: 'Anuncio tres', creative: { actor_id: '444', effective_object_story_id: '444_7' } }],
    marcaDe: MARCA,
    porAnuncio: [
      { ad_id: 'a1', adset_id: 's1', campaign_id: 'c1', campaign_name: 'Promo', spend: '5', actions: [MSJ(2)] },
      { ad_id: 'a3', adset_id: 's1', campaign_id: 'c1', campaign_name: 'Promo', spend: '9', actions: [MSJ(4)] },
    ],
    conjuntos: [{ id: 's1', name: 'Público A', campaign_id: 'c1' }],
  })
  const [s] = d.segmentos
  assert.deepEqual(s.anuncios.map((a) => [a.nombre, a.gastado, a.mensajes]), [['Anuncio tres', 9, 4], ['Anuncio uno', 5, 2]], 'del que más gastó al que menos')
  assert.deepEqual([s.texto, s.publicacion, s.campana, s.nombre], [null, '444_7', 'Promo', 'Público A'], 'el que más gastó promociona una publicación (su texto sale de la publicación)')
})
