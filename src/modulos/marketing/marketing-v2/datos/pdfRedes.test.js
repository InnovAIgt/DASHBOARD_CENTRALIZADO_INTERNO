// Pruebas del PDF de Redes (datos de ejemplo, sin la herramienta del navegador).
import assert from 'node:assert/strict'
import test from 'node:test'
import { chipsFiltrosRedes, construirReporteRedes, nombreArchivoPdfRedes } from './pdfRedes.js'
import { FILTROS_REDES } from './redes.js'
import { armarProgramado } from './redesProgramadas.js'
import { estadoEjemplo } from './useRedesDatos.js'

const datos = estadoEjemplo()
const { items, casos } = armarProgramado(datos, datos.hoy)
const AHORA = new Date('2026-11-24T15:00:00Z')

test('PDF de Redes: estructura de la herramienta, módulos elegidos, aviso de ejemplo y filtros', () => {
  const filtros = { ...FILTROS_REDES, mes: '2026-11', marca: 'gt' }
  const html = construirReporteRedes({ seleccion: ['resumen', 'anuncios'], datos, items, caso: casos['2026-11'], filtros, origen: 'https://portal.example', ahora: AHORA })
  assert.match(html, /class="report-shell"/)
  assert.match(html, /data-pdf-module="resumen"/)
  assert.match(html, /data-pdf-module="anuncios"/)
  assert.doesNotMatch(html, /data-pdf-module="publicaciones"/)
  assert.match(html, /DATOS DE EJEMPLO/)
  assert.match(html, /Marca: RED GT/)
  assert.match(html, /Caso: <b>Plan del mes<\/b>/)
  assert.doesNotMatch(html, /RED Intelfon El Salvador<\/td>/, 'la marca filtrada deja fuera a las demás')
  assert.match(html, /US\$ /, 'el dinero lleva el símbolo de su moneda')
})

test('PDF de Redes: caso C sin semáforo; publicaciones respetan formato y estado; nombre del archivo', () => {
  const html = construirReporteRedes({ seleccion: ['resumen', 'publicaciones'], datos, items, caso: casos['2026-09'], filtros: { ...FILTROS_REDES, mes: '2026-09', formato: 'reel' }, origen: '', ahora: AHORA })
  assert.match(html, /Sin semáforo/)
  const filas = html.split('data-pdf-module="publicaciones"')[1].match(/<tr><td>/g) ?? []
  assert.ok(filas.length > 0 && !/<td>Foto<\/td>/.test(html.split('data-pdf-module="publicaciones"')[1]), 'solo reels')
  assert.deepEqual(chipsFiltrosRedes({ ...FILTROS_REDES, mes: '2026-11', estado: 'no_publicada' }).at(-1), { label: 'Estado', value: 'No se publicó' })
  assert.equal(nombreArchivoPdfRedes({ mes: '2026-11', pais: 'SV' }, AHORA), 'Redes_2026-11_SV_2026-11-24.pdf')
})
