// Pruebas del cruce Mailing ↔ Cumplimiento con datos INVENTADOS (empresas y correos ficticios). Sin conexión.
import assert from 'node:assert/strict'
import test from 'node:test'
import { buscarCorreo, cruzarFilas, dominioDe, esDominioPersonal, indexarContactos, separarCorreos } from './cruce.js'

const fila = (pais, codigo, cliente, ejecutivo, cargo, email) => ({ pais, codigo, cliente, ejecutivo, usuario_ejecutivo: ejecutivo.toLowerCase(), cargo, email })
const BASE = [
  fila('GT', '100', 'Empresa Uno Inventada', 'Ejecutiva A', 'gg', 'gerente@uno-inventada.test'),
  fila('GT', '100', 'Empresa Uno Inventada', 'Ejecutiva A', 'gf', 'finanzas@uno-inventada.test'),
  fila('SV', '200', 'Empresa Dos Inventada', 'Ejecutivo B', 'go', 'ops@dos-inventada.test; gerente@uno-inventada.test'),
  fila('SV', '300', 'Empresa Tres Inventada', 'Ejecutivo C', 'gg', 'dueno@gmail.com'),
  fila('GT', '400', 'Empresa Cuatro Inventada', 'Ejecutiva A', 'gg', 'gg@compartido.test'),
  fila('SV', '500', 'Empresa Cinco Inventada', 'Ejecutivo B', 'gf', 'gf@compartido.test'),
]
const INDICE = indexarContactos(BASE)

test('separarCorreos y dominioDe', () => {
  assert.deepEqual(separarCorreos(' A@X.test, b@y.test;c@z.test  no-es-correo '), ['a@x.test', 'b@y.test', 'c@z.test'])
  assert.equal(dominioDe('Persona@Ejemplo.TEST'), 'ejemplo.test')
})

test('dominios de correo personal', () => {
  for (const d of ['gmail.com', 'hotmail.es', 'outlook.com', 'yahoo.com.mx', 'icloud.com', 'live.com', 'msn.com', 'protonmail.com']) assert.equal(esDominioPersonal(d), true, d)
  for (const d of ['uno-inventada.test', 'empresa.com.gt', 'gmailempresa.com']) assert.equal(esDominioPersonal(d), false, d)
})

test('coincidencia exacta, sin importar mayúsculas ni espacios, con sus cargos', () => {
  const r = buscarCorreo('  FINANZAS@uno-inventada.test ', INDICE)
  assert.equal(r.clientes.length, 1)
  assert.deepEqual([r.clientes[0].cliente, r.clientes[0].pais, r.clientes[0].ejecutivo, r.clientes[0].cargos], ['Empresa Uno Inventada', 'GT', 'Ejecutiva A', ['GF']])
  assert.deepEqual(r.posibles, [])
})

test('un correo en varias empresas devuelve todas (celda con varios correos)', () => {
  const r = buscarCorreo('gerente@uno-inventada.test', INDICE)
  assert.deepEqual(r.clientes.map((c) => `${c.pais}-${c.codigo}`), ['GT-100', 'SV-200'])
})

test('posible por dominio solo si no hay exacta; varias empresas → todas posibles', () => {
  const r = buscarCorreo('otra.persona@uno-inventada.test', INDICE)
  assert.deepEqual(r.clientes, [])
  // El dominio uno-inventada.test está en la empresa 100 y también en la 200 (su celda trae ese correo): ambas posibles.
  assert.deepEqual(r.posibles.map((c) => c.codigo), ['100', '200'])
  const varias = buscarCorreo('nuevo@compartido.test', INDICE)
  assert.deepEqual(varias.posibles.map((c) => c.codigo), ['400', '500'])
  const exacta = buscarCorreo('gg@compartido.test', INDICE)
  assert.equal(exacta.clientes.length, 1)
  assert.deepEqual(exacta.posibles, [], 'con coincidencia exacta no se buscan posibles')
})

test('nunca hay posibles por dominio de correo personal', () => {
  assert.deepEqual(buscarCorreo('otra@gmail.com', INDICE), { clientes: [], posibles: [] })
  assert.equal(buscarCorreo('dueno@gmail.com', INDICE).clientes.length, 1, 'la coincidencia exacta sí vale aunque sea gmail')
})

test('sin coincidencia: listas vacías', () => {
  assert.deepEqual(buscarCorreo('nadie@desconocido.test', INDICE), { clientes: [], posibles: [] })
})

test('contacto en base solo en la coincidencia exacta, y correo del ejecutivo', () => {
  const indice = indexarContactos([
    { ...fila('GT', '900', 'Empresa Nueve Inventada', 'Ejecutiva Z', 'gf', 'gf@nueve-inventada.test'), contacto: 'Contacto Inventado', correo_ejecutivo: ' Ejecutiva.Z@RED-inventada.test ' },
  ])
  const exacta = buscarCorreo('gf@nueve-inventada.test', indice).clientes[0]
  assert.deepEqual(exacta.contactos, [{ cargo: 'GF', nombre: 'Contacto Inventado' }])
  assert.equal(exacta.correoEjecutivo, 'ejecutiva.z@red-inventada.test')
  const posible = buscarCorreo('otra@nueve-inventada.test', indice).posibles[0]
  assert.deepEqual(posible.contactos, [], 'por dominio no se muestra el nombre de otra persona')
})

test('cruzarFilas agrega clientes y posibles a cada fila', () => {
  const filas = cruzarFilas([{ correo: 'finanzas@uno-inventada.test', campana_id: 1 }, { correo: 'x@uno-inventada.test', campana_id: 1 }, { correo: 'z@nada.test', campana_id: 2 }], INDICE)
  assert.deepEqual(filas.map((f) => [f.clientes.length, f.posibles.length]), [[1, 0], [0, 2], [0, 0]])
  assert.equal(filas[0].campana_id, 1)
})
