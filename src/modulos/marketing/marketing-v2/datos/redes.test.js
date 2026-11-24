// Pruebas de los cálculos de Redes sociales (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { alcancePorSemana, dinero, filtrarRedes, FILTROS_REDES, MARCAS, mesesDe, nombreMes, porMarca, porRedFormato, resumenPublicaciones, semaforoCumplimiento, serieSemanal, totalesAnuncios } from './redes.js'
import { respuestaAnuncios, respuestaCuentas, respuestaPublicaciones } from './redesEjemplo.js'
import { armarEstado } from './useRedesDatos.js'

const pub = (id, marca, red, fecha, estado, alcance = 0, interacciones = 0, formato = 'foto') => ({ id, marca, pais: MARCAS[marca].pais, red, formato, fecha, estado, alcance, interacciones })
const PUBS = [
  pub(1, 'gt', 'fb', '2026-11-02', 'publicada', 1000, 50),
  pub(2, 'gt', 'ig', '2026-11-09', 'publicada', 500, 40, 'reel'),
  pub(3, 'gt', 'fb', '2026-11-15', 'no_publicada'),
  pub(4, 'sv', 'fb', '2026-11-20', 'publicada', 800, 16),
  pub(5, 'dr', 'ig', '2026-11-29', 'programada'),
  pub(6, 'dr', 'fb', '2026-10-05', 'publicada', 300, 9),
]

test('filtros: DATA RED cuenta como SV; marca, red, mes, formato y estado', () => {
  assert.deepEqual(filtrarRedes(PUBS, { ...FILTROS_REDES, pais: 'SV' }).map((p) => p.id), [4, 5, 6])
  assert.deepEqual(filtrarRedes(PUBS, { ...FILTROS_REDES, pais: 'GT', red: 'fb' }).map((p) => p.id), [1, 3])
  assert.deepEqual(filtrarRedes(PUBS, { ...FILTROS_REDES, mes: '2026-10' }).map((p) => p.id), [6])
  assert.deepEqual(filtrarRedes(PUBS, { ...FILTROS_REDES, marca: 'dr', estado: 'programada' }).map((p) => p.id), [5])
  assert.deepEqual(mesesDe(PUBS), ['2026-11', '2026-10'])
  assert.equal(nombreMes('2026-11'), 'Noviembre 2026')
})

test('cumplimiento: solo lo que ya debía salir; semáforo 100 / 90–99 / menos de 90', () => {
  const nov = filtrarRedes(PUBS, { ...FILTROS_REDES, mes: '2026-11' })
  const r = resumenPublicaciones(nov)
  assert.deepEqual([r.publicadas, r.noPublicadas, r.programadas, r.aFecha], [3, 1, 1, 4])
  assert.equal(r.cumplimiento, 75)
  assert.equal(r.semaforo, 'rojo')
  assert.equal(r.alcance, 2300)
  assert.equal(r.tasa, 4.6)
  assert.deepEqual([semaforoCumplimiento(100), semaforoCumplimiento(95), semaforoCumplimiento(89.9), semaforoCumplimiento(null)], ['verde', 'amarillo', 'rojo', null])
  assert.equal(semaforoCumplimiento((10 / 14) * 100), 'rojo', 'programaron 14 y publicaron 10 = rojo')
  const m = Object.fromEntries(porMarca(nov).map((x) => [x.marca, x]))
  assert.deepEqual([m.gt.publicadas, m.gt.aFecha, m.sv.cumplimiento, m.dr.cumplimiento], [2, 3, 100, null])
})

test('alcance por semana (Facebook e Instagram lado a lado), serie y red y formato', () => {
  const s = alcancePorSemana(PUBS, '2026-11')
  assert.equal(s.length, 5)
  assert.deepEqual(s.map((x) => [x.fb, x.ig]), [[1000, 0], [0, 500], [800, 0], [0, 0], [0, 0]])
  assert.deepEqual([s[4].desde, s[4].hasta], [29, 30])
  assert.deepEqual(serieSemanal(PUBS, '2026-11'), [1, 1, 1, 0, 0])
  assert.deepEqual(porRedFormato(PUBS).map((x) => [x.clave, x.publicaciones]), [['fb|foto', 3], ['ig|reel', 1]])
})

test('anuncios: el dinero NUNCA se suma entre monedas; lo demás sí', () => {
  const ads = [
    { campana: 'A', moneda: 'USD', presupuesto: 100, gastado: 90, alcance: 1000, visualizaciones: 2000, clics: 30, mensajes: 9 },
    { campana: 'B', moneda: 'USD', presupuesto: 50, gastado: 30, alcance: 500, visualizaciones: 800, clics: 10, mensajes: 3 },
    { campana: 'C', moneda: 'GTQ', presupuesto: 700, gastado: 650, alcance: 400, visualizaciones: 600, clics: 13, mensajes: 0 },
  ]
  const t = totalesAnuncios(ads)
  assert.deepEqual([t.alcance, t.clics, t.mensajes], [1900, 53, 12])
  assert.deepEqual(t.porMoneda.map((m) => [m.moneda, m.gastado]), [['GTQ', 650], ['USD', 120]])
  const usd = t.porMoneda.find((m) => m.moneda === 'USD')
  assert.equal(usd.cpc, 3)
  assert.equal(usd.costoMensaje, 10)
  assert.equal(t.porMoneda.find((m) => m.moneda === 'GTQ').costoMensaje, null)
  assert.equal(dinero(1234.5, 'GTQ'), 'Q 1,234.50')
  assert.equal(dinero(10, 'USD'), 'US$ 10.00')
  assert.equal(dinero(null, 'USD'), '—')
})

test('datos de ejemplo: misma forma que las rutas futuras, en US$ y marcados como ejemplo', () => {
  const e = armarEstado(respuestaCuentas, respuestaPublicaciones, respuestaAnuncios)
  assert.equal(e.fuente, 'ejemplo')
  assert.deepEqual(e.meses, ['2026-11', '2026-10'])
  assert.equal(e.cuentas.length, 6)
  for (const p of e.publicaciones) for (const k of ['id', 'cuentaId', 'marca', 'pais', 'red', 'formato', 'fecha', 'titulo', 'estado', 'alcance', 'interacciones']) assert.ok(k in p, k)
  for (const a of e.anuncios) for (const k of ['id', 'campana', 'marca', 'pais', 'moneda', 'presupuesto', 'gastado', 'alcance', 'visualizaciones', 'clics', 'mensajes']) assert.ok(k in a, k)
  assert.ok(e.anuncios.every((a) => a.moneda === 'USD'))
  assert.ok(e.publicaciones.filter((p) => p.marca === 'dr').every((p) => p.pais === 'SV'), 'DATA RED = SV')
  assert.ok(e.publicaciones.some((p) => p.estado === 'programada') && e.publicaciones.some((p) => p.estado === 'no_publicada'))
})
