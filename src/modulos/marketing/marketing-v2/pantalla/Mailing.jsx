// Canales de marketing · pestaña Mailing (docs/marketing/v2/MAILING.md).
// Arma la pantalla: barra de filtros (estilo Facturación, con PDF), sub-pestañas, «Filtrado por» y la sub-pestaña elegida.
// Dinámica como la plantilla de Mailing:
//  - los filtros de arriba cambian al momento todas las tarjetas, gráficos y tablas de todas las sub-pestañas;
//  - «abrir» lleva desde un clic (tarjeta, etapa, estado) a la sub-pestaña que corresponde, enfocada en ese dato
//    («foco»), con una franja que dice qué se está viendo y botones «Ver todos» y «Volver a resultados»;
//  - «filtrar» cambia un filtro desde un clic (por ejemplo, un cargo o una campaña de una tabla).
// Los datos los pide datos/useMailingDatos.js a NUESTRO servidor. Nunca se muestran correos.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { contadoresMailing, fechaCorta, filtrarCampanas, filtrarPorCliente, FILTROS_INICIALES, NOMBRE_CARGO, numero, opcionesFiltros } from '../datos/calculos.js'
import { textosCampana } from '../datos/campana.js'
import { esLeadMailing, filtrarLeads } from '../datos/leads.js'
import { cargarHerramientaPdf, chipsFiltros, construirReporteMailing, MODULOS_PDF_MAILING, nombreArchivoPdf } from '../datos/pdfMailing.js'
import { useMailingDatos } from '../datos/useMailingDatos.js'
import { CompararCampanas } from './mailing/Comparar.jsx'
import { AsignarCargo } from './mailing/Cargos.jsx'
import { RelacionConClientes } from './mailing/Clientes.jsx'
import { CorreosPorCorregir, DetallePorCorreo } from './mailing/Correos.jsx'
import { BarraFiltros, ID_BOTON_PDF, TEXTO_PAIS_INACTIVO } from './mailing/BarraFiltros.jsx'
import { ResultadosGenerales } from './mailing/Generales.jsx'
import { LeadsMailing } from './mailing/Leads.jsx'
import { Aviso, useGlobo } from './mailing/piezas.jsx'

export const SUBPESTANAS_MAILING = [
  { key: 'generales', label: 'Resultados generales' },
  { key: 'comparar', label: 'Comparar campañas' },
  { key: 'corregir', label: 'Correos por corregir' },
  { key: 'detalle', label: 'Detalle por correo' },
  { key: 'clientes', label: 'Relación con clientes' },
  { key: 'leads', label: 'Leads' },
  { key: 'cargos', label: 'Cargo y objetivo' },
]

const CONTENIDO = {
  generales: ResultadosGenerales,
  comparar: CompararCampanas,
  corregir: CorreosPorCorregir,
  detalle: DetallePorCorreo,
  clientes: RelacionConClientes,
  leads: LeadsMailing,
  cargos: AsignarCargo,
}

export function Mailing({ sub, onSub }) {
  const actual = CONTENIDO[sub] ? sub : 'generales'
  const Contenido = CONTENIDO[actual]
  const datos = useMailingDatos()
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [foco, setFoco] = useState(null) // { vista, estado?, metrica?, titulo, n }
  const opciones = useMemo(() => opcionesFiltros(datos.campanas, filtros.mostrarPrueba), [datos.campanas, filtros.mostrarPrueba])
  const filtradas = useMemo(() => filtrarCampanas(datos.campanas, filtros), [datos.campanas, filtros])
  const ocultas = useMemo(() => datos.campanas.filter((c) => c.esPrueba).length, [datos.campanas])
  // País y Cliente (cruce con Cumplimiento) solo aplican a las filas por correo; los totales de Brevo no se separan.
  const detalle = useMemo(() => (datos.detalle?.mostrarCorreos
    ? { ...datos.detalle, filas: filtrarPorCliente(datos.detalle.filas, { pais: filtros.pais, cliente: filtros.cliente }) }
    : datos.detalle), [datos.detalle, filtros.pais, filtros.cliente])
  // Contadores: «Correos por corregir» = direcciones únicas; «Relación con clientes» = filas (correo + campaña).
  const cuentas = useMemo(() => contadoresMailing(detalle?.mostrarCorreos ? detalle.filas : null, filtradas), [detalle, filtradas])
  const vistaPorCorreo = ['corregir', 'detalle', 'clientes'].includes(actual)
  // País: solo en las vistas por correo, en Campañas («Por comercial») y en Leads; en las demás se ve desactivado y se conserva.
  const paisActivo = vistaPorCorreo || actual === 'comparar' || actual === 'leads'
  // Leads de Prospekt con los mismos filtros. País y Buscar cliente solo donde el país está activo (como en las demás vistas).
  // Por defecto SOLO los leads de Mailing (con campaña asignada u origen «PostIAlo Mailing»); el interruptor
  // «Ver leads de todos los orígenes» (apagado) muestra también Redes, Web, PBX y Manual, para revisión.
  const [todosOrigenes, setTodosOrigenes] = useState(false)
  const leads = useMemo(() => {
    const todas = datos.leads?.filas ?? []
    const deCorreo = todas.filter(esLeadMailing)
    const f = paisActivo ? filtros : { ...filtros, pais: '', cliente: '' }
    return {
      ...datos.leads,
      filas: filtrarLeads(todosOrigenes ? todas : deCorreo, f, filtradas),
      total: todas.length,
      nota: { deCorreo: deCorreo.length, conCorreo: todas.filter((x) => x.tieneCorreo).length, total: todas.length },
      todosOrigenes,
      cambiarOrigenes: setTodosOrigenes,
    }
  }, [datos.leads, filtros, filtradas, paisActivo, todosOrigenes])
  const cuenta = { corregir: cuentas.corregir, clientes: cuentas.clientes, leads: datos.leads?.fuente === 'prospekt' ? leads.filas.length : null }
  const tituloCuenta = {
    corregir: cuentas.corregir != null ? `${numero(cuentas.corregir)} direcciones únicas · ${numero(cuentas.casosCorregir)} casos (correo + campaña)` : undefined,
    clientes: cuentas.clientes != null ? `${numero(cuentas.clientes)} filas (correo + campaña)` : undefined,
    leads: cuenta.leads != null ? `${numero(cuenta.leads)} leads ${todosOrigenes ? 'de todos los orígenes' : 'de Mailing'} con los filtros` : undefined,
  }
  const porCliente = Boolean(filtros.cliente) && !paisActivo

  // Navegación: un clic en una pestaña quita el foco; «abrir» lo pone y cambia de pestaña.
  const irA = (key) => { setFoco(null); onSub(key) }
  const abrir = (f) => { setFoco({ ...f, n: (foco?.n ?? 0) + 1 }); onSub(f.vista) }
  const filtrar = (cambio) => setFiltros((f) => ({ ...f, ...cambio }))
  const focoActual = foco?.vista === actual ? foco : null
  const globo = useGlobo()
  // Etiquetas «Filtrado por: …» (campaña y cargo, se pongan con un clic o desde los filtros); ✕ quita ese filtro.
  const campanaElegida = filtros.campana ? datos.campanas.find((c) => String(c.id) === String(filtros.campana)) : null
  const dia = (iso) => fechaCorta(`${iso}T12:00:00`)
  const etiquetas = [
    filtros.pais && { quitar: { pais: '' }, texto: `País: ${filtros.pais}${paisActivo ? '' : ' (no aplica aquí)'}`, tip: paisActivo ? undefined : TEXTO_PAIS_INACTIVO },
    (filtros.desde || filtros.hasta) && { quitar: { desde: '', hasta: '' }, texto: `Período: ${filtros.desde ? dia(filtros.desde) : 'inicio'} – ${filtros.hasta ? dia(filtros.hasta) : 'hoy'}` },
    filtros.campana && { quitar: { campana: '' }, texto: textosCampana(campanaElegida, filtros.campana).corto, tip: textosCampana(campanaElegida, filtros.campana).tip },
    filtros.cargo && { quitar: { cargo: '' }, texto: NOMBRE_CARGO[filtros.cargo] && filtros.cargo !== NOMBRE_CARGO[filtros.cargo] ? `${filtros.cargo} · ${NOMBRE_CARGO[filtros.cargo]}` : filtros.cargo },
    filtros.asunto && { quitar: { asunto: '' }, texto: `Asunto: ${filtros.asunto}` },
    filtros.cliente && { quitar: { cliente: '' }, texto: `Cliente: ${filtros.cliente}` },
    filtros.mostrarPrueba && { quitar: { mostrarPrueba: false }, texto: 'Con campañas de prueba' },
  ].filter(Boolean)

  // ---- PDF de la vista actual: herramienta compartida del portal (dashboard-pdf.js), sin modificarla ----
  // La ventana de módulos se crea una vez; siempre lee los datos actuales desde esta referencia.
  const datosPdf = useRef(null)
  datosPdf.current = { filtros, campanaElegida, filtradas, cuentas, detalle }
  const [pdfListo, setPdfListo] = useState(false)
  useEffect(() => {
    if (datos.cargando) return undefined
    let activo = true
    const antes = new Set(document.querySelectorAll('.dashboard-pdf-picker'))
    cargarHerramientaPdf().then((pdf) => {
      if (!activo || !document.getElementById(ID_BOTON_PDF)) return
      pdf.openModulePicker({
        buttonId: ID_BOTON_PDF,
        modules: MODULOS_PDF_MAILING,
        getFilterChips: () => chipsFiltros(datosPdf.current.filtros, datosPdf.current.campanaElegida),
        buildReport: async (seleccion) => {
          const d = datosPdf.current
          const ids = new Set(d.filtradas.map((c) => c.id))
          const corregir = (d.detalle?.mostrarCorreos ? d.detalle.filas : []).filter((f) => f.status === 'CORREGIR' && ids.has(f.campana_id))
          return construirReporteMailing({ seleccion, campanas: d.filtradas, cuentas: d.cuentas, corregir, nombres: Object.fromEntries(d.filtradas.map((c) => [c.id, c])),
            chips: chipsFiltros(d.filtros, d.campanaElegida), origen: window.location.origin })
        },
        filename: () => nombreArchivoPdf(datosPdf.current.filtros),
      })
      setPdfListo(true)
    }).catch((err) => console.error('PDF de Mailing:', err))
    return () => {
      activo = false
      setPdfListo(false)
      // Al salir de Mailing se quita la ventana de módulos que se creó para ella.
      document.querySelectorAll('.dashboard-pdf-picker').forEach((el) => { if (!antes.has(el)) el.remove() })
    }
  }, [datos.cargando])

  return <div className="mkv2-mailing" {...globo.manejadores}>
    <BarraFiltros filtros={filtros} cambiar={setFiltros} opciones={opciones} ocultas={ocultas} pdfListo={pdfListo} paisActivo={paisActivo} />

    <nav className="mkv2-subpestanas" role="tablist" aria-label="Secciones de Mailing">
      {SUBPESTANAS_MAILING.map((p) => <button type="button" key={p.key} role="tab" aria-selected={actual === p.key}
        className={`mkv2-subpestana ${actual === p.key ? 'is-activa' : ''}`} onClick={() => irA(p.key)}>
        {p.label}
        {!datos.cargando && cuenta[p.key] != null && <span className="mkv2-subpestana-cuenta" data-tip={tituloCuenta[p.key]}>{numero(cuenta[p.key])}</span>}
      </button>)}
    </nav>

    {etiquetas.length > 0 && <div className="mkv2-filtrado" role="status">
      <span>Filtrado por:</span>
      {etiquetas.map((e) => <button type="button" key={e.texto} className="mkv2-filtrado-etiqueta" onClick={() => filtrar(e.quitar)}
        data-tip={e.tip ? `${e.tip}\nClic para quitar este filtro` : 'Clic para quitar este filtro'} aria-label={`Quitar el filtro ${e.texto}`}>{e.texto}<X size={13} aria-hidden="true" /></button>)}
    </div>}

    {datos.cargando && <div className="fv2-vacio"><strong>Cargando campañas de Brevo…</strong><span>La primera vez puede tardar unos 10 segundos.</span></div>}

    {!datos.cargando && datos.error && <div className="fv2-aviso-error" role="alert">
      <AlertTriangle size={18} />
      <div>
        <strong>No se pudieron cargar las campañas</strong>
        <p>{datos.error}</p>
        <small>Los datos vienen de Brevo a través de nuestro servidor.</small>
      </div>
      <button type="button" className="fv2-pildora" onClick={datos.reintentar}><RefreshCw size={13} />Reintentar</button>
    </div>}

    {!datos.cargando && !datos.error && <>
      {datos.avisos.map((a) => <Aviso key={a} titulo="Aviso" texto={a} />)}
      {porCliente && <Aviso icono="info" titulo="Buscar empresa / cliente aplica a las vistas por correo"
        texto="Estos totales vienen de Brevo y no se pueden separar por cliente. Mira Correos por corregir, Detalle por correo, Relación con clientes o «Por comercial» en Campañas." />}
      {datos.detalle?.cruce && datos.detalle.cruce !== 'ok' && vistaPorCorreo && <Aviso titulo="Cliente, País y Ejecutivo no disponibles" texto={datos.detalle.avisoCruce} />}
      <Contenido key={`${actual}-${focoActual?.n ?? 0}`} campanas={filtradas} resumen={datos.resumen} errorResumen={datos.errorResumen}
        detalle={detalle} detalleTodo={datos.detalle} errorDetalle={datos.errorDetalle} cuentas={cuentas} leads={leads}
        edicionHabilitada={datos.edicionHabilitada} actualizarCampana={datos.actualizarCampana}
        foco={focoActual} abrir={abrir} filtrar={filtrar} filtros={filtros} limpiarFoco={() => setFoco(null)} volver={() => irA('generales')} reintentar={datos.reintentar} />
      {datos.actualizado && <p className="mkv2-nota mkv2-actualizado">
        Datos de Brevo de las {new Date(datos.actualizado).toLocaleTimeString('es-GT', { timeZone: 'America/Guatemala', hour: '2-digit', minute: '2-digit' })} · se actualizan cada 10 minutos.
      </p>}
    </>}
    {globo.nodo}
  </div>
}
