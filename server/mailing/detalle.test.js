// Pruebas de server/mailing/detalle.js con eventos INVENTADOS (correos de example.com). No se llama a Supabase.
import assert from 'node:assert/strict'
import test from 'node:test'
import { armarDetalle, indicacion, mostrarCorreos, responderDetalle, vaciarCacheDetalle } from './detalle.js'

const ev = (campana_id, correo, evento, fecha, extra = {}) => ({ campana_id, correo, evento, fecha_evento: fecha, fecha_envio: '2026-11-05T18:00:00.000Z', motivo: null, origen: 'historial', ...extra })

const EVENTOS = [
  ev(10, 'persona1@example.com', 'delivered', '2026-11-05T18:00:05Z'),
  ev(10, 'persona1@example.com', 'opened', '2026-11-05T19:00:00Z'),
  ev(10, 'persona1@example.com', 'click', '2026-11-05T19:00:00Z'),
  ev(10, 'persona2@example.com', 'hard_bounce', '2026-11-05T18:00:06Z', { motivo: '550 5.1.1 persona2@example.com does not exist (inventado)' }),
  ev(10, 'persona3@example.com', 'soft_bounce', '2026-11-05T18:00:07Z', { motivo: 'Mailbox full (inventado)' }),
  ev(10, 'persona4@example.com', 'delivered', '2026-11-05T18:00:05Z'),
  ev(10, 'persona4@example.com', 'apple_mpp', '2026-11-05T18:00:05Z', { cantidad: 2 }),
  ev(10, 'persona4@example.com', 'opened', '2026-11-24T10:00:00Z', { origen: 'webhook' }),
  ev(11, 'persona5@example.com', 'soft_bounce', '2026-11-20T10:00:00Z', { motivo: 'Unable to find MX of domain inventado.test', origen: 'webhook' }),
  ev(11, 'persona6@example.com', 'delivered', '2026-11-20T10:00:00Z', { origen: 'webhook' }),
  ev(11, 'persona6@example.com', 'apple_mpp', '2026-11-20T10:00:00Z', { cantidad: 1 }),
]

test('mostrarCorreos: por defecto sí; solo «no» los oculta', () => {
  assert.equal(mostrarCorreos({}), true)
  assert.equal(mostrarCorreos({ MKT_MOSTRAR_CORREOS: 'si' }), true)
  assert.equal(mostrarCorreos({ MKT_MOSTRAR_CORREOS: ' NO ' }), false)
  assert.equal(mostrarCorreos({ MKT_MOSTRAR_CORREOS: 'false' }), false)
})

test('indicación: tabla aprobada', () => {
  assert.equal(indicacion({ estado: 'entregado', status: 'MANTENER' }), 'Sin acción')
  assert.equal(indicacion({ estado: 'sin_confirmacion', status: 'MANTENER' }), 'Sin acción')
  assert.equal(indicacion({ estado: 'rebote_temporal', status: 'CORREGIR', motivoTecnico: 'Dominio sin registros MX' }), 'Verificar el dominio y confirmar la dirección')
  assert.match(indicacion({ estado: 'rebote_permanente', status: 'CORREGIR', motivoTecnico: 'Usuario desconocido' }), /^Pedir o confirmar la dirección correcta/)
  const m = (categoria) => indicacion({ estado: 'rebote_temporal', status: 'MANTENER', categoria })
  assert.equal(m('Conectividad'), 'Reintentar después')
  assert.equal(m('Capacidad de buzón'), 'Pedir que libere espacio y reintentar')
  assert.equal(m('Autenticación'), 'Revisar autenticación y permisos SMTP')
  assert.equal(m('Restricción de servidor'), 'Revisar autenticación y permisos SMTP')
  for (const c of ['Bloqueo de recepción', 'Restricción de seguridad', 'Bloqueo de seguridad']) assert.equal(m(c), 'Revisar reputación, autenticación y filtros del destinatario')
  assert.equal(m('Restricción de entrega'), 'Revisar la política o ruta del servidor de destino')
  assert.equal(m('Causa no especificada'), 'Revisar en el próximo envío')
  assert.equal(m('Diagnóstico pendiente'), 'Revisar en el próximo envío')
})

test('armarDetalle: una fila por correo y campaña, con estado, CORREGIR, apertura, clic y origen', () => {
  const filas = armarDetalle(EVENTOS)
  assert.equal(filas.length, 6)
  const f = (correo, campana) => filas.find((x) => x.correo === correo && x.campana_id === campana)
  const p1 = f('persona1@example.com', 10)
  assert.deepEqual([p1.estado, p1.status, p1.apertura, p1.clic, p1.indicacion, p1.origen], ['entregado', 'MANTENER', 'APERTURA REGISTRADA', 'CLIC REGISTRADO', 'Sin acción', 'historial'])
  const p2 = f('persona2@example.com', 10)
  assert.deepEqual([p2.estado, p2.status, p2.motivoTecnico, p2.fechaRebote], ['rebote_permanente', 'CORREGIR', 'Cuenta destinataria inexistente', '2026-11-05T18:00:06.000Z'])
  assert.equal(f('persona3@example.com', 10).indicacion, 'Pedir que libere espacio y reintentar')
  const p4 = f('persona4@example.com', 10)
  assert.deepEqual([p4.apertura, p4.origen], ['APERTURA REGISTRADA', 'ambos'])
  assert.equal(f('persona6@example.com', 11).apertura, 'APERTURA AUTOMÁTICA')
  assert.equal(f('persona5@example.com', 11).indicacion, 'Verificar el dominio y confirmar la dirección')
  assert.equal(p1.fechaEnvio, '2026-11-05T18:00:00.000Z')
  assert.deepEqual([p1.baja, p1.spam], [false, false])
  const conBaja = armarDetalle([ev(12, 'persona7@example.com', 'delivered', '2026-11-05T18:00:05Z'), ev(12, 'persona7@example.com', 'unsubscribe', '2026-11-05T19:00:00Z'), ev(12, 'persona7@example.com', 'spam', '2026-11-05T19:01:00Z')])[0]
  assert.deepEqual([conBaja.baja, conBaja.spam, conBaja.estado], [true, true, 'entregado'])
})

test('armarDetalle: nunca devuelve el texto original del motivo (puede traer correos)', () => {
  const texto = JSON.stringify(armarDetalle(EVENTOS))
  assert.ok(!texto.includes('does not exist'))
  assert.ok(!texto.includes('inventado'))
  for (const fila of armarDetalle(EVENTOS)) assert.ok(!('motivo' in fila))
})

const leerFalso = (eventos = EVENTOS, falla = null) => {
  const llamadas = []
  return { llamadas, fn: async (o) => { llamadas.push(o); if (falla) throw falla; return o.campanas ? eventos.filter((e) => o.campanas.includes(e.campana_id)) : eventos } }
}

test('responderDetalle: muestra correos por defecto, sin caché de Vercel y sin indexar', async () => {
  vaciarCacheDetalle()
  const r = await responderDetalle({ method: 'GET', env: {}, leer: leerFalso().fn })
  const d = JSON.parse(r.body)
  assert.equal(r.status, 200)
  assert.equal(d.mostrarCorreos, true)
  assert.equal(d.total, 6)
  assert.equal(d.filas.length, 6)
  assert.equal(r.headers['Cache-Control'], 'no-store')
  assert.match(r.headers['X-Robots-Tag'], /noindex/)
})

test('responderDetalle: con MKT_MOSTRAR_CORREOS = no, solo el número de filas y ningún @', async () => {
  vaciarCacheDetalle()
  const r = await responderDetalle({ method: 'GET', env: { MKT_MOSTRAR_CORREOS: 'no' }, leer: leerFalso().fn })
  const d = JSON.parse(r.body)
  assert.equal(d.mostrarCorreos, false)
  assert.equal(d.total, 6)
  assert.deepEqual(d.filas, [])
  assert.ok(!r.body.includes('@'))
})

test('responderDetalle: agrega el cruce con Cumplimiento (exacto y posible por dominio)', async () => {
  vaciarCacheDetalle()
  const { indexarContactos } = await import('../clientes/cruce.js')
  const indiceFalso = indexarContactos([
    { pais: 'GT', codigo: '100', cliente: 'Empresa Inventada', ejecutivo: 'Ejecutiva A', usuario_ejecutivo: 'ea', cargo: 'gg', email: 'persona1@example.com' },
    { pais: 'SV', codigo: '200', cliente: 'Otra Inventada', ejecutivo: 'Ejecutivo B', usuario_ejecutivo: 'eb', cargo: 'gf', email: 'alguien@otra-inventada.test' },
  ])
  const r = await responderDetalle({ method: 'GET', env: {}, leer: leerFalso().fn, indice: async () => indiceFalso })
  const d = JSON.parse(r.body)
  assert.equal(d.cruce, 'ok')
  const p1 = d.filas.find((f) => f.correo === 'persona1@example.com')
  assert.deepEqual([p1.clientes.length, p1.clientes[0].cliente, p1.clientes[0].cargos, p1.posibles.length], [1, 'Empresa Inventada', ['GG'], 0])
  // example.com está en la base por persona1 → los demás de example.com son posibles por dominio
  const p2 = d.filas.find((f) => f.correo === 'persona2@example.com')
  assert.deepEqual([p2.clientes.length, p2.posibles.length], [0, 1])
})

test('responderDetalle: si Cumplimiento falla, el detalle sigue y avisa', async () => {
  vaciarCacheDetalle()
  const r = await responderDetalle({ method: 'GET', env: {}, leer: leerFalso().fn, indice: async () => { throw new Error('Cumplimiento: tiempo agotado') } })
  const d = JSON.parse(r.body)
  assert.equal(r.status, 200)
  assert.equal(d.cruce, 'error')
  assert.match(d.avisoCruce, /No se pudo leer Cumplimiento/)
  assert.equal(d.filas[0].clientes, null)
  vaciarCacheDetalle()
  const s = JSON.parse((await responderDetalle({ method: 'GET', env: {}, leer: leerFalso().fn })).body)
  assert.equal(s.cruce, 'sin_configurar', 'sin CC_DB_PASSWORD no intenta conectarse')
})

test('responderDetalle: filtro por campañas, caché, solo GET y errores', async () => {
  vaciarCacheDetalle()
  const l = leerFalso()
  const r = await responderDetalle({ method: 'GET', query: { campanas: '11' }, env: {}, leer: l.fn, ahora: 0 })
  assert.equal(JSON.parse(r.body).filas.length, 2)
  await responderDetalle({ method: 'GET', query: { campanas: '11' }, env: {}, leer: l.fn, ahora: 1000 })
  assert.equal(l.llamadas.length, 1, 'usa la copia de 2 minutos')
  assert.equal((await responderDetalle({ method: 'POST', env: {}, leer: l.fn })).status, 405)
  assert.equal((await responderDetalle({ method: 'GET', query: { campanas: 'x' }, env: {}, leer: l.fn })).status, 400)
  vaciarCacheDetalle()
  const e = await responderDetalle({ method: 'GET', env: {}, leer: leerFalso(EVENTOS, new Error('Supabase respondió HTTP 500')).fn })
  assert.equal(e.status, 502)
  assert.ok(!e.body.includes('@'))
})
