// Pruebas de server/sacProxy.js con respuestas inventadas (no se llama a Supabase).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { reenviarSac, SAC_FUENTES, SAC_CACHE_OK, urlFuente } from './sacProxy.js'

/** fetch falso: guarda lo que se pidió y responde lo indicado. */
function fetchFalso({ status = 200, body = '{"contrato":"x/1"}', tipo = 'application/json', falla = null } = {}) {
  const llamadas = []
  const fn = async (url, opciones) => {
    llamadas.push({ url, opciones })
    if (falla) throw falla
    return new Response(body, { status, headers: { 'content-type': tipo } })
  }
  return { fn, llamadas }
}

test('cada ruta va a su función, con la dirección actual si no hay variable', async () => {
  for (const [fuente, nombre] of [['corte', 'sac-corte-publico'], ['vivo', 'sac-vivo-publico'], ['historico', 'sac-historico-semanal']]) {
    const f = fetchFalso()
    const r = await reenviarSac({ fuente, method: 'GET', env: {}, fetchFn: f.fn })
    assert.equal(r.status, 200)
    assert.equal(f.llamadas[0].url, `https://erjmqjcjggxbktxcogkm.supabase.co/functions/v1/${nombre}`)
  }
})

test('las variables de servidor cambian la dirección; una que no es https se ignora', () => {
  assert.equal(urlFuente('corte', { SAC_CORTE_URL: ' https://ejemplo.test/functions/v1/otra ' }), 'https://ejemplo.test/functions/v1/otra')
  assert.equal(urlFuente('vivo', { SAC_VIVO_URL: 'http://inseguro.test/f' }), SAC_FUENTES.vivo.porDefecto)
  assert.equal(urlFuente('historico', { SAC_HIST_URL: 'no es url' }), SAC_FUENTES.historico.porDefecto)
  assert.deepEqual(Object.values(SAC_FUENTES).map(f => f.variable), ['SAC_CORTE_URL', 'SAC_VIVO_URL', 'SAC_HIST_URL'])
})

test('pasa los parámetros tal cual y no reenvía encabezados del navegador (Origin)', async () => {
  const f = fetchFalso()
  await reenviarSac({ fuente: 'corte', method: 'GET', query: '?ejemplo=1&pais=GT', env: {}, fetchFn: f.fn })
  const { url, opciones } = f.llamadas[0]
  assert.equal(new URL(url).search, '?ejemplo=1&pais=GT')
  assert.deepEqual(opciones.headers, { Accept: 'application/json' })
  assert.equal(opciones.method, 'GET')
})

test('solo GET: otro método responde 405 con Allow: GET y no llama a la función', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const f = fetchFalso()
    const r = await reenviarSac({ fuente: 'vivo', method, env: {}, fetchFn: f.fn })
    assert.equal(r.status, 405)
    assert.equal(r.headers.Allow, 'GET')
    assert.equal(f.llamadas.length, 0)
  }
})

test('respuesta correcta: mismo cuerpo, tipo y caché corto (60 s); los errores no se guardan', async () => {
  const cuerpo = '{"contrato":"sac-corte-publico/1","corte":{"id":1}}'
  let r = await reenviarSac({ fuente: 'corte', method: 'GET', env: {}, fetchFn: fetchFalso({ body: cuerpo }).fn })
  assert.equal(r.body, cuerpo)
  assert.equal(r.headers['Content-Type'], 'application/json')
  assert.equal(r.headers['Cache-Control'], SAC_CACHE_OK)
  assert.match(SAC_CACHE_OK, /max-age=60/)
  r = await reenviarSac({ fuente: 'corte', method: 'GET', env: {}, fetchFn: fetchFalso({ status: 500, body: '{"error":"x"}' }).fn })
  assert.equal(r.status, 500)
  assert.equal(r.body, '{"error":"x"}')                 // el HTML muestra p.error tal cual
  assert.equal(r.headers['Cache-Control'], 'no-store')
})

test('sin conexión → 502; sin respuesta a tiempo → 504; fuente desconocida → 404 (con { error })', async () => {
  let r = await reenviarSac({ fuente: 'vivo', method: 'GET', env: {}, fetchFn: fetchFalso({ falla: new TypeError('fetch failed') }).fn })
  assert.equal(r.status, 502)
  assert.equal(JSON.parse(r.body).error, 'No se pudo conectar con sac-vivo-publico.')
  const lento = (url, { signal }) => new Promise((_, rechazar) => signal.addEventListener('abort', () => rechazar(Object.assign(new Error('abortado'), { name: 'AbortError' }))))
  r = await reenviarSac({ fuente: 'historico', method: 'GET', env: {}, fetchFn: lento, esperaMs: 20 })
  assert.equal(r.status, 504)
  assert.equal(r.headers['Cache-Control'], 'no-store')
  r = await reenviarSac({ fuente: 'otra', method: 'GET', env: {}, fetchFn: fetchFalso().fn })
  assert.equal(r.status, 404)
})

test('el HTML de Servicio al Cliente pide las 3 fuentes a /api/sac/... y ya no a Supabase directo', () => {
  const html = fs.readFileSync(new URL('../public/dashboards/servicioAlCliente/servicioAlCliente.html', import.meta.url), 'utf8')
  assert.match(html, /const SAC_CORTE_URL = "\/api\/sac\/corte";/)
  assert.match(html, /const SAC_VIVO_URL = "\/api\/sac\/vivo";/)
  assert.match(html, /const SAC_HIST_URL = "\/api\/sac\/historico";/)
  assert.ok(!/= "https:\/\/erjmqjcjggxbktxcogkm\.supabase\.co\/functions\/v1\//.test(html), 'queda una llamada directa a las funciones')
})
