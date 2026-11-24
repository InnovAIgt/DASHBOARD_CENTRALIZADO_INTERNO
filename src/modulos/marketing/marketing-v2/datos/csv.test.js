// Pruebas del CSV de Mailing (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { aCsv } from './csv.js'

test('aCsv: encabezados, comillas, números, vacíos y BOM', () => {
  const columnas = [
    { label: 'Campaña', valor: (f) => f.nombre },
    { label: 'Enviados', valor: (f) => f.enviados },
    { label: '% Entrega', valor: (f) => f.entrega },
  ]
  const texto = aCsv(columnas, [
    { nombre: 'PRUEBA, "uno"', enviados: 120, entrega: 95.5 },
    { nombre: 'Sin datos', enviados: null, entrega: NaN },
  ])
  assert.ok(texto.startsWith('﻿'))
  assert.deepEqual(texto.slice(1).split('\r\n'), ['Campaña,Enviados,% Entrega', '"PRUEBA, ""uno""",120,95.5', 'Sin datos,,', ''])
})

test('aCsv: un texto que empieza con = + - @ no se vuelve fórmula en Excel', () => {
  const texto = aCsv([{ label: 'Asunto', valor: (f) => f.asunto }], [{ asunto: '=SUMA(1)' }, { asunto: '-10 % hoy' }])
  assert.deepEqual(texto.slice(1).split('\r\n').slice(1, 3), ["'=SUMA(1)", "'-10 % hoy"])
})
