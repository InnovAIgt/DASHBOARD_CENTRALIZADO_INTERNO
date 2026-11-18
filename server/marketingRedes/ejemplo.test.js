// Pruebas con el Excel PEQUEÑO DE EJEMPLO (datos inventados, mismos casos raros que el real).
import assert from 'node:assert/strict'
import test from 'node:test'
import { crearLibroEjemplo } from './ejemplo/crearEjemplo.js'
import { leerExcelRRSS, leerFecha, normalizarRed } from './lector.js'
import { detectarAdvertencias } from './advertencias.js'
import { conteoEstados, prepararDatos, totales } from '../../src/modulos/marketing/redes/logica/calculos.js'

const lectura = leerExcelRRSS(crearLibroEjemplo())
const conAvisos = detectarAdvertencias(lectura.filas, lectura.totalesExcel)
const datos = prepararDatos(conAvisos.filas, '2026-11-17')
const fila = (id) => datos.filas.find((f) => f.id === id)
const tipos = (id) => fila(id).advertencias.map((a) => a.tipo)

test('hojas buscadas por nombre normalizado; la desconocida se avisa', () => {
  assert.deepEqual(lectura.hojas.map((h) => [h.marca, h.pais, h.filas, h.filasTotalIgnoradas]), [
    ['RED Guatemala', 'GT', 7, 1], ['RED El Salvador', 'SV', 4, 1], ['Datared', 'SV', 2, 1],
  ])
  assert.ok(lectura.advertenciasLectura.some((a) => a.mensaje.includes('Hoja "Notas" no reconocida')))
})

test('fila de total ignorada pero guardada para comparar', () => {
  assert.equal(lectura.filas.length, 13)
  assert.equal(lectura.totalesExcel.gt.pauta, 0)
  assert.equal(lectura.totalesExcel.gt.leads, 19)
})

test('números, redes, fechas y links limpios', () => {
  assert.equal(fila('gt-2').alcance, 5800)
  assert.equal(fila('gt-2').pauta, 30)
  assert.equal(fila('gt-3').red, 'Instagram')
  assert.equal(fila('gt-4').fecha, '2026-07-15') // fecha escrita como texto dd/mm/aaaa
  assert.equal(fila('gt-4').alcance, 12400)
  assert.equal(fila('gt-4').leads, 6) // "6\n"
  assert.equal(fila('gt-4').link, 'https://www.facebook.com/permalink.php?story_fbid=ejemplo2&id=100') // l.facebook.com
  assert.equal(fila('gt-5').pauta, null) // "-"
  assert.equal(fila('sv-4').red, 'Sin red')
  assert.equal(fila('sv-4').pauta, null) // "—"
  assert.equal(fila('gt-6').clics, null) // "abc"
  assert.ok(lectura.advertenciasLectura.some((a) => a.mensaje.includes('"abc" en Clics')))
  assert.deepEqual(leerFecha('31/02/2026'), { fecha: null, ok: false })
  assert.deepEqual(normalizarRed('  FACEBOOK '), { red: 'Facebook', conocida: true })
})

test('publicación: con id → marca + id; sin id → marca + fecha + campaña normalizada', () => {
  assert.equal(fila('gt-2').publicacionId, fila('gt-3').publicacionId)
  assert.equal(fila('gt-4').publicacionId, 'gt|2026-07-15|seguridad industrial') // "Seguridad  Industrial" = "seguridad industrial"
  assert.equal(fila('gt-4').publicacionId, fila('gt-5').publicacionId)
  assert.equal(datos.publicaciones.size, 10)
})

test('estados D-F', () => {
  assert.equal(fila('gt-6').estado, 'incompleta')
  assert.equal(fila('gt-7').estado, 'sin_metricas')
  assert.equal(fila('gt-8').estado, 'programada')
  assert.equal(fila('gt-2').estado, 'publicada')
  const conteo = conteoEstados(datos.filas, datos.publicaciones)
  assert.deepEqual([conteo.publicada.publicaciones, conteo.incompleta.publicaciones, conteo.sin_metricas.publicaciones, conteo.programada.publicaciones], [6, 1, 2, 1])
  const t = totales(datos.filas, datos.publicaciones)
  assert.equal(t.hechas, 9)
  assert.equal(t.programadas, 1)
})

test('advertencias de datos', () => {
  assert.ok(tipos('sv-2').includes('calificados_mayor'))
  assert.equal(fila('sv-2').noCalificados, -6) // se muestra, no se corrige
  assert.ok(tipos('sv-2').includes('link_fb_ig') && tipos('sv-3').includes('link_fb_ig'))
  assert.ok(!tipos('sv-3').includes('link_otra_red')) // ya avisado como "mismo link en FB e IG"
  assert.ok(tipos('datared-2').includes('link_repetido') && tipos('datared-3').includes('link_repetido'))
  assert.ok(tipos('gt-7').includes('link_repetido') && tipos('sv-4').includes('link_repetido')) // link de otra marca
  assert.ok(tipos('sv-5').includes('link_otra_red'))
  assert.ok(tipos('sv-4').includes('sin_red'))
  assert.ok(tipos('gt-2').includes('costo_distinto')) // Excel 7.50 = 30 ÷ 4 calificados; con leads da 2.50
  assert.match(fila('gt-2').advertencias.find((a) => a.tipo === 'costo_distinto').mensaje, /calculado con los calificados/)
  assert.deepEqual(conAvisos.generales.map((g) => g.marca).sort(), ['Datared', 'RED Guatemala'])
})

test('costos recalculados: divisor 0 → null (nunca Infinity ni NaN)', () => {
  assert.equal(fila('sv-2').costoLead, null)
  assert.equal(fila('gt-2').costoLead, 2.5)
  for (const f of datos.filas) for (const k of ['costoLead', 'costoCalificado', 'costoCliente']) assert.ok(f[k] === null || Number.isFinite(f[k]), `${f.id} ${k}`)
})
