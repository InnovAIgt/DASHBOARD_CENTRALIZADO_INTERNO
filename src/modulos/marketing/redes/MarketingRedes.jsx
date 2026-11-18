// Marketing · Redes sociales (docs/marketing-redes/README.md).
// Dashboard aparte dentro del área Marketing (D-C). Sin botón de subir (D-D): los datos llegan ya
// cargados desde /api/marketing/redes. Pestañas: Resumen e Informe detallado.
// Encabezado, barra de filtros, botón PDF y pestañas en la MISMA posición y con el mismo diseño que
// los demás dashboards del portal (Flujo de ventas v2 / Activaciones), D23.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { FILTROS_VACIOS, filtrarFilas, hoyISO, periodoPorDefecto, prepararDatos, totales } from './logica/calculos.js'
import { fechaCorta } from './logica/formato.js'
import { cargarRedes } from './servicios/api.js'
import { BarraFiltros, textosFiltros } from './pantalla/Filtros.jsx'
import { InformeDetallado, VISTAS_INFORME } from './pantalla/InformeDetallado.jsx'
import { cargarHerramientaPdf, construirReporte, MODULOS_PDF, nombreArchivoPdf } from './pantalla/pdf.js'
import { Resumen } from './pantalla/Resumen.jsx'
import { DetalleFilas, FichaPublicacion } from './pantalla/Ventanas.jsx'
import './marketing-redes.css'

const ID_BOTON_PDF = 'rdsBtnPdf'
const PESTANAS = [
  { clave: 'resumen', etiqueta: 'Resumen' },
  { clave: 'informe', etiqueta: 'Informe detallado' },
]

function SinDatos({ mensaje, onReintentar }) {
  return <div className="rds-sin-datos" role="status">
    <strong>No hay datos de Redes sociales disponibles</strong>
    <span>{mensaje && mensaje !== 'No hay datos de Redes sociales disponibles.' ? mensaje : 'Cuando el archivo de métricas esté disponible, el dashboard se mostrará aquí.'}</span>
    <button type="button" className="rds-boton" onClick={onReintentar}><RefreshCw size={14} aria-hidden="true" /> Reintentar</button>
  </div>
}

export function MarketingRedes({ pestanaInicial = 'resumen' }) {
  const [carga, setCarga] = useState({ cargando: true, error: null, respuesta: null })
  const [intento, setIntento] = useState(0)
  const [pestana, setPestana] = useState(pestanaInicial)
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [vistaInforme, setVistaInforme] = useState('leads')
  const [busqueda, setBusqueda] = useState('')
  const [lista, setLista] = useState(null)
  const [ficha, setFicha] = useState(null)

  useEffect(() => {
    const control = new AbortController()
    setCarga((c) => ({ ...c, cargando: true, error: null }))
    cargarRedes(control.signal)
      .then((respuesta) => setCarga({ cargando: false, error: null, respuesta }))
      .catch((error) => { if (error?.name !== 'AbortError') setCarga({ cargando: false, error: error.message, respuesta: null }) })
    return () => control.abort()
  }, [intento])

  // "Hoy" se fija al abrir el dashboard (no al leer el Excel, que está en caché en el servidor).
  const [hoy] = useState(() => hoyISO())
  const datos = useMemo(() => (carga.respuesta ? prepararDatos(carga.respuesta.filas, hoy) : null), [carga.respuesta, hoy])
  // Período por defecto (D25). Se aplica una sola vez al llegar los datos; después se respeta lo que elija el usuario.
  const periodoDefecto = useMemo(() => (datos ? periodoPorDefecto(datos.filas, hoy) : null), [datos, hoy])
  const periodoAplicado = useRef(false)
  useEffect(() => {
    if (!periodoDefecto || periodoAplicado.current) return
    periodoAplicado.current = true
    setFiltros((f) => ({ ...f, desde: periodoDefecto.desde, hasta: periodoDefecto.hasta }))
  }, [periodoDefecto])
  const filas = useMemo(() => (datos ? filtrarFilas(datos.filas, filtros) : []), [datos, filtros])
  const t = useMemo(() => (datos ? totales(filas, datos.publicaciones) : null), [filas, datos])
  const rangoFechas = useMemo(() => {
    const fechas = (datos?.filas ?? []).map((f) => f.fecha).filter(Boolean).sort()
    return { minimo: fechas[0] ?? '', maximo: fechas[fechas.length - 1] ?? '' }
  }, [datos])
  const abrirLista = useCallback((titulo, subtitulo, filasLista) => setLista({ titulo, subtitulo, filas: filasLista }), [])
  const cerrarLista = useCallback(() => setLista(null), [])
  const cerrarFicha = useCallback(() => setFicha(null), [])
  const actualizado = carga.respuesta?.actualizado ? fechaCorta(carga.respuesta.actualizado) : null
  const textos = useMemo(() => textosFiltros(filtros, t?.publicaciones ?? 0), [filtros, t])

  // ---- PDF: herramienta compartida del portal (dashboard-pdf.js), mismo patrón que el Flujo de ventas ----
  const datosPdf = useRef(null)
  datosPdf.current = { datos, filas, filtros, textos, actualizado, informe: { vista: vistaInforme, busqueda, etiquetaVista: VISTAS_INFORME.find((v) => v.clave === vistaInforme)?.etiqueta ?? '' } }
  const hayDatos = Boolean(datos)
  useEffect(() => {
    if (!hayDatos) return undefined
    let activo = true
    const antes = new Set(document.querySelectorAll('.dashboard-pdf-picker'))
    cargarHerramientaPdf().then((pdf) => {
      if (!activo || !document.getElementById(ID_BOTON_PDF)) return
      pdf.openModulePicker({
        buttonId: ID_BOTON_PDF,
        modules: MODULOS_PDF,
        getFilterChips: () => datosPdf.current.textos.chips,
        buildReport: async (seleccion) => construirReporte({ seleccion, ...datosPdf.current }),
        filename: () => nombreArchivoPdf(datosPdf.current.filtros),
      })
    }).catch((err) => console.error('PDF de Redes sociales:', err))
    return () => {
      activo = false
      // Al salir se quita la ventana de módulos que se creó para este dashboard.
      document.querySelectorAll('.dashboard-pdf-picker').forEach((el) => { if (!antes.has(el)) el.remove() })
    }
  }, [hayDatos])

  return <div className="rds">
    <div className="rds-pagina">
      <header className="rds-encabezado">
        <div>
          <div className="rds-eyebrow">Marketing · Redes sociales</div>
          <h1 className="rds-titulo">Redes sociales</h1>
          <p className="rds-subtitulo">Publicaciones hechas o programadas por marca y país, y sus resultados en leads · RED Guatemala, RED El Salvador y Datared.</p>
          {carga.cargando && !datos
            ? <p className="rds-pastilla-datos" role="status">Cargando las métricas…</p>
            : datos
              ? <div className="rds-pastilla-datos" role="status"
                title={`${carga.respuesta.origen}${actualizado ? ` · copia del ${actualizado}` : ''}${rangoFechas.maximo ? ` · última publicación: ${fechaCorta(rangoFechas.maximo)}` : ''}`}>Actualizado</div>
              : <div className="rds-pastilla-datos is-error" role="status">Sin datos de Redes sociales</div>}
        </div>
      </header>

      {!carga.cargando && !datos && <SinDatos mensaje={carga.error} onReintentar={() => setIntento((n) => n + 1)} />}

      {datos && <>
        {/* Zona fija: filtros y pestañas quedan arriba; solo se desplaza el contenido (como el Flujo de ventas). */}
        <div className="rds-fijo">
          <BarraFiltros filas={datos.filas} filtros={filtros} setFiltros={setFiltros} minimo={rangoFechas.minimo} maximo={rangoFechas.maximo} periodoDefecto={periodoDefecto}
            accion={<button type="button" className="dashboard-pdf-trigger" id={ID_BOTON_PDF} title="Descargar módulos del dashboard en PDF">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              PDF
            </button>} />
          <nav className="rds-pestanas" role="tablist" aria-label="Secciones de Redes sociales">
            {PESTANAS.map((p) => <button key={p.clave} type="button" role="tab" aria-selected={pestana === p.clave}
              className={`rds-pestana ${pestana === p.clave ? 'is-activa' : ''}`} onClick={() => setPestana(p.clave)}>{p.etiqueta}</button>)}
          </nav>
        </div>

        {pestana === 'resumen' && <Resumen datos={datos} filas={filas} filtros={filtros} setFiltros={setFiltros} abrirLista={abrirLista} />}
        {pestana === 'informe' && <InformeDetallado datos={datos} filas={filas} textoFiltros={textos.texto} actualizado={actualizado} onFila={setFicha}
          vista={vistaInforme} setVista={setVistaInforme} busqueda={busqueda} setBusqueda={setBusqueda} />}
      </>}
    </div>

    {lista && <DetalleFilas {...lista} publicaciones={datos.publicaciones} onFila={setFicha} onCerrar={cerrarLista} />}
    {ficha && <FichaPublicacion fila={ficha} filas={datos.filas} onFila={setFicha} onCerrar={cerrarFicha} />}
  </div>
}
