// Pruebas del aviso a ejecutivos (datos inventados: example.com, empresas y ejecutivos falsos).
import assert from 'node:assert/strict'
import test from 'node:test'
import { csvGrupo, ENLACE_CORREGIR, emlCorreo, enlaceMailto, esc, gruposEjecutivos, htmlCorreo, iniciales, textoCorreo } from './correoEjecutivo.js'

const empresa = (cliente, ejecutivo, correoEjecutivo = '') => ({ pais: 'GT', codigo: '100', cliente, ejecutivo, correoEjecutivo, cargos: ['GG'] })
const FILAS = [
  { correo: 'uno@empresa-a.example.com', campana_id: 74, motivoTecnico: 'Cuenta inexistente', estadoTexto: 'Rebote permanente', clientes: [empresa('Empresa A', 'Ana Ejemplo', 'ana@red.example.com')], posibles: [] },
  { correo: 'uno@empresa-a.example.com', campana_id: 75, motivoTecnico: 'Cuenta inexistente', estadoTexto: 'Rebote permanente', clientes: [empresa('Empresa A', 'Ana Ejemplo', 'ana@red.example.com')], posibles: [] },
  { correo: 'dos@empresa-b.example.com', campana_id: 74, motivoTecnico: 'Dominio sin servidor de correo (MX)', estadoTexto: 'Rebote permanente', clientes: [], posibles: [empresa('Empresa B', 'Bruno Ficticio')] },
  { correo: 'tres@sinbase.example.com', campana_id: 76, motivoTecnico: null, estadoTexto: 'Rebote temporal', clientes: [], posibles: [] },
]

test('gruposEjecutivos: exacta, posible y sin identificar; direcciones únicas y correo del ejecutivo de la base', () => {
  const g = gruposEjecutivos(FILAS)
  assert.equal(g.exacta.length, 1)
  assert.equal(g.exacta[0].ejecutivo, 'Ana Ejemplo')
  assert.equal(g.exacta[0].correoEjecutivo, 'ana@red.example.com')
  assert.equal(g.exacta[0].unicos.length, 1, 'el mismo correo en 2 campañas cuenta una vez')
  assert.equal(g.exacta[0].filas.length, 2)
  assert.deepEqual(g.exacta[0].unicos[0].campanas, ['#74', '#75'])
  assert.equal(g.posible[0].ejecutivo, 'Bruno Ficticio')
  assert.equal(g.sin[0].unicos[0].motivos[0], 'Rechazo de entrega por verificar')
  assert.equal(iniciales('Ana Ejemplo'), 'AE')
  assert.equal(iniciales('Sin identificar'), '—')
})

test('textoCorreo: asunto con plazo; el grupo posible dice «confirmar antes de corregir»', () => {
  const g = gruposEjecutivos(FILAS)
  const exacta = textoCorreo(g.exacta[0])
  assert.match(exacta.asunto, /^CORREOS POR CORREGIR \| 1 caso \| Plazo máximo: 48 horas$/)
  assert.ok(exacta.cuerpo.includes(ENLACE_CORREGIR))
  const posible = textoCorreo(g.posible[0])
  assert.match(posible.asunto, /CONFIRMAR ANTES DE CORREGIR/)
  assert.match(posible.cuerpo, /Confirmar antes de corregir/)
  assert.match(htmlCorreo(g.posible[0]), /confirmar antes de corregir/)
})

test('htmlCorreo: enlace correcto, plazo y todo escapado', () => {
  const g = gruposEjecutivos([{ ...FILAS[0], correo: 'x<script>@empresa-a.example.com', clientes: [empresa('A & "B"', 'Ana <Ejemplo>')] }])
  const html = htmlCorreo(g.exacta[0])
  assert.ok(html.includes(`href="${ENLACE_CORREGIR}"`))
  assert.ok(html.includes('IR A CORREGIR →'))
  assert.ok(html.includes('Plazo: 48 horas.'))
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('Ana &lt;Ejemplo&gt;'))
  assert.equal(esc(`a&b<"'>`), 'a&amp;b&lt;&quot;&#39;&gt;')
})

test('emlCorreo: borrador sin enviar, con destinatario, asunto codificado y las dos partes', () => {
  const g = gruposEjecutivos(FILAS)
  const eml = emlCorreo(g.exacta[0], 'ana@red.example.com', 1)
  assert.ok(eml.startsWith('To: ana@red.example.com\r\n'))
  assert.ok(eml.includes('X-Unsent: 1'))
  assert.ok(eml.includes('Content-Type: text/plain; charset="utf-8"'))
  assert.ok(eml.includes('Content-Type: text/html; charset="utf-8"'))
  assert.ok(eml.trimEnd().endsWith('--RED_INTELFON_MAIL_1--'))
})

test('enlaceMailto y csvGrupo', () => {
  const g = gruposEjecutivos(FILAS)
  const m = enlaceMailto(g.exacta[0], 'ana@red.example.com')
  assert.ok(m.enlace.startsWith('mailto:ana%40red.example.com?subject='))
  assert.equal(m.corto, false)
  const csv = csvGrupo(g.exacta[0]).slice(1).split('\r\n')
  assert.equal(csv[0], 'Ejecutivo,Grupo,Correo por corregir,Cliente(s),Campaña (#),Asunto,Nombre de campaña,Incidencia(s),Estado(s)')
  assert.equal(csv[1], 'Ana Ejemplo,Coincidencia exacta,uno@empresa-a.example.com,Empresa A,#74 / #75,— / —,— / —,Cuenta inexistente,Rebote permanente')
})

test('campaña en el correo: «asunto (#id)» con el asunto real de cada campaña', () => {
  const campanas = { 74: { id: 74, asunto: 'Asunto inventado A', nombre: 'NOMBRE A' }, 75: { id: 75, asunto: 'Asunto inventado B', nombre: 'NOMBRE B' } }
  const g = gruposEjecutivos(FILAS, (id) => campanas[id] ?? null)
  assert.deepEqual(g.exacta[0].unicos[0].nombresCampana, ['Asunto inventado A (#74)', 'Asunto inventado B (#75)'])
  assert.match(htmlCorreo(g.exacta[0]), /Campaña Asunto inventado A \(#74\), Asunto inventado B \(#75\)/)
  assert.match(textoCorreo(g.exacta[0]).cuerpo, /Campaña\(s\): Asunto inventado A \(#74\), Asunto inventado B \(#75\)/)
  assert.equal(csvGrupo(g.exacta[0]).slice(1).split('\r\n')[1], 'Ana Ejemplo,Coincidencia exacta,uno@empresa-a.example.com,Empresa A,#74 / #75,Asunto inventado A / Asunto inventado B,NOMBRE A / NOMBRE B,Cuenta inexistente,Rebote permanente')
})
