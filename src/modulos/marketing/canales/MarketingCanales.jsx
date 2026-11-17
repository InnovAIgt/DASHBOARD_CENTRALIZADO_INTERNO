// Marketing por canales · pantalla de Mailing dentro del portal (menú MARKETING → "Marketing por canales").
// Una sola vista, sin pestañas (D31): Redes sociales y Otros no se muestran hasta tener fuente de datos.
// Datos: /api/marketing/mailing (solo totales). Los filtros eligen campañas (?campanas=, D29) y el
// servidor recalcula. Estilos: marketing-canales.css (prefijo mkt-). Documentación: docs/marketing-canales/README.md
import { useCallback, useEffect, useRef, useState } from 'react'
import { pedirMailing } from './servicios/api.js'
import { Encabezado, MailingSinDatos, PantallaMailing } from './pantalla/Mailing.jsx'
import { FILTROS_VACIOS, parametroCampanas } from './pantalla/datos.js'
import './marketing-canales.css'

/** Carga de mailing: estado de la consulta, datos y error. Siempre se queda con la última respuesta pedida. */
function useMailing(campanas, activo) {
  const [estado, setEstado] = useState({ cargando: true, datos: null, error: null })
  const pedido = useRef(null)
  const cargar = useCallback(async (actualizar = false) => {
    pedido.current?.abort()
    const control = new AbortController()
    pedido.current = control
    setEstado((e) => ({ ...e, cargando: true }))
    try {
      const r = await pedirMailing({ actualizar, campanas, signal: control.signal })
      if (control.signal.aborted) return
      setEstado((e) => (r.ok ? { cargando: false, datos: r.datos, error: null } : { cargando: false, datos: e.datos, error: r.mensaje }))
    } catch {
      /* pedido cancelado: lo reemplazó otro */
    }
  }, [campanas])
  useEffect(() => {
    if (activo) cargar()
    return () => pedido.current?.abort()
  }, [cargar, activo])
  return { ...estado, cargar }
}

export function MarketingCanales() {
  const [vista, setVista] = useState('metricas')
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  // La lista de campañas disponibles llega con la primera respuesta y se conserva para los filtros.
  const [disponibles, setDisponibles] = useState(null)
  const parametro = disponibles ? parametroCampanas(disponibles, filtros) : null
  const sinCampanas = parametro === ''
  const { cargando, datos, error, cargar } = useMailing(sinCampanas ? null : parametro, !sinCampanas)
  useEffect(() => { if (datos?.disponibles) setDisponibles(datos.disponibles) }, [datos])
  const actualizar = () => cargar(true)

  let contenido
  if (!datos && cargando) {
    contenido = <><Encabezado cargando alActualizar={actualizar} subtitulo="RED Intelfon · Campañas de Brevo" />
      <p className="mkt-consultando" role="status">Consultando los datos de mailing…</p></>
  } else if (!datos) {
    contenido = <MailingSinDatos tipo="atencion" mensaje={error} cargando={cargando} alActualizar={actualizar} />
  } else if (!datos.fuente.configurada) {
    contenido = <MailingSinDatos tipo="neutro" mensaje={datos.fuente.mensaje} cargando={cargando} alActualizar={actualizar} />
  } else {
    contenido = <PantallaMailing datos={datos} disponibles={disponibles ?? datos.disponibles} vista={vista} alCambiarVista={setVista}
      filtros={filtros} alCambiarFiltros={setFiltros} cargando={cargando} error={error} sinCampanas={sinCampanas} alActualizar={actualizar} />
  }

  return <div className="mkt">
    <main className="mkt-pagina" aria-busy={cargando}>{contenido}</main>
  </div>
}
