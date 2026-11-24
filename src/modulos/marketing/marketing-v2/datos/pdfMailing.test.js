// Pruebas del reporte PDF de Mailing (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { chipsFiltros, construirReporteMailing, MODULOS_PDF_MAILING, nombreArchivoPdf } from './pdfMailing.js'
import { FILTROS_INICIALES } from './calculos.js'

const C = { id: 74, estado: 'enviada', asunto: 'Asunto <inventado>', nombre: 'NOMBRE INVENTADO', fecha: '2026-11-05T18:00:00.000Z', cargo: 'GG',
  totales: { enviados: 100, entregados: 90, aperturas: 30, clics: 5, reboteTemporal: 6, rebotePermanente: 4, sinConfirmacion: 0, bajas: 1, quejas: 0, aperturasApple: 2 },
  tasas: { entrega: 90, apertura: 33.3, clic: 5.6, reboteTemporal: 6, rebotePermanente: 4 }, semaforo: 'amarillo' }
const FILA = { correo: 'uno@empresa.example.com', campana_id: 74, status: 'CORREGIR', motivoTecnico: 'Cuenta inexistente', estadoTexto: 'Rebote permanente',
  fechaRebote: '2026-11-05T20:00:00.000Z', clientes: [{ cliente: 'Empresa Ficticia', ejecutivo: 'Ana Ejemplo', pais: 'GT', codigo: '1' }], posibles: [] }

test('construirReporteMailing: estructura que pide la herramienta, solo los módulos elegidos y todo escapado', () => {
  const html = construirReporteMailing({ seleccion: ['generales', 'corregir'], campanas: [C], cuentas: { corregir: 1, casosCorregir: 1 }, corregir: [FILA],
    nombres: { 74: C }, chips: chipsFiltros(FILTROS_INICIALES, null), origen: 'http://localhost:3000', ahora: new Date('2026-11-23T18:00:00Z') })
  assert.match(html, /class="report-shell"/)
  assert.match(html, /<div class="header">/)
  assert.match(html, /class="module-summary"/)
  assert.match(html, /data-pdf-module="generales"/)
  assert.match(html, /data-pdf-module="corregir"/)
  assert.doesNotMatch(html, /data-pdf-module="campanas"/)
  assert.ok(html.includes('uno@empresa.example.com'), 'el módulo de correos por corregir incluye las direcciones')
  assert.ok(html.includes('Asunto &lt;inventado&gt;'))
  assert.ok(!html.includes('<inventado>'))
})

test('módulos, chips y nombre de archivo', () => {
  assert.deepEqual(MODULOS_PDF_MAILING.map((m) => m.id), ['generales', 'campanas', 'comparar', 'corregir'])
  const chips = chipsFiltros({ ...FILTROS_INICIALES, pais: 'GT', campana: '74' }, C)
  assert.equal(chips.find((c) => c.label === 'Campaña').value, 'Asunto <inventado> · #74')
  assert.equal(nombreArchivoPdf({ pais: 'SV' }, new Date('2026-11-23T18:00:00Z')), 'Mailing_SV_2026-11-23.pdf')
})
