// Pruebas de Flash de altas (docs/ventas-flash-altas/). Usan el CÓDIGO REAL de la página
// (public/dashboards/ventas/flash-altas.html): se extraen sus funciones de cálculo y se ejecutan aquí con
// DATOS INVENTADOS (ningún cliente, ejecutivo ni monto real).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(aqui, '..', '..')
const html = fs.readFileSync(path.join(raiz, 'public/dashboards/ventas/flash-altas.html'), 'utf8').replace(/\r\n/g, '\n')

/** Saca del HTML la declaración `nombre` (función, o const de una línea / con llaves) contando llaves. */
function extraer(nombre) {
  const inicio = html.search(new RegExp(`^(?:async )?(?:function ${nombre}\\(|const ${nombre} = )`, 'm'))
  if (inicio < 0) throw new Error(`No se encontró ${nombre} en flash-altas.html`)
  const primera = html.indexOf('\n', inicio)
  const abre = html.indexOf('{', inicio)
  if (html.startsWith('const', inicio) && (abre < 0 || abre > primera)) return html.slice(inicio, primera)   // const de una línea
  let nivel = 0
  for (let i = abre; i < html.length; i++) {
    if (html[i] === '{') nivel++
    else if (html[i] === '}' && --nivel === 0) { const fin = html.indexOf('\n', i); return html.slice(inicio, fin < 0 ? undefined : fin) }
  }
  throw new Error(`Llaves sin cerrar en ${nombre}`)
}

// Lo que se ejecuta: solo funciones puras de la página (sin DOM).
const piezas = ['PAIS_POR_EJECUTIVO', 'num', 'leerFecha', 'normalizarPais', 'normalizar', 'CAMPOS_API', 'normalizarApi', 'esBackup',
  'filtrarAltas', 'esRenovacion', 'b800Lleno', 'b800Marcado', 'normalizarRad', 'anexosDe', 'totalAnexos', 'radContar', 'fmt',
  'textoEnProceso', 'MENSAJE_SIN_ALTAS', 'obtenerAltas']
const contexto = vm.createContext({ console: { info() {}, warn() {} } })
vm.runInContext(`let ALTAS_BACKUP = 0;\n${piezas.map(extraer).join('\n')}\nthis.api = { ${piezas.join(', ')} };`, contexto)
const F = contexto.api

/** Fila inventada con los 16 campos que manda /api/ventas/flash-altas (los mismos de SAN). */
const fila = (o = {}) => ({ altcod: 'A1', folpai: 'GT', fecalt: '2026-11-03', vndcod: 'vend_uno', anajef: 'JEFE A', clinam: 'Empresa Inventada S.A.',
  clicod: 'CL001', folcod: '9001', tipalt: 'adicion', tngnam: 'LTE', nomeqp: 'Equipo X', tipeqp: 'COMODATO', cnteqp: '2', cntsim: '1', valnet: '1,250.50', cntmes: '18', ...o })

test('una fila de la API se traduce a lo que usa la pantalla', () => {
  const r = F.normalizarApi(fila())
  assert.equal(r.pais, 'GT')
  assert.equal(r.fecha, '2026-11-03')
  assert.equal(r.mes, '2026-11')
  assert.equal(r.vendedor, 'VEND_UNO')
  assert.equal(r.tipoAlta, 'ADICION')
  assert.deepEqual([r.cantEquipo, r.cantSim, r.valor, r.meses], [2, 1, 1250.5, 18])
  assert.equal(F.normalizarApi(fila({ fecalt: '05/11/2026', folpai: 'El Salvador' })).fecha, '2026-11-05')
  assert.equal(F.normalizarApi(fila({ folpai: 'El Salvador' })).pais, 'SV')
  assert.equal(F.normalizarApi(fila({ vndcod: 'rfuentes', folpai: 'SV' })).pais, 'GT', 'ejecutivo con país fijo')
})

test('BACKUP (valor completo) se descarta de las altas; «BACKUP COMODATO» sí cuenta', () => {
  const altas = [fila(), fila({ tipeqp: 'Back-Up' }), fila({ tipeqp: 'BACKUP COMODATO' })].map(F.normalizarApi)
  assert.equal(F.filtrarAltas(altas).length, 2)
  assert.equal(F.esBackup(' backup '), true)
  assert.equal(F.esBackup(null), false)
})

test('En proceso: sin renovaciones (valor completo, regla del correo del 16/11) y contando anexos', () => {
  assert.equal(F.esRenovacion('RENOVACION'), true)
  assert.equal(F.esRenovacion(' Renovación '), true)
  assert.equal(F.esRenovacion('RENOVACION Y ADICION'), false, 'trae equipos nuevos: sí cuenta')
  assert.equal(F.esRenovacion('VENTA NUEVA'), false)
  assert.equal(F.esRenovacion(null), false)
  // El filtro de la página usa esa regla, después de b800 y BACKUP (orden de los contadores).
  const filtro = html.slice(html.indexOf('const data = items.filter(r => {'), html.indexOf('}).map(r => normalizarRad(r, ahora));'))
  const orden = ['b800Marcado(r)', 'esBackup(r.negocio)', 'esBackup(r.tipoContratacion)', 'esRenovacion(r.negocio) || esRenovacion(r.tipoContratacion)'].map((t) => filtro.indexOf(t))
  assert.ok(orden.every((i) => i > 0), 'faltan reglas en el filtro de preofertas')
  assert.deepEqual([...orden].sort((a, b) => a - b), orden, 'orden: b800, BACKUP negocio, BACKUP tipoContratacion, RENOVACION')
  assert.ok(!/renovaci\[oó\]n/.test(filtro), 'ya no se usa la regla «contiene renovación»')
  // Anexos = columna «cantidad» (sin dato = 0).
  const R = [{ vendedor: 'A', cantidad: 3 }, { vendedor: 'A', cantidad: null }, { vendedor: 'B', cantidad: 2 }, { vendedor: 'C', cantidad: 0 }]
  assert.equal(F.totalAnexos(R), 5)
  assert.deepEqual({ ...F.radContar(R, 'vendedor') }, { A: 3, B: 2 })
  assert.equal(F.textoEnProceso(5), '5 en proceso')
})

test('b800 marcado (Activaciones ya la dio de alta): true, fecha o texto en cualquier nivel; vacío, false y 0 no', () => {
  assert.equal(F.b800Marcado({ b800: true }), true)
  assert.equal(F.b800Marcado({ proceso: { etapaActual: { b800: '2026-11-20' } } }), true)
  assert.equal(F.b800Marcado({ proceso: { etapas: [{}, { b800: 'sí' }] } }), true)
  assert.equal(F.b800Marcado({ b800: false, proceso: { etapaActual: { b800: '' }, etapas: [{ b800: 0 }, { b800: 'false' }] } }), false)
})

test('preoferta normalizada: anexos, etapa y vencida (null si no se sabe)', () => {
  const ahora = Date.parse('2026-11-25T18:00:00Z')
  const r = F.normalizarRad({ preOferta: 'P1', fecha: '2026-11-20', vendedor: 'vend_dos', pais: 'Guatemala', negocio: 'ADICION', cantidad: '4',
    proceso: { etapaActual: { numero: 2, nombre: 'Revisión', fechaInicio: '2026-11-24T18:00:00Z', slaHoras: 12 } } }, ahora)
  assert.deepEqual([r.pais, r.mes, r.cantidad, r.etapaNumero, r.horasEnEtapa, r.vencida], ['GT', '2026-11', 4, 2, 24, true])
  const sinSla = F.normalizarRad({ fecha: '2026-11-20', cantidad: '' }, ahora)
  assert.deepEqual([sinSla.cantidad, sinSla.vencida, sinSla.vendedor], [null, null, '(sin vendedor)'])
})

test('si las altas no llegan: «No se pudieron cargar las altas. Intenta más tarde.» y sin datos viejos', async () => {
  const mensaje = 'No se pudieron cargar las altas. Intenta más tarde.'
  assert.equal(F.MENSAJE_SIN_ALTAS, mensaje)
  // La fuente falla (sin conexión, 503, JSON roto…) o responde sin filas: mismo mensaje, sin detalles técnicos.
  await assert.rejects(F.obtenerAltas(async () => { throw new Error('la API respondió 503') }), { message: mensaje })
  await assert.rejects(F.obtenerAltas(async () => []), { message: mensaje })
  // Con datos, los devuelve tal cual (sin las filas sin fecha).
  const ok = await F.obtenerAltas(async () => [{ fecha: '2026-11-01' }, { fecha: '' }])
  assert.equal(ok.length, 1)
  // La copia de respaldo ya no existe y el arranque muestra solo ese mensaje.
  assert.ok(!html.includes('datos-embebidos'), 'la copia de respaldo sigue en el HTML')
  assert.ok(!html.includes('"NOMBRE CLIENTE","CODIGO CLIENTE"'), 'quedan datos embebidos con clientes')
  assert.match(html, /\$\('aviso'\)\.textContent = MENSAJE_SIN_ALTAS;/)
  assert.match(html, /const filas = await obtenerAltas\(\);/)
})

test('la página lee por el servidor del portal y sin «?_=<hora>» en las altas (caché de Vercel)', () => {
  assert.match(html, /API_URL: '\/api\/ventas\/flash-altas',/)
  assert.match(html, /const FX_URL = '\/api\/ventas\/tipo-cambio';/)
  assert.match(html, /await fetch\(CONFIG\.API_URL, \{ headers: CONFIG\.API_HEADERS, cache: 'no-store' \}\)/)
  assert.ok(!html.includes('innovaigt.github.io'), 'ya no depende de datos.json del otro repo')
  assert.ok(!html.includes('onrender.com'), 'el tipo de cambio va por el servidor')
})
