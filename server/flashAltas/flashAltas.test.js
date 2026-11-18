// Pruebas de Flash de altas (docs/ventas-flash-altas/). Usan el CÓDIGO REAL de la página
// (public/dashboards/ventas/flash-altas.html): se extraen sus funciones de cálculo y se ejecutan aquí,
// con una COPIA FIJA de datos.json del 18/11/2026 sin nombres de clientes (el archivo real cambia cada noche).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(aqui, '..', '..')
const html = fs.readFileSync(path.join(raiz, 'public/dashboards/ventas/flash-altas.html'), 'utf8').replace(/\r\n/g, '\n')
const datos = JSON.parse(fs.readFileSync(path.join(aqui, 'prueba/datos-fijos-2026-11-18.json'), 'utf8'))

/** Saca del HTML la declaración `nombre` (función, o const de una línea / con llaves) contando llaves. */
function extraer(nombre) {
  const inicio = html.search(new RegExp(`^(?:async )?(?:function ${nombre}\\(|const ${nombre} = )`, 'm'))
  if (inicio < 0) throw new Error(`No se encontró ${nombre} en flash-altas.html`)
  const primera = html.indexOf('\n', inicio)
  const abre = html.indexOf('{', inicio)
  if (html.startsWith('const', inicio) && (abre < 0 || abre > primera) ) return html.slice(inicio, primera)   // const de una línea
  let nivel = 0
  for (let i = abre; i < html.length; i++) {
    if (html[i] === '{') nivel++
    else if (html[i] === '}' && --nivel === 0) { const fin = html.indexOf('\n', i); return html.slice(inicio, fin < 0 ? undefined : fin) }
  }
  throw new Error(`Llaves sin cerrar en ${nombre}`)
}

// Lo que se ejecuta: solo funciones puras de la página (sin DOM).
const piezas = ['fmt', 'num', 'leerFecha', 'normalizar', 'CAMPOS_API', 'normalizarApi', 'esBackup', 'filtrarAltas',
  'claveVenta', 'medir', 'partir', 'cifra', 'agrupar', 'ventasYEquipos', 'esRenovacion', 'anexosRad', 'radContar', 'textoEnProceso',
  'MENSAJE_SIN_ALTAS', 'obtenerAltas']
const contexto = vm.createContext({ console: { info() {}, warn() {} }, medida: 'ventas', ALTAS_BACKUP: 0 })
vm.runInContext(`let ALTAS_BACKUP_ = 0;\n${piezas.map(extraer).join('\n')}\nthis.api = { ${piezas.join(', ')} };`, contexto)
const F = contexto.api
const conMedida = (m, fn) => { vm.runInContext(`medida = '${m}'`, contexto); try { return fn() } finally { vm.runInContext("medida = 'ventas'", contexto) } }

const crudas = datos.data.map(F.normalizarApi)          // todo lo que manda SAN
const altas = F.filtrarAltas(crudas.filter(r => r.fecha)) // lo que usa la pantalla (sin BACKUP)

test('copia fija: sin nombres de clientes reales', () => {
  assert.ok(datos.data.every(r => /^Cliente \d+$/.test(r.clinam)))
  assert.equal(datos.actualizado, '2026-11-18T00:45:08.696Z')
})

test('cifras de SAN sin quitar BACKUP = lo que se reportó en la revisión (4,366 · 4,325 · 4,114 · 507)', () => {
  const m = F.medir(crudas)
  assert.deepEqual([crudas.length, m.anexos, m.uni, m.ventas], [4366, 4325, 4114, 507])
})

test('cifras de la pantalla (sin las 4 líneas BACKUP): filas, ventas, anexos y unidades, en total y por país', () => {
  const m = F.medir(altas)
  assert.deepEqual([altas.length, m.ventas, m.anexos, m.uni], [4362, 506, 4321, 4110])
  const pais = Object.fromEntries(Object.entries(F.agrupar(altas, 'pais')).map(([p, L]) => [p, { filas: L.length, ...F.medir(L) }]))
  assert.deepEqual([pais.GT.filas, pais.GT.ventas, pais.GT.anexos, pais.GT.uni], [1995, 245, 1954, 1843])
  assert.deepEqual([pais.SV.filas, pais.SV.ventas, pais.SV.anexos, pais.SV.uni], [2367, 261, 2367, 2267])
})

test('líneas con 0 equipos: cuentan en Ventas y Anexos, suman 0 unidades', () => {
  const cero = altas.filter(r => r.cantEquipo === 0)
  const porPais = Object.fromEntries(Object.entries(F.agrupar(cero, 'pais')).map(([p, L]) => [p, L.length]))
  assert.deepEqual(porPais, { GT: 152, SV: 103 })
  const m = F.medir(cero)
  assert.equal(m.uni, 0)
  assert.ok(m.anexos > 0 && m.ventas > 0)
})

test('nuevas + adiciones = total en las tres medidas', () => {
  for (const medida of ['ventas', 'anexos', 'unidades']) {
    conMedida(medida, () => {
      const p = F.partir(altas)
      assert.equal(p.n + p.a, p.t, medida)
      assert.ok(p.n > 0 && p.a > 0, medida)
    })
  }
})

test('los mismos números por ejecutivo, mes y país que en el total (gráficas, matriz, tarjetas y PDF usan medir/cifra)', () => {
  for (const medida of ['ventas', 'anexos', 'unidades']) {
    conMedida(medida, () => {
      const total = F.cifra(altas)
      for (const k of ['vendedor', 'mes', 'pais']) {
        const suma = Object.values(F.agrupar(altas, k)).reduce((s, L) => s + F.cifra(L), 0)
        assert.equal(suma, total, `${medida} por ${k}`)
      }
    })
  }
})

test('si datos.json no responde: "No se pudieron cargar las altas. Intenta más tarde." y sin datos viejos', async () => {
  const mensaje = 'No se pudieron cargar las altas. Intenta más tarde.'
  assert.equal(F.MENSAJE_SIN_ALTAS, mensaje)
  // La fuente falla (sin conexión, 404, JSON roto…) o responde sin filas: mismo mensaje, sin detalles técnicos.
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

test('En proceso: sin renovaciones (valor completo) y contando anexos (columna cantidad)', () => {
  assert.equal(F.esRenovacion('RENOVACION'), true)
  assert.equal(F.esRenovacion(' Renovación '), true)
  assert.equal(F.esRenovacion('RENOVACION Y ADICION'), false)
  assert.equal(F.esRenovacion('VENTA NUEVA'), false)
  assert.equal(F.esRenovacion(null), false)
  const R = [{ vendedor: 'A', cantidad: 3 }, { vendedor: 'A', cantidad: null }, { vendedor: 'B', cantidad: 2 }, { vendedor: 'C', cantidad: 0 }]
  assert.equal(F.anexosRad(R), 5)
  assert.deepEqual({ ...F.radContar(R, 'vendedor') }, { A: 3, B: 2 })
  assert.equal(F.textoEnProceso(1), '1 anexo en proceso')
})
