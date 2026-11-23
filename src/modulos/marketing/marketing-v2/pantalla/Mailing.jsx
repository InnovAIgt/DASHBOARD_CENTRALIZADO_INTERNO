// Canales de marketing · pestaña Mailing (docs/marketing/v2/MAILING.md).
// Arma la pantalla: barra de sub-pestañas, filtros globales y la sub-pestaña elegida (carpeta mailing/).
// Dinámica como la plantilla de Mailing:
//  - los filtros de arriba cambian al momento todas las tarjetas, gráficos y tablas de todas las sub-pestañas;
//  - «abrir» lleva desde un clic (tarjeta, etapa, estado) a la sub-pestaña que corresponde, enfocada en ese dato
//    («foco»), con una franja que dice qué se está viendo y botones «Ver todos» y «Volver a resultados»;
//  - «filtrar» cambia un filtro desde un clic (por ejemplo, un cargo o una campaña de una tabla).
// Los datos los pide datos/useMailingDatos.js a NUESTRO servidor. Nunca se muestran correos.
import { useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { filtrarCampanas, filtrarPorCliente, FILTROS_INICIALES, numero, opcionesFiltros, sumarResumen } from '../datos/calculos.js'
import { useMailingDatos } from '../datos/useMailingDatos.js'
import { CompararCampanas } from './mailing/Comparar.jsx'
import { AsignarCargo } from './mailing/Cargos.jsx'
import { RelacionConClientes } from './mailing/Clientes.jsx'
import { CorreosPorCorregir, DetallePorCorreo } from './mailing/Correos.jsx'
import { Filtros } from './mailing/Filtros.jsx'
import { ResultadosGenerales } from './mailing/Generales.jsx'
import { Aviso } from './mailing/piezas.jsx'

export const SUBPESTANAS_MAILING = [
  { key: 'generales', label: 'Resultados generales', icono: '▥' },
  { key: 'comparar', label: 'Comparar campañas', icono: '▤' },
  { key: 'corregir', label: 'Correos por corregir', icono: '⚠' },
  { key: 'detalle', label: 'Detalle por correo', icono: '≡' },
  { key: 'clientes', label: 'Relación con clientes', icono: '♧' },
  { key: 'cargos', label: 'Asignar cargo a campañas', icono: '◎' },
]

const CONTENIDO = {
  generales: ResultadosGenerales,
  comparar: CompararCampanas,
  corregir: CorreosPorCorregir,
  detalle: DetallePorCorreo,
  clientes: RelacionConClientes,
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
  const webhook = useMemo(() => sumarResumen(filtradas, datos.resumen), [filtradas, datos.resumen])
  const cuenta = { comparar: filtradas.filter((c) => c.estado === 'enviada').length, corregir: webhook.hayDatos ? webhook.corregir : null, cargos: filtradas.length }
  // País y Cliente (cruce con Cumplimiento) solo aplican a las filas por correo; los totales de Brevo no se separan.
  const detalle = useMemo(() => (datos.detalle?.mostrarCorreos
    ? { ...datos.detalle, filas: filtrarPorCliente(datos.detalle.filas, { pais: filtros.pais, cliente: filtros.cliente }) }
    : datos.detalle), [datos.detalle, filtros.pais, filtros.cliente])
  const porCliente = !!(filtros.pais || filtros.cliente)
  const vistaPorCorreo = ['corregir', 'detalle', 'clientes'].includes(actual)

  // Navegación: un clic en una pestaña quita el foco; «abrir» lo pone y cambia de pestaña.
  const irA = (key) => { setFoco(null); onSub(key) }
  const abrir = (f) => { setFoco({ ...f, n: (foco?.n ?? 0) + 1 }); onSub(f.vista) }
  const filtrar = (cambio) => setFiltros((f) => ({ ...f, ...cambio }))
  const focoActual = foco?.vista === actual ? foco : null

  return <div className="mkv2-mailing">
    <nav className="mkv2-subpestanas" role="tablist" aria-label="Secciones de Mailing">
      {SUBPESTANAS_MAILING.map((p) => <button type="button" key={p.key} role="tab" aria-selected={actual === p.key}
        className={`mkv2-subpestana ${actual === p.key ? 'is-activa' : ''}`} onClick={() => irA(p.key)}>
        <span aria-hidden="true">{p.icono}</span>{p.label}
        {!datos.cargando && cuenta[p.key] != null && <span className="mkv2-subpestana-cuenta">{numero(cuenta[p.key])}</span>}
      </button>)}
    </nav>

    <Filtros filtros={filtros} cambiar={setFiltros} opciones={opciones} ocultas={ocultas} />

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
      {porCliente && !vistaPorCorreo && <Aviso icono="info" titulo="País y Cliente aplican a las vistas por correo"
        texto="Estos totales vienen de Brevo y no se pueden separar por país ni por cliente. Mira Correos por corregir, Detalle por correo o Relación con clientes." />}
      {datos.detalle?.cruce && datos.detalle.cruce !== 'ok' && vistaPorCorreo && <Aviso titulo="Cliente, País y Ejecutivo no disponibles" texto={datos.detalle.avisoCruce} />}
      <Contenido key={`${actual}-${focoActual?.n ?? 0}`} campanas={filtradas} resumen={datos.resumen} errorResumen={datos.errorResumen}
        detalle={detalle} errorDetalle={datos.errorDetalle}
        foco={focoActual} abrir={abrir} filtrar={filtrar} limpiarFoco={() => setFoco(null)} volver={() => irA('generales')} />
      {datos.actualizado && <p className="mkv2-nota mkv2-actualizado">
        Datos de Brevo de las {new Date(datos.actualizado).toLocaleTimeString('es-GT', { timeZone: 'America/Guatemala', hour: '2-digit', minute: '2-digit' })} · se actualizan cada 10 minutos.
      </p>}
    </>}
  </div>
}
