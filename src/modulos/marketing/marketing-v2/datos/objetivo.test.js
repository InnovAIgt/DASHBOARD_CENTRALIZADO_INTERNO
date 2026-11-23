// Pruebas del objetivo de cada campaña (textos inventados o de ejemplo).
import assert from 'node:assert/strict'
import test from 'node:test'
import { OBJETIVO_GENERAL, objetivoDeCampana, objetivoDeTexto, OPCIONES_OBJETIVO, textoDeHtml } from './objetivo.js'

test('objetivoDeTexto: en orden, sin mayúsculas ni tildes, por palabra completa con plural', () => {
  assert.equal(objetivoDeTexto('[NOMBRE], Le entregamos su acceso al dashboard'), 'Promover el dashboard de rondas', 'gana la regla 1 aunque «entrega» sea de la 6')
  assert.equal(objetivoDeTexto('¿Sabe qué ocurrió durante el turno de anoche?'), 'Control de turnos y personal')
  assert.equal(objetivoDeTexto('Controle turnos antes de que impacten su NÓMINA'), 'Control de turnos y personal', 'turno va antes que nómina')
  assert.equal(objetivoDeTexto('¿Está pagando horas que no puede comprobar?'), 'Reducir costos operativos')
  assert.equal(objetivoDeTexto('Su industria está perdiendo productividad.'), 'Mejorar la productividad')
  assert.equal(objetivoDeTexto('Producción a ciegas todavía'), 'Mejorar la productividad')
  assert.equal(objetivoDeTexto('¡La comunicación PTT revolucionando la construcción!'), 'Comunicación con radios PTT')
  assert.equal(objetivoDeTexto('Antes de ampliar zonas, revise recursos.'), 'Planificación y crecimiento')
  assert.equal(objetivoDeTexto('Test entregabilidad de la base'), 'Validar la base de contactos')
  assert.equal(objetivoDeTexto('Reduce tu tiempo muerto'), 'Mejorar la productividad')
  assert.equal(objetivoDeTexto('Paradiodifusión'), null, '«radio» solo cuenta como palabra completa')
  assert.equal(objetivoDeTexto('Mejore sus operaciones'), 'Mejorar la productividad', 'acepta el plural')
  assert.equal(objetivoDeTexto('Entregamos novedades'), null, '«entrega» no encuentra «entregamos»')
  assert.equal(objetivoDeTexto(''), null)
})

test('objetivoDeCampana: manual gana; luego asunto, nombre, contenido y, si nada, general para revisar', () => {
  assert.deepEqual(objetivoDeCampana({ asunto: 'Reduce tu tiempo muerto', objetivoManual: 'Promover el dashboard de rondas' }).estado, 'confirmado')
  assert.equal(objetivoDeCampana({ asunto: 'Hola', nombre: 'LOGISTICA Y TRANSPORTE JUNIO' }).fuente, 'nombre')
  const c = objetivoDeCampana({ asunto: 'Hola', nombre: 'CAMPAÑA 1', objetivoContenido: 'Comunicación con radios PTT' })
  assert.deepEqual([c.objetivo, c.fuente, c.estado], ['Comunicación con radios PTT', 'contenido', 'sugerido'])
  const g = objetivoDeCampana({ asunto: 'Hola', nombre: 'CAMPAÑA 1' })
  assert.deepEqual([g.objetivo, g.estado], [OBJETIVO_GENERAL, 'revisar'])
  assert.equal(OPCIONES_OBJETIVO.length, 9)
})

test('textoDeHtml: solo el texto visible', () => {
  assert.equal(textoDeHtml('<style>p{x}</style><p>Hola&nbsp;<b>flota</b></p>'), 'Hola flota')
})

test('nombre: «con costo» / «sin costo» se ignoran (precio de la oferta), y se pasa al contenido o a Revisar', async () => {
  const { nombreSinPrecio } = await import('./objetivo.js')
  assert.equal(nombreSinPrecio('GERENTE GENERAL CON COSTO; SIN APERTURA').includes('costo'), false)
  const sinNada = objetivoDeCampana({ asunto: 'Apreciable cliente, información importante.', nombre: 'GERENTE DE FINANZAS CON COSTO' })
  assert.deepEqual([sinNada.objetivo, sinNada.estado, sinNada.fuente], [OBJETIVO_GENERAL, 'revisar', 'general'])
  const conContenido = objetivoDeCampana({ asunto: 'Apreciable cliente', nombre: 'GERENTE GENERAL SIN COSTO', objetivoContenido: 'Control de turnos y personal' })
  assert.deepEqual([conContenido.objetivo, conContenido.fuente], ['Control de turnos y personal', 'contenido'])
  assert.equal(objetivoDeCampana({ asunto: 'Hola', nombre: 'GERENTE GENERAL SIN COSTO DASHBOARD' }).objetivo, 'Promover el dashboard de rondas', 'el resto del nombre sigue contando')
  assert.equal(objetivoDeCampana({ asunto: 'Reduzca el costo de sus rondas', nombre: 'X' }).fuente, 'asunto', 'en el asunto «costo» sigue contando')
  assert.equal(objetivoDeCampana({ asunto: 'Hola', nombre: 'COSTOS DE OPERACION' }).objetivo, 'Reducir costos operativos', 'solo se quitan «con costo» y «sin costo»')
})
