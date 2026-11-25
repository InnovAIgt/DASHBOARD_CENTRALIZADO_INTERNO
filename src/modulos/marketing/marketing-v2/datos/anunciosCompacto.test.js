// Pruebas de las tarjetas compactas de Anuncios y de cómo se escriben los títulos (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { chipsCompactos, lecturaSegmentaciones, listaPlataformasCompacta } from './anunciosCompacto.js'
import { estaEnMayusculas, PALABRAS_TAL_CUAL, textoNormal } from './palabrasTalCual.js'
import { nombreConTexto } from './anunciosFase2.js'

const d = (v) => `US$ ${v.toFixed(2)}`

test('plataformas: WhatsApp y Otras juntas solo si las dos tienen menos de 5 mensajes', () => {
  const filas = [
    { k: 'facebook', nombre: 'Facebook', mensajes: 40, gastado: 50, pctMensajes: 87 },
    { k: 'instagram', nombre: 'Instagram', mensajes: 3, gastado: 9, pctMensajes: 6.5 },
    { k: 'whatsapp', nombre: 'WhatsApp', mensajes: 2, gastado: 4, pctMensajes: 4.3 },
    { k: 'otras', nombre: 'Otras', mensajes: 1, gastado: 1, pctMensajes: 2.2 },
  ]
  const l = listaPlataformasCompacta(filas)
  assert.deepEqual(l.map((p) => p.nombre), ['Facebook', 'Instagram', 'WhatsApp y otras'])
  assert.deepEqual([l[2].mensajes, l[2].gastado, l[2].pocos, Math.round(l[2].pctMensajes * 10) / 10], [3, 5, true, 6.5])
  assert.equal(listaPlataformasCompacta([filas[0], { ...filas[2], mensajes: 6 }, filas[3]]).length, 3, 'WhatsApp con 6: no se junta')
  assert.equal(listaPlataformasCompacta([filas[0], filas[2]]).length, 2, 'si falta Otras: no hay nada que juntar')
})

test('segmentaciones: lectura por edad o por nombre; sin públicos con 5+ no hay lectura; chips en una línea', () => {
  const s = (id, edad, costo, pocos = false) => ({ id, nombre: id, costo, pocos, publico: { edad } })
  assert.equal(lecturaSegmentaciones([s('A', '50–65+', 1.3), s('B', '25–65+', 1.9)], (x) => x.nombre, d),
    'El público de 50–65+ escribió 32 % más barato que el de 25–65+ (US$ 1.30 contra US$ 1.90 por mensaje).')
  assert.match(lecturaSegmentaciones([s('A', '25–65+', 1.5), s('B', '25–65+', 2)], (x) => x.nombre, d), /^«A» escribió 25 % más barato que «B»/)
  assert.match(lecturaSegmentaciones([s('A', '25–65+', 1.5), s('B', '18–24', 9, true)], (x) => x.nombre, d), /^Solo «A» llegó a 5\+ mensajes/)
  assert.equal(lecturaSegmentaciones([s('B', '18–24', 9, true)]), '')
  assert.deepEqual(chipsCompactos({ publico: { edad: '25–65+', sexo: 'Ambos', ubicaciones: 'Automáticas', intereses: ['Camiones', 'Logística', 'Flotas'] } }, 'RED SV'),
    ['RED SV', '25–65+', 'Ambos', 'Automáticas', 'Camiones +2'])
})

test('títulos: TODO EN MAYÚSCULAS pasa a normal y la lista de palabras se queda como está', () => {
  assert.equal(textoNormal('¡EL BLACK FRIDAY QUE TU EMPRESA ESTABA ESPERANDO!'), '¡El Black Friday que tu empresa estaba esperando!')
  assert.equal(textoNormal('CYBER MONDAY PARA RH'), 'Cyber Monday para RH')
  assert.equal(textoNormal('RADIOS PTTOC CON GPS Y 4G. ¡PEDILAS EN DATA RED POR WHATSAPP!'), 'Radios PTToC con GPS y 4G. ¡Pedilas en DATA RED por WhatsApp!')
  assert.equal(textoNormal('Aprovecha hasta 25% en RED'), 'Aprovecha hasta 25% en RED', 'si ya trae minúsculas no se toca')
  assert.equal(textoNormal('IA'), 'IA', 'muy corto: no se toca')
  assert.equal(estaEnMayusculas('OFERTA PARA EMPRESAS B2B'), true)
  assert.ok(PALABRAS_TAL_CUAL.includes('Intelfon'))
  assert.equal(nombreConTexto({ texto: 'RADIOS INTELFON PARA TU FLOTA', campana: 'X' }).titulo, 'Radios Intelfon para tu flota')
})
