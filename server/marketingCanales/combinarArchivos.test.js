import assert from 'node:assert/strict'
import test from 'node:test'
import { combinarArchivosBrevo } from './combinarArchivos.js'

const CABECERAS = [
  'Campaign ID', 'Campaign Name', 'Email_ID', 'Send_Date', 'Delivered_Date',
  'Open_Date', 'Total Opens', 'Total Apple MPP Opens', 'Unsubscribe_Date',
  'Hard_Bounce_Date', 'Soft_Bounce_Date', 'Clicked_Links_Count', 'Complaint_date',
]

function csv(campana, eventos) {
  const filas = eventos.map((evento, i) => [
    campana, 'Campaña inventada', `persona${i}@example.test`,
    '01-11-2026 09:00:00', evento.entrega ?? '', evento.apertura ?? '', '0', '0',
    evento.baja ?? '', evento.reboteDuro ?? '', evento.reboteSuave ?? '', '0',
    evento.queja ?? '',
  ])
  return [CABECERAS, ...filas].map((fila) => fila.join(';')).join('\n')
}

function archivo(nombre, modificado, eventos, campana = '74') {
  return { nombre, fechaModificacion: Date.parse(modificado), contenido: csv(campana, eventos) }
}

function repetido(entradas) {
  return combinarArchivosBrevo(entradas).archivos.repetidos[0]
}

test('A: gana el último evento aunque el archivo ganador tenga menos filas y una fecha de Drive anterior', () => {
  const resultado = repetido([
    archivo('viejo.csv', '2026-11-20T00:00:00Z', [
      { entrega: '05-11-2026 09:00:00' },
      { entrega: '05-11-2026 09:00:00' },
    ]),
    archivo('actual.csv', '2026-11-10T00:00:00Z', [
      { apertura: '12-11-2026 10:00:00' },
    ]),
  ])

  assert.equal(resultado.usado.archivo, 'actual.csv')
  assert.equal(resultado.ignorados[0].archivo, 'viejo.csv')
  assert.equal(resultado.ignorados[0].criterio, 'último evento más reciente')
})

test('B: empatado el último evento, gana el archivo con más filas', () => {
  const resultado = repetido([
    archivo('pocas.csv', '2026-11-20T00:00:00Z', [
      { apertura: '12-11-2026 10:00:00' },
    ]),
    archivo('mas-filas.csv', '2026-11-10T00:00:00Z', [
      { apertura: '12-11-2026 10:00:00' },
      { apertura: '12-11-2026 10:00:00' },
    ]),
  ])

  assert.equal(resultado.usado.archivo, 'mas-filas.csv')
  assert.equal(resultado.ignorados[0].criterio, 'mismo último evento, más filas')
})

test('C: empatados evento y filas, gana la fecha de modificación más reciente', () => {
  const resultado = repetido([
    archivo('viejo-drive.csv', '2026-11-10T00:00:00Z', [{ apertura: '12-11-2026 10:00:00' }]),
    archivo('nuevo-drive.csv', '2026-11-20T00:00:00Z', [{ apertura: '12-11-2026 10:00:00' }]),
  ])

  assert.equal(resultado.usado.archivo, 'nuevo-drive.csv')
  assert.equal(resultado.ignorados[0].criterio, 'datos iguales, fecha de modificación más reciente')
})

test('D: empatados evento, filas y fecha, gana el último nombre', () => {
  const resultado = repetido([
    archivo('a.csv', '2026-11-20T00:00:00Z', [{ apertura: '12-11-2026 10:00:00' }]),
    archivo('z.csv', '2026-11-20T00:00:00Z', [{ apertura: '12-11-2026 10:00:00' }]),
  ])

  assert.equal(resultado.usado.archivo, 'z.csv')
  assert.equal(resultado.ignorados[0].criterio, 'datos y fechas iguales, último por nombre')
})

test('E: una campaña sin copias conserva las filas y no genera repetidos; el ganador no depende del orden', () => {
  const unica = archivo('unica.csv', '2026-11-20T00:00:00Z', [{ entrega: '05-11-2026 09:00:00' }], '75')
  const a = archivo('a.csv', '2026-11-10T00:00:00Z', [{ apertura: '12-11-2026 10:00:00' }])
  const z = archivo('z.csv', '2026-11-20T00:00:00Z', [{ apertura: '12-11-2026 10:00:00' }])
  const primero = combinarArchivosBrevo([unica, a, z])
  const invertido = combinarArchivosBrevo([z, a, unica])

  assert.equal(primero.archivos.repetidos.length, 1)
  assert.equal(primero.archivos.repetidos[0].usado.archivo, 'z.csv')
  assert.deepEqual(primero.filas, invertido.filas)
  assert.equal(primero.filas.length, 2)
})
