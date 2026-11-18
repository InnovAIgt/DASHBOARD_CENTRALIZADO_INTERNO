import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularMailing } from './calculos.js'
import { RECOMENDACIONES, armarInformeMailing, recomendacionRebote } from './detallePersonas.js'

function fila({ id = '101', nombre = 'GERENTE GENERAL campaña', correo, estado = 'entregado', reason = '', open = false, click = false, internal = false }) {
  const fecha = '2026-03-10T09:00:00'
  return {
    canal: 'mailing',
    campanaId: id,
    campanaNombre: nombre,
    correo: internal ? 'prueba@red.com.gt' : correo,
    fechaEnvio: fecha,
    fechaEntrega: estado === 'entregado' ? fecha : null,
    fechaReboteDuro: estado === 'permanente' ? '2026-03-10T10:00:00' : null,
    fechaReboteSuave: estado === 'temporal' ? '2026-03-10T10:00:00' : null,
    motivoReboteDuro: estado === 'permanente' ? reason : '',
    motivoReboteSuave: estado === 'temporal' ? reason : '',
    aperturaReal: open,
    aperturasTotales: Number(open),
    aperturasApple: 0,
    clicsTotales: Number(click),
    baja: false,
    queja: false,
    fechaApertura: open ? '2026-03-10T11:00:00' : null,
    fechaBaja: null,
    fechaQueja: null,
    enlaces: [],
  }
}

const filas = [
  fila({ correo: 'persona.gt@empresa.gt', open: true, click: true }),
  fila({ correo: 'persona.sv@empresa.sv', estado: 'temporal', reason: 'Mailbox full' }),
  fila({ correo: 'persona.com@empresa.com', estado: 'permanente', reason: 'User unknown' }),
  fila({ correo: 'ignorar@empresa.gt', internal: true }),
]

test('el filtro país cambia métricas y conserva el total global por vista', () => {
  const todos = calcularMailing(filas)
  const guatemala = calcularMailing(filas, { pais: 'Guatemala' })
  assert.equal(todos.totales.enviados, 3)
  assert.equal(todos.totales.totalBrevo.enviados, 4)
  assert.equal(guatemala.totales.enviados, 1)
  assert.equal(guatemala.totales.totalBrevo.enviados, 2)
  assert.equal(guatemala.disponibles.length, 1)
})

test('las listas por persona cuadran con la tarjeta y aplican país, campaña y vista', () => {
  const entregados = armarInformeMailing(filas, { tarjeta: 'entregados' })
  assert.equal(entregados.personas.length, 1)
  assert.equal(entregados.totalTarjeta, 1)
  assert.equal(entregados.cuadra, true)

  const gtBrevo = armarInformeMailing(filas, { vista: 'totalBrevo', pais: 'Guatemala', tarjeta: 'entregados' })
  assert.equal(gtBrevo.personas.length, 2)
  assert.equal(gtBrevo.totalTarjeta, 2)
  assert.equal(gtBrevo.cuadra, true)
  assert.equal(gtBrevo.personas.every((p) => p.pais === 'Guatemala'), true)
})

test('el informe respeta fechas/cargos y calcula totales por persona', () => {
  const dentro = armarInformeMailing(filas, { desde: '2026-03-10', hasta: '2026-03-10', cargos: new Set(['Gerente General']) })
  assert.equal(dentro.personas.length, 3)
  assert.equal(dentro.totales.personas, 3)
  assert.equal(dentro.totales.rebotesPermanentes, 1)
  assert.equal(dentro.totales.rebotesTemporales, 1)

  const fuera = armarInformeMailing(filas, { desde: '2026-03-11' })
  assert.equal(fuera.personas.length, 0)
  assert.equal(fuera.totales.personas, 0)
})

test('las recomendaciones usan motivos de rebote sin devolverlos en los agregados', () => {
  assert.equal(recomendacionRebote('', { queja: true }), 'Quitar de la lista; no volver a enviar')
  const agregado = JSON.stringify(calcularMailing(filas))
  assert.equal(agregado.includes('persona.gt@empresa.gt'), false)
  assert.equal(agregado.includes('User unknown'), false)
})


test('reglas fijas de recomendación: cada regla con motivos inventados', () => {
  const R = RECOMENDACIONES
  const casos = [
    // Correo inexistente o rechazado → corregir o quitar
    ['hard bounce', R.correo],
    ['  Hard Bounce ', R.correo],
    ['550 5.1.1 <ana@ejemplo.test> recipient address rejected', R.correo],
    ['550 5.5.0 Requested action not taken: mailbox unavailable (X1) [mx.ejemplo.test]', R.correo],
    ['550 No mailbox by that name is currently available', R.correo],
    ['550-5.1.1 The email account that you tried to reach does not exist. ?p=NoSuchUser abc123 - gsmtp', R.correo],
    ['550 5.1.1 <b@ejemplo.test>: Recipient address rejected: User unknown in local recipient table', R.correo],
    ['550 5.4.1 Recipient address rejected: Access denied. [mx.ejemplo.test]', R.correo],
    ['550 5.4.1 Access denied', R.correo],
    // Buzón lleno e inactivo → quitar
    ["552-5.2.2 The recipient's inbox is out of storage space and inactive. ?p=OverQuotaPerm x1 - gsmtp", R.buzonInactivo],
    ['552 mailbox OverQuotaPerm', R.buzonInactivo],
    // Buzón lleno temporal → reintento
    ["452-4.2.2 The recipient's inbox is out of storage space. Please direct the   452-4.2.2 recipient to ?p=OverQuotaTemp y2 - gsmtp", R.buzon],
    // Dominio
    ['Unable to find MX of domain gmail.com.sv', R.dominio],
    ['Unable to find MX of domain empresa-ficticia.test', R.dominio],
    // Antispam del cliente
    ['550 5.5.1 Recipient rejected - OXSUS001_403 - https://postmaster-oxsus.vadesecure.com/inbound_error_codes/#_403', R.antispam],
    ['550 Recipient rejected 403 by filter', R.antispam],
    ['rejected by vadesecure gateway', R.antispam],
    // Servidor del cliente
    ['550-Please turn on SMTP Authentication in your mail client. 550-relay.ejemplo.test [192.0.2.1]:1234 is not permitted to relay', R.servidorCliente],
    ['authentication required', R.servidorCliente],
    ['host 192.0.2.9 is not permitted to relay through this server', R.servidorCliente],
    // Tiempo de espera
    ['connection timeout', R.temporal],
    // Mensaje demasiado grande (casos futuros)
    ['552 Message too large for this recipient', R.grande],
    ['Message exceeds size limit of 10 MB', R.grande],
    ['552 5.3.4 Error: message file too big', R.grande],
    ['552-5.3.4 Your message exceeded Google size limits', R.grande],
    // Autenticación del remitente (casos futuros)
    ['550 5.7.26 Unauthenticated email from ejemplo.test is not accepted', R.ti],
    ['550 5.7.1 rejected: SPF check failed for ejemplo.test', R.ti],
    ['DKIM signature invalid', R.ti],
    ['message rejected due to DMARC policy', R.ti],
    // Lo demás
    ['Message delivery failed', R.manual],
    ['550 Recipient rejected', R.manual],
    ['motivo inesperado', R.manual],
    ['', R.manual],
  ]
  for (const [motivo, esperado] of casos) assert.equal(recomendacionRebote(motivo), esperado, motivo)
  assert.equal(R.dominio, 'Revisar si el dominio está mal escrito (ej. gmail.com.sv); si no, quitar')
  assert.equal(R.buzonInactivo, 'Buzón lleno e inactivo: quitar de la lista')
  assert.equal(R.grande, 'Reducir imágenes o adjuntos del correo')
  assert.equal(R.ti, 'Avisar a TI: revisar SPF, DKIM y DMARC')
})
