// Marketing por canales · pantalla de Mailing dentro del portal (menú MARKETING → "Marketing por canales").
// Una sola vista, sin pestañas (D31). Datos: /api/marketing/mailing (solo totales). Los filtros eligen
// campañas (?campanas=, D29) y el servidor recalcula.
// Marco estándar del portal (D35): pastilla de estado, círculo de carga, barra de filtros y PDF con la
// herramienta compartida dashboard-pdf.js (sin modificarla).
// Estilos: marketing-canales.css (prefijo mkt-). Documentación: docs/marketing-canales/README.md
import { useCallback, useEffect, useRef, useState } from 'react'
import { pedirMailing } from './servicios/api.js'
import { Encabezado, MailingSinDatos, PantallaMailing } from './pantalla/Mailing.jsx'
import { ID_BOTON_PDF } from './pantalla/Filtros.jsx'
import { FILTROS_VACIOS, parametroCampanas } from './pantalla/datos.js'
import { MODULOS_PDF, cargarHerramientaPdf, chipsFiltros, construirReporteMailing, nombreArchivoPdf } from './pantalla/pdf.js'
import './marketing-canales.css'

/** Carga de mailing: estado de la consulta, datos, error y hora de la última lectura correcta. */
function useMailing(campanas, pais, activo) {
  const [estado, setEstado] = useState({ cargando: true, datos: null, error: null, actualizadoEn: null })
  const pedido = useRef(null)
  const cargar = useCallback(async (actualizar = false) => {
    pedido.current?.abort()
    const control = new AbortController()
    pedido.current = control
    setEstado((e) => ({ ...e, cargando: true }))
    try {
      const r = await pedirMailing({ actualizar, campanas, pais, signal: control.signal })
      if (control.signal.aborted) return
      setEstado((e) => (r.ok
        ? { cargando: false, datos: r.datos, error: null, actualizadoEn: new Date() }
        : { ...e, cargando: false, error: r.mensaje }))
    } catch {
      /* pedido cancelado: lo reemplazó otro */
    }
  }, [campanas, pais])
  useEffect(() => {
    if (activo) cargar()
    return () => pedido.current?.abort()
  }, [cargar, activo])
  return { ...estado, cargar }
}

/**
 * Conecta el botón PDF con la ventana compartida "Exportar reporte" (dashboard-pdf.js, sin modificarla).
 * La ventana se crea una vez; lee siempre los datos y filtros ACTUALES desde una referencia, así los
 * chips y el reporte muestran lo que estaba activo al exportar.
 */
function usePdf(hayDatos, actual) {
  const ref = useRef(actual)
  ref.current = actual
  useEffect(() => {
    if (!hayDatos) return undefined
    let vivo = true
    const antes = new Set(document.querySelectorAll('.dashboard-pdf-picker'))
    cargarHerramientaPdf().then((pdf) => {
      if (!vivo || !document.getElementById(ID_BOTON_PDF)) return
      pdf.openModulePicker({
        buttonId: ID_BOTON_PDF,
        modules: MODULOS_PDF,
        getFilterChips: () => chipsFiltros(ref.current),
        buildReport: async (seleccion) => construirReporteMailing({ seleccion, ...ref.current }),
        filename: () => nombreArchivoPdf(),
      })
    }).catch((error) => console.warn('[Mailing] No se pudo preparar el PDF:', error?.message))
    return () => {
      vivo = false
      document.querySelectorAll('.dashboard-pdf-picker').forEach((el) => { if (!antes.has(el)) el.remove() })
    }
  }, [hayDatos])
}

export function MarketingCanales() {
  const [vista, setVista] = useState('metricas')
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  // La lista de campañas disponibles llega con la primera respuesta y se conserva para los filtros.
  const [disponibles, setDisponibles] = useState(null)
  const parametro = disponibles ? parametroCampanas(disponibles, filtros) : null
  const sinCampanas = parametro === ''
  const { cargando, datos, error, actualizadoEn, cargar } = useMailing(sinCampanas ? null : parametro, filtros.pais, !sinCampanas)
  useEffect(() => { if (datos?.disponibles) setDisponibles(datos.disponibles) }, [datos])
  const actualizar = () => cargar(true)
  const listo = Boolean(datos && datos.fuente.configurada)
  usePdf(listo, { datos, vista, filtros, disponibles: disponibles ?? datos?.disponibles, sinCampanas, cargando })

  let contenido
  if (!datos && cargando) {
    contenido = <><Encabezado cargando subtitulo="RED Intelfon · Campañas de Brevo" />
      <div className="mkt-cargador" aria-hidden="true" /></>
  } else if (!datos) {
    contenido = <MailingSinDatos tipo="atencion" mensaje={error} cargando={cargando} alActualizar={actualizar} />
  } else if (!datos.fuente.configurada) {
    contenido = <MailingSinDatos tipo="neutro" mensaje={datos.fuente.mensaje} cargando={cargando} alActualizar={actualizar} />
  } else {
    contenido = <PantallaMailing datos={datos} disponibles={disponibles ?? datos.disponibles} vista={vista} alCambiarVista={setVista}
      filtros={filtros} alCambiarFiltros={setFiltros} cargando={cargando} error={error} actualizadoEn={actualizadoEn}
      sinCampanas={sinCampanas} alActualizar={actualizar} />
  }

  return <div className="mkt">
    <main className="mkt-pagina" aria-busy={cargando}>{contenido}</main>
  </div>
}
