// Pruebas de la ventana de una segmentación (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { segmentosDe } from './anunciosFase2.js'
import { comparacionSegmento, edadesSegmento, formatoAnuncio, lecturaSegmento, momentosSegmento, recomendacionesSegmento, resultadosSegmento, textoFechas } from './segmentoDetalle.js'

const d = (v) => `US$ ${Number(v).toFixed(2)}`
const [A, B, C] = segmentosDe([
  { id: 'a', campana: 'Octubre 30 - BF', nombre: 'Público A', gastado: 86, mensajes: 66, publico: { edad: '50–65+' },
    resultados: { alcance: 18000, frecuencia: 1.9, impresiones: 34000, clics: 600 },
    porEdadSexo: [{ edad: '55-64', sexo: 'hombres', mensajes: 20, gastado: 20 }, { edad: '55-64', sexo: 'mujeres', mensajes: 3, gastado: 5 }, { edad: '65+', sexo: 'hombres', mensajes: 15, gastado: 22 }, { edad: 'Unknown', sexo: 'sin dato', mensajes: 2, gastado: 1 }],
    porFranja: [{ franja: 6, mensajes: 20, gastado: 20 }, { franja: 9, mensajes: 6, gastado: 10 }, { franja: 1, mensajes: 2, gastado: 1 }],
    anuncios: [{ id: 'x', tipo: 'VIDEO', posicion: 'instagram_reels', gastado: 47, mensajes: 41, publicacion: '1_2' }, { id: 'y', tipo: 'PHOTO', posicion: 'feed', gastado: 39, mensajes: 25 }] },
  { id: 'b', campana: 'Noviembre 18', nombre: 'Noviembre 18', gastado: 44, mensajes: 24, publico: {} },
  { id: 'c', campana: 'Prueba', nombre: 'Prueba', gastado: 9, mensajes: 2, publico: {} },
], 'USD')

test('resultados: parte de la pauta y del mes, costo vs promedio, CTR, CPC y leads estimados sin repetir', () => {
  const leads = { 'fb-1_2': [{ codigo: 'L1' }, { codigo: 'L2' }] }
  const r = resultadosSegmento(A, [A, B, C], (id) => leads[id] ?? [])
  assert.equal(Math.round(r.pctInversion), 62)
  assert.equal(Math.round(r.pctMensajes), 72)
  assert.ok(r.difCosto < 0, 'más barato que el promedio')
  assert.deepEqual([r.alcance, r.frecuencia, Math.round(r.ctr * 100) / 100, r.leads.length, r.costoLead], [18000, 1.9, 1.76, 2, 43])
})

test('lectura, comparación y recomendaciones calculadas; pocos datos no recomienda', () => {
  const r = resultadosSegmento(A, [A, B, C])
  const l = lecturaSegmento(A, r, [A, B, C], d)
  assert.match(l[0].texto, /Es el público más eficiente del mes/)
  assert.match(l[1].texto, /Frecuencia \*\*1.9\*\*/)
  assert.match(l[2].texto, /\*\*Hombres de 55–64\*\* trajeron más mensajes y a menor costo/)
  const comp = comparacionSegmento(A, [A, B, C], r.promedio, 1.5, (s) => s.campana)
  assert.deepEqual(comp.map((x) => x.nombre), ['Este público', 'Noviembre 18', 'Promedio del mes', 'Meta (por confirmar)'], 'sin el de pocos datos')
  const reco = recomendacionesSegmento(A, r)
  assert.ok(reco.some((x) => x.includes('**55–64**')), 'mejor edad')
  assert.ok(reco.some((x) => x.includes('video · reels')), 'mejor formato')
  assert.ok(reco.some((x) => x.includes('tarde')), 'mejor momento')
  assert.ok(reco.at(-1).startsWith('Vigilar la frecuencia'))
  assert.deepEqual(recomendacionesSegmento(C, resultadosSegmento(C, [A, B, C])), [], 'con pocos datos no se muestra')
  assert.match(lecturaSegmento(C, resultadosSegmento(C, [A, B, C]), [A, B, C], d)[0].texto, /Pocos datos/)
})

test('desgloses, formato y fechas', () => {
  const e = edadesSegmento(A)
  assert.deepEqual(e.filas.map((x) => [x.edad, x.mensajes, x.pocos]), [['55–64', 23, false], ['65+', 15, false], ['Sin dato', 2, true]])
  assert.deepEqual(momentosSegmento(A).map((m) => [m.nombre, m.mensajes, m.pocos]), [['Tarde', 20, false], ['Noche', 6, false], ['Madrugada', 2, true]])
  assert.equal(formatoAnuncio({ tipo: 'VIDEO', posicion: 'instagram_reels' }), 'Video · Reels')
  assert.equal(textoFechas('2026-10-30T10:00:00-0600', null, '2026-11-24'), '30 oct – 24 nov · 26 días')
  const alto = resultadosSegmento({ ...A, resultados: { ...A.resultados, frecuencia: 3.4 } }, [A, B, C])
  assert.equal(lecturaSegmento(A, alto, [A, B, C], d)[1].alerta, true)
})
