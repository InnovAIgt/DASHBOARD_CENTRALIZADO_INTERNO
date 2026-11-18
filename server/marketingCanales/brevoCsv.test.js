import test from 'node:test'
import assert from 'node:assert/strict'
import { leerCsvBrevo } from './brevoCsv.js'

test('lee motivos de rebote opcionales para la ruta de detalle', () => {
  const encabezados = [
    'Campaign ID', 'Campaign Name', 'Email_ID', 'Send_Date', 'Delivered_Date', 'Open_Date',
    'Total Opens', 'Total Apple MPP Opens', 'Unsubscribe_Date', 'Hard_Bounce_Date',
    'Soft_Bounce_Date', 'Clicked_Links_Count', 'Complaint_date', 'Hard_Bounce_Reason', 'Soft_Bounce_Reason',
  ]
  const fila = Array(encabezados.length).fill('')
  fila[0] = '101'
  fila[1] = 'GERENTE GENERAL'
  fila[2] = 'sintetico@example.gt'
  fila[3] = '10-03-2026 09:00:00'
  fila[9] = '10-03-2026 10:00:00'
  fila[13] = 'User unknown'
  const csv = `${encabezados.join(';')}\n${fila.join(';')}`
  const resultado = leerCsvBrevo(csv)
  assert.equal(resultado.ok, true)
  assert.equal(resultado.filas[0].motivoReboteDuro, 'User unknown')
  assert.equal(resultado.filas[0].motivoReboteSuave, '')
})

test('los motivos siguen siendo opcionales para reportes antiguos', () => {
  const encabezados = [
    'Campaign ID', 'Campaign Name', 'Email_ID', 'Send_Date', 'Delivered_Date', 'Open_Date',
    'Total Opens', 'Total Apple MPP Opens', 'Unsubscribe_Date', 'Hard_Bounce_Date',
    'Soft_Bounce_Date', 'Clicked_Links_Count', 'Complaint_date',
  ]
  const fila = Array(encabezados.length).fill('')
  fila[0] = '101'
  fila[1] = 'GERENTE GENERAL'
  fila[2] = 'sintetico@example.gt'
  fila[3] = '10-03-2026 09:00:00'
  const resultado = leerCsvBrevo(`${encabezados.join(';')}\n${fila.join(';')}`)
  assert.equal(resultado.ok, true)
  assert.equal(resultado.filas[0].motivoReboteDuro, '')
  assert.equal(resultado.filas[0].motivoReboteSuave, '')
})
