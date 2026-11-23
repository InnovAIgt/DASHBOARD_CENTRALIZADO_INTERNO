// Pruebas de server/mailing/historialCsv.js con un CSV INVENTADO (mismas columnas que la exportación de Brevo).
import assert from 'node:assert/strict'
import test from 'node:test'
import { huellaDe } from '../brevoWebhook.js'
import { eventosDesdeCsv, fechaCsv, leerCsv } from './historialCsv.js'

const CAB = ['Campaign ID', 'Campaign Name', 'Email_ID', 'Send_Date', 'Delivered_Date', 'Open_Date', 'Total Opens', 'Total Apple MPP Opens', 'Unsubscribe_Date',
  'Hard_Bounce_Date', 'Hard_Bounce_Reason', 'Soft_Bounce_Date', 'Soft_Bounce_Reason', 'Open_IP', 'Click_IP', 'Unsubscribe_IP', 'Clicked_Links_Count', 'Complaint_date',
  'https://www.youtube.com/watch?v=VIDEOinventado']
const fila = (o) => CAB.map((c) => o[c] ?? '').map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')
const CSV = '﻿' + [CAB.map((c) => `"${c}"`).join(';'),
  fila({ 'Campaign ID': 10, 'Email_ID': ' Persona1@Example.com ', 'Send_Date': '05-11-2026 12:21:19', 'Delivered_Date': '05-11-2026 12:21:25', 'Open_Date': '05-11-2026 13:00:00',
    'Total Opens': 3, 'Total Apple MPP Opens': 1, 'Clicked_Links_Count': 2, 'https://www.youtube.com/watch?v=VIDEOinventado': '05-11-2026 13:05:00' }),
  fila({ 'Campaign ID': 10, 'Email_ID': 'persona2@example.com', 'Send_Date': '05-11-2026 12:21:19', 'Hard_Bounce_Date': '05-11-2026 12:21:30', 'Hard_Bounce_Reason': '550 5.1.1 user unknown; "inventado"' }),
  fila({ 'Campaign ID': 10, 'Email_ID': 'persona3@example.com', 'Send_Date': '05-11-2026 12:21:19', 'Total Apple MPP Opens': 2, 'Clicked_Links_Count': 1 }),
].join('\r\n')

test('leerCsv con comillas, «;» dentro del texto y BOM', () => {
  const f = leerCsv(CSV)
  assert.equal(f.length, 4)
  assert.equal(f[0][0], 'Campaign ID')
  assert.equal(f[2][CAB.indexOf('Hard_Bounce_Reason')], '550 5.1.1 user unknown; "inventado"')
})

test('fechaCsv: hora de Guatemala → UTC', () => {
  assert.equal(fechaCsv('05-11-2026 12:21:19'), '2026-11-05T18:21:19.000Z')
  assert.equal(fechaCsv(''), null)
  assert.equal(fechaCsv('2026-11-05'), null)
})

test('eventosDesdeCsv: el clic lleva su FECHA REAL y su URL limpia (YouTube con solo el ID)', () => {
  const { filas, problemas } = eventosDesdeCsv(CSV, 10)
  assert.deepEqual(problemas, [])
  const clic = filas.find((f) => f.evento === 'click' && f.correo === 'persona1@example.com')
  assert.deepEqual([clic.fecha_evento, clic.fecha_aproximada, clic.url, clic.cantidad], ['2026-11-05T19:05:00.000Z', false, 'https://www.youtube.com/watch?v=VIDEOinventado', 2])
  assert.equal(clic.huella, huellaDe(clic), 'la huella usa la fecha real')
  assert.equal(clic.origen, 'historial')
})

test('eventosDesdeCsv: sin fecha de clic en el CSV, usa apertura o envío y la marca como aproximada', () => {
  const { filas } = eventosDesdeCsv(CSV, 10)
  const clic = filas.find((f) => f.evento === 'click' && f.correo === 'persona3@example.com')
  assert.deepEqual([clic.fecha_evento, clic.fecha_aproximada, clic.url], ['2026-11-05T18:21:19.000Z', true, null])
  const mpp = filas.find((f) => f.evento === 'apple_mpp' && f.correo === 'persona3@example.com')
  assert.deepEqual([mpp.cantidad, mpp.fecha_aproximada], [2, true])
})

test('eventosDesdeCsv: entregas, rebotes con motivo y aperturas; correo en minúsculas', () => {
  const { filas } = eventosDesdeCsv(CSV, 10)
  const tipos = filas.reduce((m, f) => ({ ...m, [f.evento]: (m[f.evento] ?? 0) + 1 }), {})
  assert.deepEqual(tipos, { delivered: 1, opened: 1, apple_mpp: 2, click: 2, hard_bounce: 1 })
  assert.equal(filas.find((f) => f.evento === 'hard_bounce').motivo, '550 5.1.1 user unknown; "inventado"')
  assert.ok(filas.every((f) => f.correo === f.correo.toLowerCase().trim()))
})

test('eventosDesdeCsv: otra campaña o columnas que faltan son problemas', () => {
  assert.match(eventosDesdeCsv(CSV, 99).problemas[0], /otra campaña/)
  assert.ok(eventosDesdeCsv('"Email_ID"\r\n"x@example.com"', 10).problemas.some((p) => /falta la columna/.test(p)))
})

test('correr dos veces da las mismas huellas (no se duplica)', () => {
  const a = eventosDesdeCsv(CSV, 10).filas.map((f) => f.huella).sort()
  const b = eventosDesdeCsv(CSV, 10).filas.map((f) => f.huella).sort()
  assert.deepEqual(a, b)
})
