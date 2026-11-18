// Prueba con el Excel REAL (server/marketingRedes/datos/metricas-rrss.xlsx). Cifras acordadas en la tarea
// (PASO 2). "hoy" fijo en 17/11/2026 para que el resultado no cambie con la fecha.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { leerExcelRRSS } from './lector.js'
import { detectarAdvertencias } from './advertencias.js'
import { CARPETA_DATOS } from './fuente.js'
import {
  conteoEstados, filasInforme, leadsPorMes, metaPorMarcaMes, porMarca, porPais, porRed, prepararDatos, totales,
} from '../../src/modulos/marketing/redes/logica/calculos.js'
import { textoCsv } from '../../src/modulos/marketing/redes/pantalla/excel.js'

const HOY = '2026-11-17'
const lectura = leerExcelRRSS(fs.readFileSync(path.join(CARPETA_DATOS, 'metricas-rrss.xlsx')))
const avisos = detectarAdvertencias(lectura.filas, lectura.totalesExcel)
const datos = prepararDatos(avisos.filas, HOY)
const { filas, publicaciones } = datos
const redondo = (n) => Math.round(n * 100) / 100

test('hojas y filas: GT 81 · SV 74 · DATA RED 14 = 169 (3 filas de total ignoradas)', () => {
  assert.deepEqual(Object.fromEntries(lectura.hojas.map((h) => [h.marcaClave, h.filas])), { datared: 14, gt: 81, sv: 74 })
  assert.equal(lectura.hojas.reduce((s, h) => s + h.filasTotalIgnoradas, 0), 3)
  assert.equal(filas.length, 169)
  assert.deepEqual(lectura.advertenciasLectura, [])
})

test('total general', () => {
  const t = totales(filas, publicaciones)
  assert.deepEqual(
    [t.publicaciones, t.hechas, t.programadas, t.leads, t.calificados, t.noCalificados, t.cierres, t.unidades, t.pauta, redondo(t.costoCalificado)],
    [85, 85, 0, 548, 169, 379, 30, 187, 442.5, 2.62],
  )
})

test('por marca', () => {
  const m = Object.fromEntries(porMarca(filas, publicaciones).map((x) => [x.clave, x]))
  const ver = (x) => [x.filas, x.publicaciones, x.leads, x.calificados, x.noCalificados, x.cierres, x.unidades, x.pauta, x.costoCalificado === null ? null : redondo(x.costoCalificado)]
  assert.deepEqual(ver(m.gt), [81, 41, 168, 34, 134, 7, 44, 70, 2.06])
  assert.deepEqual(ver(m.sv), [74, 37, 379, 135, 244, 23, 143, 352.5, 2.61])
  assert.deepEqual(ver(m.datared), [14, 7, 1, 0, 1, 0, 0, 20, null])
})

test('por país (El Salvador = RED El Salvador + Datared)', () => {
  const { paises } = porPais(filas, publicaciones)
  const p = Object.fromEntries(paises.map((x) => [x.clave, x]))
  assert.deepEqual([p.GT.hechas, p.GT.programadas, p.GT.leads, p.GT.calificados, p.GT.noCalificados], [41, 0, 168, 34, 134])
  assert.deepEqual([p.SV.hechas, p.SV.programadas, p.SV.leads, p.SV.calificados, p.SV.noCalificados, p.SV.pauta], [44, 0, 380, 135, 245, 372.5])
  assert.deepEqual(p.SV.marcas, ['RED El Salvador', 'Datared'])
})

test('por red', () => {
  const r = Object.fromEntries(porRed(filas, publicaciones).map((x) => [x.red, x]))
  assert.deepEqual([r.Facebook.filas, r.Facebook.alcance, r.Facebook.leads, r.Facebook.calificados], [74, 80459, 546, 169])
  assert.deepEqual([r.Instagram.filas, r.Instagram.alcance, r.Instagram.leads], [75, 19781, 2])
  assert.equal(r['Sin red'].filas, 20)
})

test('leads, calificados y cierres por mes', () => {
  const m = leadsPorMes(filas, datos.meses)
  assert.deepEqual(m.map((x) => x.mes), ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'])
  assert.deepEqual(m.map((x) => x.leads), [21, 74, 258, 195, 0, 0])
  assert.deepEqual(m.slice(0, 4).map((x) => x.calificados), [20, 47, 49, 53])
  assert.deepEqual(m.slice(0, 4).map((x) => x.cierres), [1, 4, 11, 14])
  assert.deepEqual(m.map((x) => x.sinDatos), [false, false, false, false, true, true])
})

test('publicaciones por mes y estado de la meta (inicio = primer mes de la marca)', () => {
  const grid = Object.fromEntries(metaPorMarcaMes(filas, datos).map((m) => [m.clave, m.celdas.map((c) => `${c.n}${c.estado === 'inicio' ? ' inicio' : ''}`)]))
  assert.deepEqual(grid.gt, ['0', '0', '9 inicio', '14', '13', '5'])
  assert.deepEqual(grid.sv, ['1 inicio', '10', '8', '8', '9', '1'])
  assert.deepEqual(grid.datared, ['0', '0', '0', '7 inicio', '0', '0'])
  const gtJul = metaPorMarcaMes(filas, datos)[0].celdas[3]
  assert.equal(gtJul.estado, 'cumplio')
})

test('estados: 11 sin métricas (22 filas), 24 incompletas, 0 programadas', () => {
  const c = conteoEstados(filas, publicaciones)
  assert.deepEqual([c.sin_metricas.publicaciones, c.sin_metricas.filas, c.programada.publicaciones], [11, 22, 0])
  assert.equal(c.incompleta.publicaciones, 24)
  // D15: con una red con resultados, la publicación cuenta como Publicada; la fila conserva su estado.
  const radios = filas.filter((f) => f.marcaClave === 'sv' && f.fecha === '2026-06-24')
  assert.deepEqual(radios.map((f) => [f.red, f.estadoFila, f.estado]), [['Facebook', 'publicada', 'publicada'], ['Instagram', 'incompleta', 'publicada']])
  // Las 24 por grupo: GT 31/07 + GT ago 12 + GT sep 5 + Datared jul 6
  const grupos = {}
  for (const p of publicaciones.values()) if (p.estado === 'incompleta') grupos[`${p.marcaClave} ${p.mes}`] = (grupos[`${p.marcaClave} ${p.mes}`] ?? 0) + 1
  assert.deepEqual(grupos, { 'datared 2026-07': 6, 'gt 2026-07': 1, 'gt 2026-08': 12, 'gt 2026-09': 5 })
})

test('advertencias detectadas', () => {
  const con = (tipo) => filas.filter((f) => f.advertencias.some((a) => a.tipo === tipo)).map((f) => `${f.marcaClave} ${f.fecha} ${f.red}`)
  assert.deepEqual(con('calificados_mayor'), ['sv 2026-07-09 Facebook'])
  assert.deepEqual(con('link_fb_ig'), ['sv 2026-04-30 Facebook', 'sv 2026-04-30 Instagram'])
  assert.deepEqual(con('link_repetido').sort(), [
    'datared 2026-07-16 Instagram', 'datared 2026-07-22 Instagram',
    'gt 2026-08-01 Facebook', 'gt 2026-08-01 Instagram',
    'sv 2026-08-01 Sin red', 'sv 2026-08-01 Sin red',
  ])
  assert.equal(con('sin_red').length, 20)
  assert.equal(con('link_otra_red').length, 0)
  assert.deepEqual(avisos.generales.map((g) => g.marca).sort(), ['Datared', 'RED El Salvador', 'RED Guatemala'])
  assert.ok(avisos.generales.every((g) => g.mensaje.includes('pauta')))
})

test('la misma cifra en Resumen, Informe detallado y Excel exportado', () => {
  const resumen = totales(filas, publicaciones)
  const informe = filasInforme(filas, { vista: 'leads' })
  assert.equal(informe.length, 169)
  const tInforme = totales(informe, publicaciones)
  for (const k of ['publicaciones', 'leads', 'calificados', 'noCalificados', 'cierres', 'unidades', 'pauta']) assert.equal(tInforme[k], resumen[k], k)
  // El CSV/Excel usa las mismas columnas que la tabla: sumamos su columna Leads.
  const lineas = textoCsv({ filas: informe }).replace('﻿', '').trim().split('\r\n').map((l) => l.split(';').map((c) => c.replace(/^"|"$/g, '')))
  const col = lineas[0].indexOf('Leads')
  const colCal = lineas[0].indexOf('Calificados')
  const suma = (i) => lineas.slice(1).reduce((s, l) => s + (Number(l[i]) || 0), 0)
  assert.equal(lineas.length - 1, 169)
  assert.equal(suma(col), 548)
  assert.equal(suma(colCal), 169)
})

test('filtros estandarizados: país, marca y red (varias) y período por fecha', async () => {
  const { filtrarFilas, FILTROS_VACIOS } = await import('../../src/modulos/marketing/redes/logica/calculos.js')
  assert.equal(filtrarFilas(filas, FILTROS_VACIOS).length, 169)
  assert.equal(totales(filtrarFilas(filas, { ...FILTROS_VACIOS, pais: 'SV' }), publicaciones).leads, 380)
  assert.equal(totales(filtrarFilas(filas, { ...FILTROS_VACIOS, marca: ['gt', 'datared'] }), publicaciones).publicaciones, 48)
  assert.equal(filtrarFilas(filas, { ...FILTROS_VACIOS, red: ['Facebook', 'Instagram'] }).length, 149)
  const julio = filtrarFilas(filas, { ...FILTROS_VACIOS, desde: '2026-07-01', hasta: '2026-07-31' })
  assert.equal(totales(julio, publicaciones).leads, 195)
  // "omitir" sirve para contar las opciones del panel sin el filtro de esa misma columna
  assert.equal(filtrarFilas(filas, { ...FILTROS_VACIOS, red: ['Instagram'] }, 'red').length, 169)
})

test('el PDF usa las mismas cifras que la pantalla', async () => {
  const { seccionesReporte } = await import('../../src/modulos/marketing/redes/pantalla/pdf.js')
  const { FILTROS_VACIOS } = await import('../../src/modulos/marketing/redes/logica/calculos.js')
  const s = seccionesReporte({ datos, filas, filtros: FILTROS_VACIOS, informe: { vista: 'leads', busqueda: '', etiquetaVista: 'Más leads' } })
  assert.equal(s.totales.leads, 548)
  for (const texto of ['$442.50', '$2.62', '548', '(169 filas)', 'inicio · 9', '✓ cumplió', 'casi ningún lead']) assert.ok((s.resumen + s.informe).includes(texto), texto)
})

test('ventana de detalle "RED Guatemala · julio 2026": leads, calificados y NO calificados', () => {
  const celda = metaPorMarcaMes(filas, datos).find((m) => m.clave === 'gt').celdas.find((c) => c.mes === '2026-07')
  const t = totales(celda.filas, publicaciones) // lo mismo que muestran las tarjetas de la ventana (DetalleFilas)
  assert.deepEqual([t.leads, t.calificados, t.noCalificados, t.cierres, t.unidades, t.pauta], [105, 21, 84, 6, 38, 50])
})

test('no calificados por fila: "–" sin calificados cargados, negativo con ⚠ (no se corrige)', () => {
  const sinCalif = filas.filter((f) => f.leads !== null && f.calificados === null)
  assert.ok(sinCalif.length > 0)
  assert.ok(sinCalif.every((f) => f.noCalificados === null))
  assert.equal(filas.find((f) => f.marcaClave === 'sv' && f.fecha === '2026-07-09' && f.red === 'Facebook').noCalificados, -6)
})

test('la columna No calificados está en el Informe (Excel/CSV) y en el PDF', async () => {
  const { seccionesReporte } = await import('../../src/modulos/marketing/redes/pantalla/pdf.js')
  const { FILTROS_VACIOS } = await import('../../src/modulos/marketing/redes/logica/calculos.js')
  const encabezado = textoCsv({ filas: [] }).replace('\ufeff', '').split(';').map((c) => c.replace(/^"|"$/g, '').trim())
  assert.ok(encabezado.indexOf('No calificados') === encabezado.indexOf('Calificados') + 1)
  const s = seccionesReporte({ datos, filas, filtros: FILTROS_VACIOS, informe: { vista: 'leads', busqueda: '', etiquetaVista: 'Más leads' } })
  assert.ok(s.informe.includes('<th class="c">No calif.</th>'))
  assert.ok(s.informe.includes('⚠ -6') || s.informe.includes('⚠ −6'))
})

test('período por defecto (a): hoy 17/11/2026, noviembre sin datos → 30/04/2026–18/09/2026 con nota', async () => {
  const { periodoPorDefecto, filtrarFilas, FILTROS_VACIOS } = await import('../../src/modulos/marketing/redes/logica/calculos.js')
  const p = periodoPorDefecto(filas, '2026-11-17')
  assert.deepEqual([p.desde, p.hasta], ['2026-04-30', '2026-09-18'])
  assert.equal(p.nota, 'Noviembre aún no tiene datos · mostrando hasta la última actualización (18/09/2026)')
  // Con el rango por defecto salen los totales completos
  const t = totales(filtrarFilas(filas, { ...FILTROS_VACIOS, desde: p.desde, hasta: p.hasta }), publicaciones)
  assert.deepEqual([t.publicaciones, t.leads, t.calificados], [85, 548, 169])
})

test('período por defecto (b): hoy 20/07/2026, julio con datos → 01/07/2026–20/07/2026 sin nota', async () => {
  const { periodoPorDefecto } = await import('../../src/modulos/marketing/redes/logica/calculos.js')
  const deJulio = prepararDatos(avisos.filas, '2026-07-20') // "hoy" simulado al abrir el dashboard
  assert.deepEqual(periodoPorDefecto(deJulio.filas, '2026-07-20'), { desde: '2026-07-01', hasta: '2026-07-20', nota: null })
})
