// Pruebas de los cálculos de la pantalla de Mailing con campañas INVENTADAS.
// Correr con: node --test src/modulos/marketing/marketing-v2/datos/calculos.test.js
import assert from 'node:assert/strict'
import test from 'node:test'
import { lecturaEstimada, aplicarManual, campanasComparables, contadoresMailing, fechaHora, MINIMO_ENVIOS, pocosDatos, conteoClasificaciones, detalleWebhook, diaGuatemala, direccionesCorregir, empresasDe, filtrarPorCliente, gruposPorEjecutivo, relacionClientes, ESTADOS_DETALLE, estadoDetalle, filtrarCampanas, filtrarDetalle, FILTROS_DETALLE, opcionesDe, paginar, FILTROS_INICIALES, opcionesFiltros, ordenarPor, pct, porCargo, porCorregirCampana, sumarResumen, sumarTotales } from './calculos.js'

const tot = (enviados, entregados, extra = {}) => ({ enviados, entregados, reboteTemporal: 0, rebotePermanente: 0, sinConfirmacion: 0, aperturas: 0, aperturasApple: 0, clics: 0, ...extra })
const CAMPANAS = [
  { id: 1, nombre: 'GERENTE GENERAL INVENTADA', asunto: 'Asunto A', cargo: 'GG', esPrueba: false, estado: 'enviada', fecha: '2026-11-05T12:00:00.000-06:00', totales: tot(100, 100, { aperturas: 30, aperturasApple: 5, clics: 2 }) },
  { id: 2, nombre: 'GERENTE FINANCIERO INVENTADA', asunto: 'Asunto B', cargo: 'GF', esPrueba: false, estado: 'enviada', fecha: '2026-11-11T23:30:00.000-06:00', totales: tot(200, 170, { reboteTemporal: 20, rebotePermanente: 10, aperturas: 40, clics: 4 }) },
  { id: 3, nombre: '[PRUEBA] inventada', asunto: 'Asunto A', cargo: 'GG', esPrueba: true, estado: 'enviada', fecha: '2026-11-20T10:00:00.000-06:00', totales: tot(5, 5) },
  { id: 4, nombre: 'NOMBRE LIBRE', asunto: 'Asunto C', cargo: 'Sin clasificar', esPrueba: false, estado: 'programada', fecha: '2026-12-01T09:00:00.000-06:00', totales: tot(0, 0) },
]

test('diaGuatemala: usa la hora de Guatemala', () => {
  assert.equal(diaGuatemala('2026-11-12T05:30:00.000Z'), '2026-11-11') // 23:30 del 11 en Guatemala
  assert.equal(diaGuatemala(null), null)
})

test('filtrar: las de prueba se ocultan por defecto y se ven con la opción', () => {
  assert.deepEqual(filtrarCampanas(CAMPANAS).map((c) => c.id), [1, 2, 4])
  assert.deepEqual(filtrarCampanas(CAMPANAS, { ...FILTROS_INICIALES, mostrarPrueba: true }).map((c) => c.id), [1, 2, 3, 4])
})

test('filtrar: campaña, cargo, asunto y fechas (en hora de Guatemala)', () => {
  const f = (extra) => filtrarCampanas(CAMPANAS, { ...FILTROS_INICIALES, ...extra }).map((c) => c.id)
  assert.deepEqual(f({ campana: '2' }), [2])
  assert.deepEqual(f({ cargo: 'GG' }), [1])
  assert.deepEqual(f({ cargo: 'GG', mostrarPrueba: true }), [1, 3])
  assert.deepEqual(f({ asunto: 'Asunto A', mostrarPrueba: true }), [1, 3])
  assert.deepEqual(f({ desde: '2026-11-11', hasta: '2026-11-11' }), [2])
  assert.deepEqual(f({ desde: '2026-11-06' }), [2, 4])
  assert.deepEqual(f({ hasta: '2026-11-05' }), [1])
})

test('opciones de los menús sin las de prueba (salvo que se pidan)', () => {
  assert.deepEqual(opcionesFiltros(CAMPANAS).asuntos, ['Asunto A', 'Asunto B', 'Asunto C'])
  assert.equal(opcionesFiltros(CAMPANAS).campanas.length, 3)
  assert.equal(opcionesFiltros(CAMPANAS, true).campanas.length, 4)
})

test('sumarTotales: solo enviadas; tasas y semáforo con las sumas', () => {
  const s = sumarTotales(filtrarCampanas(CAMPANAS))
  assert.equal(s.campanas, 2)
  assert.equal(s.enviados, 300)
  assert.equal(s.entregados, 270)
  assert.equal(s.aperturas, 70)
  assert.equal(s.aperturasApple, 5)
  assert.equal(s.tasas.entrega, 90)
  assert.equal(s.semaforo, 'amarillo')
  const vacio = sumarTotales([])
  assert.equal(vacio.tasas.entrega, null)
  assert.equal(vacio.semaforo, null)
})

test('porCargo: una fila por cargo con campañas enviadas', () => {
  const filas = porCargo(filtrarCampanas(CAMPANAS))
  assert.deepEqual(filas.map((f) => [f.cargo, f.campanas, f.enviados]), [['GG', 1, 100], ['GF', 1, 200]])
  assert.equal(filas[0].semaforo, 'verde')
})

test('detalle del webhook: sin datos y con datos', () => {
  assert.deepEqual(detalleWebhook(CAMPANAS, { campanas: {} }), { hayDatos: false, campanasConDetalle: 0, corregir: 0, porcentajeCorregir: null, motivos: [] })
  const resumen = { campanas: { 2: { status: { CORREGIR: 6, MANTENER: 194 }, motivosCorregir: { 'Usuario desconocido': 4, 'Dominio sin registros MX': 2 } } } }
  const d = detalleWebhook(CAMPANAS, resumen)
  assert.equal(d.campanasConDetalle, 1)
  assert.equal(d.corregir, 6)
  assert.equal(d.porcentajeCorregir, 3)
  assert.deepEqual(d.motivos, [['Usuario desconocido', 4], ['Dominio sin registros MX', 2]])
  assert.equal(porCorregirCampana(CAMPANAS[1], resumen), 3)
  assert.equal(porCorregirCampana(CAMPANAS[0], resumen), null)
})

test('sumarResumen: suma conteos del webhook solo de las campañas filtradas', () => {
  assert.equal(sumarResumen(CAMPANAS, null).hayDatos, false)
  const resumen = { campanas: {
    1: { destinatarios: 10, estados: { entregado: 8, rebote_temporal: 1, rebote_permanente: 1, sin_confirmacion: 0 }, status: { CORREGIR: 1, MANTENER: 9 }, aperturaRegistrada: 4, proxyOpen: 1, clic: 2, spam: 0, bajas: 1, motivosCorregir: { 'Usuario desconocido': 1 }, motivosMantener: { 'Buzón lleno': 1 } },
    3: { destinatarios: 5, estados: { entregado: 5, rebote_temporal: 0, rebote_permanente: 0, sin_confirmacion: 0 }, status: { CORREGIR: 0, MANTENER: 5 }, aperturaRegistrada: 5, clic: 5 },
  } }
  const s = sumarResumen(filtrarCampanas(CAMPANAS), resumen) // la 3 es de prueba: queda fuera
  assert.equal(s.hayDatos, true)
  assert.equal(s.campanasConDetalle, 1)
  assert.equal(s.destinatarios, 10)
  assert.deepEqual(s.estados, { entregado: 8, rebote_temporal: 1, rebote_permanente: 1, sin_confirmacion: 0 })
  assert.equal(s.corregir, 1)
  assert.deepEqual(s.motivosCorregir, [['Usuario desconocido', 1]])
  assert.equal(s.aperturaRegistrada, 4)
})

test('ordenarPor: números y textos, con vacíos al final', () => {
  const filas = [{ v: 2 }, { v: null }, { v: 10 }, { v: 1 }]
  assert.deepEqual(ordenarPor(filas, (f) => f.v).map((f) => f.v), [10, 2, 1, null])
  assert.deepEqual(ordenarPor(filas, (f) => f.v, 'asc').map((f) => f.v), [1, 2, 10, null])
  assert.deepEqual(ordenarPor([{ v: 'b' }, { v: 'a' }], (f) => f.v, 'asc').map((f) => f.v), ['a', 'b'])
})

const FILA = (campana_id, correo, extra = {}) => ({ campana_id, correo, estado: 'entregado', estadoTexto: 'Entregado', status: 'MANTENER', motivoTecnico: null, indicacion: 'Sin acción', apertura: 'NO REGISTRADA', clic: 'SIN CLIC REGISTRADO', origen: 'historial', baja: false, spam: false, fechaRebote: null, ...extra })
const DETALLE = [
  FILA(1, 'persona1@example.com', { apertura: 'APERTURA REGISTRADA', clic: 'CLIC REGISTRADO' }),
  FILA(1, 'persona2@example.com', { estado: 'rebote_permanente', estadoTexto: 'Rebote permanente', status: 'CORREGIR', motivoTecnico: 'Usuario desconocido', indicacion: 'Pedir', fechaRebote: '2026-11-05T18:00:00.000Z' }),
  FILA(2, 'persona2@example.com', { estado: 'rebote_temporal', estadoTexto: 'Rebote temporal', status: 'CORREGIR', motivoTecnico: 'Dominio sin registros MX', indicacion: 'Verificar', fechaRebote: '2026-11-11T18:00:00.000Z', origen: 'webhook' }),
  FILA(2, 'persona3@empresa-inventada.test', { estado: 'rebote_temporal', estadoTexto: 'Rebote temporal', motivoTecnico: 'Buzón lleno', apertura: 'APERTURA AUTOMÁTICA', baja: true }),
]

test('filtrarDetalle: campañas de arriba, estado, filtros y búsqueda', () => {
  const ids = (l) => l.map((x) => `${x.campana_id}:${x.correo.split('@')[0]}`)
  assert.deepEqual(ids(filtrarDetalle(DETALLE, FILTROS_DETALLE, { ids: new Set([2]) })), ['2:persona2', '2:persona3'])
  assert.equal(filtrarDetalle(DETALLE, { ...FILTROS_DETALLE, estado: 'rebotes' }).length, 3)
  assert.equal(filtrarDetalle(DETALLE, { ...FILTROS_DETALLE, estado: 'apertura' }).length, 2)
  assert.equal(filtrarDetalle(DETALLE, { ...FILTROS_DETALLE, estado: 'apertura_automatica' }).length, 1)
  assert.equal(filtrarDetalle(DETALLE, { ...FILTROS_DETALLE, estado: 'baja' }).length, 1)
  assert.equal(filtrarDetalle(DETALLE, { ...FILTROS_DETALLE, status: 'CORREGIR', origen: 'webhook' }).length, 1)
  assert.equal(filtrarDetalle(DETALLE, { ...FILTROS_DETALLE, texto: 'EMPRESA-INVENTADA' }).length, 1)
  assert.equal(filtrarDetalle(DETALLE, { ...FILTROS_DETALLE, texto: 'campaña uno' }, { nombres: { 1: { nombre: 'Campaña UNO inventada' } } }).length, 2)
})

test('direccionesCorregir: una fila por dirección con todas sus campañas y motivos', () => {
  const d = direccionesCorregir(DETALLE)
  assert.equal(d.length, 1)
  assert.deepEqual(d[0].campanas, [2, 1])
  assert.deepEqual(d[0].motivos.sort(), ['Dominio sin registros MX', 'Usuario desconocido'])
  assert.equal(d[0].fechaRebote, '2026-11-11T18:00:00.000Z')
  assert.deepEqual(d[0].origenes.sort(), ['historial', 'webhook'])
})

const EMP = (pais, codigo, cliente, ejecutivo, cargos = ['GG']) => ({ pais, codigo, cliente, ejecutivo, usuarioEjecutivo: '', cargos })
const CRUZADAS = [
  FILA(1, 'a@uno.test', { clientes: [EMP('GT', '100', 'Empresa Uno', 'Ejecutiva A')], posibles: [], status: 'CORREGIR', motivoTecnico: 'Usuario desconocido' }),
  FILA(1, 'b@dos.test', { clientes: [EMP('SV', '200', 'Empresa Dos', 'Ejecutivo B', ['GF']), EMP('GT', '300', 'Empresa Tres', 'Ejecutiva A')], posibles: [], status: 'CORREGIR' }),
  FILA(2, 'c@uno.test', { clientes: [], posibles: [EMP('GT', '100', 'Empresa Uno', 'Ejecutiva A')], status: 'CORREGIR' }),
  FILA(2, 'd@nada.test', { clientes: [], posibles: [], status: 'CORREGIR' }),
  FILA(2, 'e@sincruce.test', { clientes: null, posibles: null }),
]

test('empresasDe y filtrarPorCliente (País y Cliente de arriba)', () => {
  assert.equal(empresasDe(CRUZADAS[0]).tipo, 'exacta')
  assert.equal(empresasDe(CRUZADAS[2]).tipo, 'posible')
  assert.equal(empresasDe(CRUZADAS[3]).tipo, 'sin')
  const correos = (l) => l.map((f) => f.correo.split('@')[0])
  assert.deepEqual(correos(filtrarPorCliente(CRUZADAS, { pais: 'SV' })), ['b'])
  assert.deepEqual(correos(filtrarPorCliente(CRUZADAS, { pais: 'GT' })), ['a', 'b', 'c'])
  assert.deepEqual(correos(filtrarPorCliente(CRUZADAS, { cliente: 'empresa uno' })), ['a', 'c'])
  assert.deepEqual(correos(filtrarPorCliente(CRUZADAS, { cliente: 'ejecutivo b' })), ['b'])
  assert.equal(filtrarPorCliente(CRUZADAS, {}).length, 5, 'sin filtros pasan todas')
  assert.equal(filtrarDetalle(CRUZADAS, { ...FILTROS_DETALLE, texto: 'Empresa Tres' }).length, 1, 'el buscador también busca por cliente')
})

test('gruposPorEjecutivo: separa coincidencia exacta, posible y sin identificar', () => {
  const g = gruposPorEjecutivo(direccionesCorregir(CRUZADAS))
  assert.deepEqual(g.exacta.map((x) => [x.ejecutivo, x.direcciones.length]), [['Ejecutiva A', 2], ['Ejecutivo B', 1]])
  assert.deepEqual(g.posible.map((x) => [x.ejecutivo, x.direcciones.length]), [['Ejecutiva A', 1]])
  assert.deepEqual(g.sinIdentificar.map((d) => d.correo), ['d@nada.test'])
})

test('relacionClientes y conteoClasificaciones (cargo de la campaña)', () => {
  const r = relacionClientes(CRUZADAS, { 1: 'GG', 2: 'GF' })
  assert.deepEqual(r.map((f) => f.clasificacion), ['objetivo', 'varias', 'posible', 'sin', null])
  assert.deepEqual(conteoClasificaciones(r), { varias: 1, objetivo: 1, otro: 0, posible: 1, sin: 1 })
})

test('paginar y opcionesDe', () => {
  const p = paginar([1, 2, 3, 4, 5], 2, 2)
  assert.deepEqual([p.filas, p.pagina, p.paginas, p.total], [[3, 4], 2, 3, 5])
  assert.equal(paginar([], 5, 25).pagina, 1)
  assert.deepEqual(opcionesDe(DETALLE, 'motivoTecnico'), ['Buzón lleno', 'Dominio sin registros MX', 'Usuario desconocido'])
})

test('pct: un decimal o «—»; el número y el % no se separan de línea', () => {
  assert.equal(pct(null), '—')
  assert.match(pct(92.9), /^92[.,]9 %$/)
})

test('sumarTotales avisa si «Sin confirmación» no es exacto (resta negativa en alguna campaña)', () => {
  const rara = { ...CAMPANAS[0], id: 9, totales: { ...CAMPANAS[0].totales, sinConfirmacionAjustado: true } }
  assert.equal(sumarTotales(filtrarCampanas(CAMPANAS)).sinConfirmacionAjustado, false)
  assert.equal(sumarTotales([rara]).sinConfirmacionAjustado, true)
})

test('ESTADOS_DETALLE: cifras de Brevo y del webhook para cada estado', () => {
  const t = sumarTotales(filtrarCampanas(CAMPANAS))
  assert.equal(estadoDetalle('rebotes').brevo(t), 30)
  assert.equal(estadoDetalle('rebote_permanente').brevo(t), 10)
  assert.equal(estadoDetalle('no-existe').id, 'todos')
  const s = sumarResumen([], null)
  for (const e of ESTADOS_DETALLE) assert.equal(typeof e.webhook(s), 'number', e.id)
})

test('contadoresMailing: direcciones únicas a corregir, casos y filas de clientes (solo campañas filtradas)', () => {
  const filas = [
    { correo: 'uno@example.com', campana_id: 1, status: 'CORREGIR' },
    { correo: 'uno@example.com', campana_id: 2, status: 'CORREGIR' },
    { correo: 'dos@example.com', campana_id: 1, status: 'CORREGIR' },
    { correo: 'tres@example.com', campana_id: 1, status: 'MANTENER' },
    { correo: 'cuatro@example.com', campana_id: 9, status: 'CORREGIR' },
  ]
  assert.deepEqual(contadoresMailing(filas, [{ id: 1 }, { id: 2 }]), { corregir: 2, casosCorregir: 3, clientes: 4 })
  assert.deepEqual(contadoresMailing(filas, [{ id: 2 }]), { corregir: 1, casosCorregir: 1, clientes: 1 })
  assert.deepEqual(contadoresMailing(null, [{ id: 1 }]), { corregir: null, casosCorregir: null, clientes: null })
})

test('fechaHora: fecha y hora de Guatemala, o «—»', () => {
  assert.equal(fechaHora('2026-11-11T21:44:12.000Z'), '11/11/2026 · 15:44')
  assert.equal(fechaHora(null), '—')
})

test('campanasComparables: solo enviadas con 20+ envíos salvo que se incluyan las pequeñas; pocos datos', () => {
  const c = (id, enviados, entregados, estado = 'enviada') => ({ id, estado, totales: { enviados, entregados } })
  const campanas = [c(1, 120, 110), c(2, 19, 19), c(3, 5, 3), c(4, 300, 0, 'programada')]
  assert.equal(MINIMO_ENVIOS, 20)
  assert.deepEqual(campanasComparables(campanas).lista.map((x) => x.id), [1])
  assert.equal(campanasComparables(campanas).pequenas, 2)
  assert.deepEqual(campanasComparables(campanas, true).lista.map((x) => x.id), [1, 2, 3])
  assert.equal(pocosDatos(c(3, 5, 3)), true)
  assert.equal(pocosDatos(c(1, 120, 110)), false)
})

test('aplicarManual: lo guardado gana (cargo, objetivo, quién) y «volver a lo sugerido» lo quita', () => {
  const c = { id: 74, cargoSugerido: 'GG', cargoManual: null, cargo: 'GG', objetivoManual: null }
  const g = aplicarManual(c, { cargo: 'GF', objetivo: 'Mejorar la productividad', asignadoPor: 'Persona Inventada', cargoAsignadoEn: '2026-11-23T10:00:00Z', objetivoAsignadoEn: '2026-11-23T10:00:00Z' })
  assert.deepEqual([g.cargo, g.cargoManual, g.objetivoManual, g.asignadoPor], ['GF', 'GF', 'Mejorar la productividad', 'Persona Inventada'])
  const solo = aplicarManual(c, { cargo: null, objetivo: 'Otro objetivo nuevo', asignadoPor: 'X' })
  assert.equal(solo.cargo, 'GG', 'sin cargo elegido, queda el sugerido')
  const v = aplicarManual(g, null)
  assert.deepEqual([v.cargo, v.cargoManual, v.objetivoManual, v.asignadoPor], ['GG', null, null, null])
})

test('lecturaEstimada: aperturas menos Apple MPP por campaña, nunca negativa, y tasa sobre entregados', () => {
  assert.equal(lecturaEstimada({ aperturas: 45, aperturasApple: 11 }), 34)
  assert.equal(lecturaEstimada({ aperturas: 3, aperturasApple: 5 }), 0)
  const campana = (id, entregados, aperturas, aperturasApple) => ({ id, nombre: 'X', asunto: 'Y', cargo: 'GG', esPrueba: false, estado: 'enviada', fecha: '2026-11-01T09:00:00.000-06:00',
    totales: { enviados: entregados, entregados, reboteTemporal: 0, rebotePermanente: 0, sinConfirmacion: 0, aperturas, aperturasApple, clics: 0, bajas: 0, quejas: 0 } })
  const t = sumarTotales([campana(1, 100, 45, 11), campana(2, 100, 3, 5)])
  assert.equal(t.lecturaEstimada, 34, 'la campaña con más Apple que aperturas queda en 0 y no resta de la otra')
  assert.equal(t.tasaLectura, 17)
})

test('filtrarDetalle: tipo de apertura, solo reales o solo de Apple', () => {
  const filas = [
    { correo: 'a@example.com', campana_id: 1, estado: 'entregado', status: 'MANTENER', apertura: 'APERTURA REGISTRADA', aperturaApple: false },
    { correo: 'b@example.com', campana_id: 1, estado: 'entregado', status: 'MANTENER', apertura: 'APERTURA AUTOMÁTICA', aperturaApple: true },
    { correo: 'c@example.com', campana_id: 1, estado: 'entregado', status: 'MANTENER', apertura: 'APERTURA REGISTRADA', aperturaApple: true },
    { correo: 'd@example.com', campana_id: 1, estado: 'entregado', status: 'MANTENER', apertura: 'NO REGISTRADA', aperturaApple: false },
  ]
  const correos = (tipoApertura) => filtrarDetalle(filas, { ...FILTROS_DETALLE, tipoApertura }).map((x) => x.correo)
  assert.deepEqual(correos('real'), ['a@example.com', 'c@example.com'])
  assert.deepEqual(correos('apple'), ['b@example.com', 'c@example.com'])
  assert.equal(correos('').length, 4)
})
