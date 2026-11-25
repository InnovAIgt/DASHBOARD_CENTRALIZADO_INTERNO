// Pruebas de los cálculos de Redes sociales (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { alcancePorSemana, dinero, filtrarRedes, FILTROS_REDES, MARCAS, mesesDe, nombreMes, porMarca, porRedFormato, resumenPublicaciones, semaforoCumplimiento, serieSemanal, totalesAnuncios } from './redes.js'
import { respuestaAnuncios, respuestaProgramadas, respuestaCuentas, respuestaPublicaciones } from './redesEjemplo.js'
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
  const e = armarEstado(respuestaCuentas, respuestaPublicaciones, respuestaProgramadas, respuestaAnuncios)
  assert.equal(e.fuente, 'ejemplo')
  assert.deepEqual(e.meses, ['2026-11', '2026-10', '2026-09'])
  assert.equal(e.cuentas.length, 6)
  for (const p of e.publicaciones) for (const k of ['id', 'cuentaId', 'marca', 'pais', 'red', 'formato', 'fecha', 'titulo', 'estado', 'alcance', 'interacciones']) assert.ok(k in p, k)
  for (const a of e.anuncios) for (const k of ['id', 'campana', 'marca', 'pais', 'moneda', 'presupuesto', 'gastado', 'alcance', 'visualizaciones', 'clics', 'mensajes']) assert.ok(k in a, k)
  assert.ok(e.anuncios.every((a) => a.moneda === 'USD'))
  assert.ok(e.publicaciones.filter((p) => p.marca === 'dr').every((p) => p.pais === 'SV'), 'DATA RED = SV')
  assert.ok(e.publicaciones.every((p) => p.estado === 'publicada'), 'Meta solo da publicadas; los otros estados salen de redesProgramadas.js')
  assert.ok(e.programadas.length > 0 && e.programadas.every((p) => p.red === 'fb'), 'programadas de la API: solo Facebook')
  assert.ok(e.plan.length > 0)
})

test('hechas y programadas por país y marca; Instagram sin programadas (null, no 0)', async () => {
  const { hechasYProgramadas } = await import('./redes.js')
  const items = [pub('1', 'gt', 'fb', '2026-11-02', 'publicada'), pub('2', 'gt', 'fb', '2026-11-30', 'programada'), pub('3', 'gt', 'ig', '2026-11-03', 'publicada'),
    pub('4', 'sv', 'fb', '2026-11-04', 'publicada'), pub('5', 'sv', 'fb', '2026-11-05', 'no_publicada'), pub('6', 'dr', 'ig', '2026-11-06', 'publicada')]
  const [gt, sv] = hechasYProgramadas(items)
  assert.deepEqual([gt.pais, gt.nombre, gt.marcas.map((m) => m.marca)], ['GT', 'Guatemala', ['gt']])
  assert.deepEqual([sv.pais, sv.nombre, sv.marcas.map((m) => m.marca)], ['SV', 'El Salvador', ['sv', 'dr']])
  assert.deepEqual(gt.marcas[0], { marca: 'gt', fbHechas: 1, fbProgramadas: 1, igHechas: 1, igProgramadas: null, hechas: 2 })
  assert.deepEqual([sv.total.fbHechas, sv.total.fbProgramadas, sv.total.igHechas, sv.total.hechas], [1, 1, 1, 2])
  assert.equal(hechasYProgramadas(items, ['dr']).length, 1, 'con filtro de marca solo sale su país')
})

test('métricas de cuenta del mes (suma de alcance diario) y reclutamiento aparte', async () => {
  const { metricasCuentas, separarReclutamiento } = await import('./redes.js')
  const cuentas = [{ metricas: { '2026-11': { alcanceDiario: 100, vistas: 10, interacciones: 1 } } }, { metricas: { '2026-11': { alcanceDiario: 50, vistas: 5, interacciones: 2 } } }, { metricas: {} }]
  assert.deepEqual(metricasCuentas(cuentas, '2026-11'), { alcanceDiario: 150, vistas: 15, interacciones: 3, cuentas: 2 })
  assert.equal(metricasCuentas(cuentas, '2026-10'), null)
  const ads = [{ id: 'a', campana: 'Promo', moneda: 'USD', gastado: 10, mensajes: 5 }, { id: 'b', campana: 'Promo', moneda: 'USD', gastado: 5, mensajes: 1 },
    { id: 'c', campana: 'Vacante RH', moneda: 'USD', gastado: 7, mensajes: 9, reclutamiento: true }]
  const { marketing, reclutamiento } = separarReclutamiento(ads)
  const t = totalesAnuncios(marketing)
  assert.deepEqual([t.campanas, t.porMoneda[0].gastado, t.mensajes], [1, 15, 6], 'una campaña en dos páginas se cuenta una vez; sin reclutamiento')
  assert.equal(reclutamiento.length, 1)
})

test('Resumen: alcance del mismo período (suma diaria hasta el día de corte) y por marca, igual que la tarjeta Alcance', async () => {
  const { alcancePorMarca, metricasCuentas } = await import('./redes.js')
  const cuentas = [
    { marca: 'gt', metricas: { '2026-10': { alcanceDiario: 100 } }, alcancePorDia: { '2026-10-01': 10, '2026-10-02': 20, '2026-10-25': 70 } },
    { marca: 'sv', metricas: { '2026-10': { alcanceDiario: 5 } }, alcancePorDia: { '2026-10-01': 5 } },
  ]
  assert.equal(metricasCuentas(cuentas, '2026-10').alcanceDiario, 105, 'mes completo')
  assert.equal(metricasCuentas(cuentas, '2026-10', 24).alcanceDiario, 35, 'días 1 a 24: sin el 25')
  assert.deepEqual(alcancePorMarca(cuentas, '2026-10', 24, ['gt', 'sv', 'dr']), { gt: 30, sv: 5, dr: 0 })
})

test('Resumen: nombre de campaña sin el año ni mayúsculas y título sin emojis en los bordes', async () => {
  const { nombreCampana, tituloLimpio } = await import('./redes.js')
  assert.equal(nombreCampana('2026 - OCT 21 - ENGAGEMENT - CARROUSEL'), 'Oct 21 - engagement - carrousel')
  assert.equal(nombreCampana('2026 NOVIEMBRE 9 - ANIMACIÓN SEGURIDAD'), 'Noviembre 9 - animación seguridad')
  assert.equal(nombreCampana('2026 - OCTUBRE 30 - BF'), 'Octubre 30 - BF', 'siglas cortas se quedan')
  assert.equal(nombreCampana('Noviembre 18'), 'Noviembre 18', 'si ya tiene minúsculas no se toca')
  assert.equal(tituloLimpio('🔥 ¡Gana pases VIP! 🎟️'), '¡Gana pases VIP!')
  assert.equal(tituloLimpio('Radios 📻 en cuotas'), 'Radios 📻 en cuotas', 'los del medio se quedan')
})

test('Pauta: menos de 5 mensajes = «pocos datos», sin semáforo y al final', async () => {
  const { pautaPorCampana } = await import('./redesVista.js')
  const p = pautaPorCampana([{ id: 'a', moneda: 'USD', gastado: 0, mensajes: 1 }, { id: 'b', moneda: 'USD', gastado: 20, mensajes: 10 }, { id: 'c', moneda: 'USD', gastado: 9, mensajes: 4 }])
  assert.deepEqual(p.map((x) => [x.id, x.pocos, x.semaforo]), [['b', false, 'amarillo'], ['a', true, null], ['c', true, null]])
})
