// Pruebas de server/mailing/reglas.js con datos INVENTADOS (nombres de campaña y motivos de ejemplo).
// Siguen docs/marketing/v2/MAILING.md, secciones 2 a 7.
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargoDesdeNombre, cargoFinal, esCampanaPrueba, estadoApertura, estadoClic, estadoFinal, normalizar,
  porcentaje, semaforoEntrega, SIN_CLASIFICAR, statusCorreo, tasas, totalesDesdeBrevo,
} from './reglas.js'

test('normalizar: mayúsculas y sin tildes', () => {
  assert.equal(normalizar('Validación Operación'), 'VALIDACION OPERACION')
  assert.equal(normalizar(null), '')
})

// --- Sección 2: cargo ---

test('regla oficial código-cargo-sector-asunto', () => {
  assert.deepEqual(cargoDesdeNombre('001-GG-SEGURIDAD-Asunto inventado'), { codigo: '001', cargo: 'GG', sector: 'SEGURIDAD', sigueRegla: true })
  assert.deepEqual(cargoDesdeNombre(' 012 - gf - logística - Otro asunto - con guion '), { codigo: '012', cargo: 'GF', sector: 'LOGISTICA', sigueRegla: true })
  assert.equal(cargoDesdeNombre('003-GO-CONSTRUCCION-Asunto').cargo, 'GO')
})

test('formas viejas escritas completas', () => {
  const casos = [
    ['GERENTE GENERAL MES INVENTADO', 'GG'],
    ['Gerente Financiero con costo', 'GF'],
    ['GERENTE DE FINANZAS SIN COSTO', 'GF'],
    ['GERENTE FINANZAS CON COSTO', 'GF'],
    ['GERENTE FINACIERO NOVIEMBRE', 'GF'], // mal escrito, aceptado por Keily (23/11/2026)
    ['GERENTE OPERACIONES SIN COSTO', 'GO'], // sin «DE», aceptado por Keily (23/11/2026)
    ['GERENTE OPERATIVO NOVIEMBRE', 'GO'],
    ['DASHBOARD GERENTE DE OPERACIONES', 'GO'],
  ]
  for (const [nombre, cargo] of casos) {
    const r = cargoDesdeNombre(nombre)
    assert.equal(r.cargo, cargo, nombre)
    assert.equal(r.sector, null)
    assert.equal(r.sigueRegla, false)
  }
})

test('formas viejas abreviadas: G.G, G.F, G.O y «- GG -»', () => {
  const casos = [
    ['BASE COMPLETA G.F - MES INVENTADO', 'GF'],
    ['BASE COMPLETA - G.O  - MES INVENTADO', 'GO'],
    ['BASE COMPLETA - G.G - RADIOS', 'GG'],
    ['BASE G. F INVENTADA', 'GF'],
    ['2da Campaña inventada - GG - Nov19', 'GG'],
    ['Campaña inventada - GF - Nov19', 'GF'],
    ['Campaña inventada -GO- Nov19', 'GO'],
  ]
  for (const [nombre, cargo] of casos) assert.equal(cargoDesdeNombre(nombre).cargo, cargo, nombre)
})

test('lo que no encaja queda sin cargo (Sin clasificar)', () => {
  for (const nombre of [
    'CONSTRUCCION ABRIL INVENTADO',
    'GERENTE FINANCIEROS INVENTADO', // otra palabra
    'GERENTE DE OPERACION', // forma no aceptada
    'GG CAMPAÑA SIN GUIONES',
    'ALGO-GGX-OTRO',
    'GOOGLE ADS INVENTADO',
    'G.FX INVENTADO',
    '',
  ]) assert.equal(cargoDesdeNombre(nombre).cargo, null, nombre)
})

test('si el nombre trae dos cargos distintos, no se adivina', () => {
  assert.equal(cargoDesdeNombre('GERENTE GENERAL Y GERENTE FINANCIERO').cargo, null)
  assert.equal(cargoDesdeNombre('BASE - GG - y G.F').cargo, null)
  assert.equal(cargoDesdeNombre('GERENTE GENERAL - GG - INVENTADO').cargo, 'GG')
})

test('cargoFinal: lo elegido a mano gana; sin ninguno, «Sin clasificar»', () => {
  assert.equal(cargoFinal('GF', 'GG'), 'GF')
  assert.equal(cargoFinal(null, 'GO'), 'GO')
  assert.equal(cargoFinal(undefined, null), SIN_CLASIFICAR)
  assert.equal(cargoFinal('XX', null), SIN_CLASIFICAR)
})

// --- Sección 7: campañas de prueba ---

test('campañas de prueba: TEST, VALIDACIÓN o PRUEBA, sin importar mayúsculas ni tildes', () => {
  for (const nombre of ['MARKETING TEST 1', '[VALIDACIÓN] Gerentes - Test Entregabilidad', '2da Campaña Validacion - GG', '[PRUEBA] Webhook dashboard', 'pruebas internas', 'Tests de envío'])
    assert.equal(esCampanaPrueba(nombre), true, nombre)
  for (const nombre of ['GERENTE GENERAL NOVIEMBRE', 'TESTIMONIOS DE CLIENTES', 'COMPROBACION', '001-GG-SEGURIDAD-Asunto', ''])
    assert.equal(esCampanaPrueba(nombre), false, nombre)
})

// --- Sección 3: estado final ---

const ev = (evento, fecha, motivo = null) => ({ evento, fecha_evento: fecha, motivo })

test('estado final: gana el último evento', () => {
  assert.equal(estadoFinal([ev('delivered', '2026-11-20T10:00:00Z'), ev('soft_bounce', '2026-11-20T11:00:00Z', 'mailbox full')]).estado, 'rebote_temporal')
  assert.equal(estadoFinal([ev('soft_bounce', '2026-11-20T10:00:00Z', 'x'), ev('delivered', '2026-11-20T11:00:00Z')]).estado, 'entregado')
  assert.equal(estadoFinal([ev('hard_bounce', '2026-11-20T10:00:00Z', 'user unknown')]).estado, 'rebote_permanente')
})

test('estado final: guarda el motivo del rebote final; entregado no tiene motivo', () => {
  const r = estadoFinal([ev('soft_bounce', '2026-11-20T09:00:00Z', 'primero'), ev('hard_bounce', '2026-11-20T10:00:00Z', 'final')])
  assert.equal(r.motivo, 'final')
  assert.equal(estadoFinal([ev('soft_bounce', '2026-11-20T09:00:00Z', 'x'), ev('delivered', '2026-11-20T10:00:00Z')]).motivo, null)
})

test('estado final: empate de resultados distintos → Sin confirmación; sin eventos → Sin confirmación', () => {
  const empate = estadoFinal([ev('delivered', '2026-11-20T10:00:00Z'), ev('hard_bounce', '2026-11-20T10:00:00Z', 'x')])
  assert.deepEqual([empate.estado, empate.empate, empate.sinEventos], ['sin_confirmacion', true, false])
  const vacio = estadoFinal([])
  assert.deepEqual([vacio.estado, vacio.sinEventos], ['sin_confirmacion', true])
  // aperturas y clics no cuentan para el estado final
  assert.equal(estadoFinal([ev('opened', '2026-11-20T12:00:00Z'), ev('click', '2026-11-20T12:01:00Z')]).sinEventos, true)
  // el mismo resultado repetido en la misma hora no es empate
  assert.equal(estadoFinal([ev('delivered', '2026-11-20T10:00:00Z'), ev('delivered', '2026-11-20T10:00:00Z')]).estado, 'entregado')
})

// --- Sección 4: CORREGIR / MANTENER ---

test('regla 1: Entregado o Sin confirmación → MANTENER', () => {
  assert.equal(statusCorreo({ estado: 'entregado' }).status, 'MANTENER')
  assert.equal(statusCorreo({ estado: 'sin_confirmacion', motivo: 'user unknown' }).status, 'MANTENER')
})

test('tabla de motivos 4.2: cada fila', () => {
  const casos = [
    ['Unable to find MX of domain inventado.test', 'Dominio sin registros MX', 'CORREGIR'],
    ['550 5.1.1 recipient rejected', 'Cuenta destinataria inexistente', 'CORREGIR'],
    ['User unknown in virtual table', 'Usuario desconocido', 'CORREGIR'],
    ['The account does not exist', 'Cuenta no encontrada', 'CORREGIR'],
    ['No such user here', 'Usuario inexistente', 'CORREGIR'],
    ['No mailbox by that name is currently available', 'Buzón no encontrado', 'CORREGIR'],
    ['Requested action not taken: mailbox unavailable', 'Buzón no disponible', 'CORREGIR'],
    ['Connection timeout', 'Tiempo de espera agotado', 'MANTENER'],
    ['Operation timed out', 'Tiempo de espera agotado', 'MANTENER'],
    ['452 4.2.2 The email account is over quota', 'Buzón lleno', 'MANTENER'],
    ['Out of storage space', 'Buzón lleno', 'MANTENER'],
    ['OverQuota', 'Buzón lleno', 'MANTENER'],
    ['Mailbox full', 'Buzón lleno', 'MANTENER'],
    ['SMTP Authentication required', 'Servidor exige autenticación SMTP', 'MANTENER'],
    ['Not permitted to relay', 'Retransmisión SMTP no autorizada', 'MANTENER'],
    ['Access denied', 'Acceso denegado por servidor', 'MANTENER'],
    ['Message blocked by policy', 'Bloqueado por servidor', 'MANTENER'],
    ['OXSUS001 inventado', 'Bloqueo del servidor receptor', 'MANTENER'],
    ['550 5.4.1 Recipient address rejected: Access denied', 'Acceso denegado por servidor', 'MANTENER'],
    ['550 5.4.1 rejected by routing', 'Rechazo por política o ruta', 'MANTENER'],
    ['Rejected as spam', 'Rechazo por filtro antispam', 'MANTENER'],
    ['Message delivery failed', 'Fallo de entrega reportado', 'MANTENER'],
  ]
  for (const [motivo, motivoTecnico, status] of casos) {
    for (const estado of ['rebote_temporal', 'rebote_permanente']) {
      const r = statusCorreo({ estado, motivo })
      assert.equal(r.motivoTecnico, motivoTecnico, motivo)
      assert.equal(r.status, status, `${motivo} (${estado})`)
    }
  }
})

test('regla 2 gana sobre la 3: error de dirección aunque también diga «blocked»', () => {
  assert.equal(statusCorreo({ estado: 'rebote_temporal', motivo: '550 5.1.1 user unknown; blocked' }).status, 'CORREGIR')
})

test('reglas 4 y 5: rebote sin causa reconocida', () => {
  assert.deepEqual(statusCorreo({ estado: 'rebote_permanente', motivo: 'algo raro inventado' }),
    { status: 'CORREGIR', motivoTecnico: 'Rechazo sin causa específica', categoria: 'Rebote permanente genérico' })
  assert.equal(statusCorreo({ estado: 'rebote_temporal', motivo: 'algo raro inventado' }).status, 'MANTENER')
  assert.deepEqual(statusCorreo({ estado: 'rebote_permanente', motivo: '' }),
    { status: 'CORREGIR', motivoTecnico: 'Rebote permanente sin detalle', categoria: 'Rebote permanente genérico' })
  assert.equal(statusCorreo({ estado: 'rebote_temporal', motivo: null }).status, 'MANTENER')
})

test('el motivo técnico nunca pasa de 5 palabras', () => {
  for (const motivo of ['Unable to find MX', '5.1.1', 'user unknown', 'does not exist', 'no such user', 'no mailbox by that name', 'mailbox unavailable',
    'timed out', 'mailbox full', 'smtp authentication', 'not permitted to relay', 'access denied', 'blocked', 'oxsus', '5.4.1', 'spam',
    'message delivery failed', 'otro', '']) {
    for (const estado of ['rebote_temporal', 'rebote_permanente']) {
      const { motivoTecnico } = statusCorreo({ estado, motivo })
      assert.ok(motivoTecnico.split(/\s+/).length <= 5, motivoTecnico)
    }
  }
})

// --- Sección 5: apertura y clic ---

test('apertura: fecha gana; sin fecha y con automáticas → AUTOMÁTICA; nada → NO REGISTRADA', () => {
  assert.equal(estadoApertura({ conFecha: true, automaticas: 3 }), 'APERTURA REGISTRADA')
  assert.equal(estadoApertura({ conFecha: false, automaticas: 1 }), 'APERTURA AUTOMÁTICA')
  assert.equal(estadoApertura({}), 'NO REGISTRADA')
  assert.equal(estadoClic(2), 'CLIC REGISTRADO')
  assert.equal(estadoClic(0), 'SIN CLIC REGISTRADO')
})

// --- Sección 6: indicadores y semáforo ---

test('porcentaje: un decimal y null si se divide entre 0', () => {
  assert.equal(porcentaje(157, 169), 92.9)
  assert.equal(porcentaje(0, 10), 0)
  assert.equal(porcentaje(5, 0), null)
  assert.equal(porcentaje(5, undefined), null)
})

test('totales desde globalStats (números inventados) y tasas', () => {
  const t = totalesDesdeBrevo({ sent: 200, delivered: 180, softBounces: 12, hardBounces: 3, uniqueViews: 50, appleMppOpens: 9, clickers: 4, uniqueClicks: 6 })
  assert.equal(t.sinConfirmacion, 5)
  assert.equal(t.sinConfirmacionAjustado, false)
  assert.equal(t.aperturas, 50) // incluye automáticas
  assert.equal(t.aperturasApple, 9) // aparte, no se resta
  assert.equal(t.clics, 4)
  assert.deepEqual(tasas(t), { entrega: 90, reboteTemporal: 6, rebotePermanente: 1.5, apertura: 27.8, clic: 2.2 })
  const raro = totalesDesdeBrevo({ sent: 10, delivered: 9, softBounces: 3, hardBounces: 0 })
  assert.equal(raro.sinConfirmacion, 0)
  assert.equal(raro.sinConfirmacionAjustado, true)
  assert.deepEqual(tasas(totalesDesdeBrevo({})), { entrega: null, reboteTemporal: null, rebotePermanente: null, apertura: null, clic: null })
})

test('semáforo de entrega con números exactos: bordes 100, casi 100, 90 y casi 90', () => {
  assert.equal(semaforoEntrega(100, 100), 'verde')
  assert.equal(semaforoEntrega(9996, 10000), 'amarillo') // 99,96 % se vería «100,0 %» redondeado, pero no es verde
  assert.equal(semaforoEntrega(90, 100), 'amarillo')
  assert.equal(semaforoEntrega(899, 1000), 'rojo')
  assert.equal(semaforoEntrega(0, 10), 'rojo')
  assert.equal(semaforoEntrega(5, 0), null)
})
