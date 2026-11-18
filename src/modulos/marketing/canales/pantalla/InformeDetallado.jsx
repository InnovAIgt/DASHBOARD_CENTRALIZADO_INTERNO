// Mailing · listas de personas. Ninguna consulta ni exportación pasa por el PDF.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { pedirInformeMailing } from '../servicios/api.js'
import { formatoFechaEnvio, formatoNumero, PAISES_FILTRO } from './datos.js'

const TONO_RESULTADO = {
  'Abrió (lectura real)': 'info',
  'Hizo clic': 'ok',
  'Rebote permanente': 'bad',
  'Rebote temporal': 'warn',
  Queja: 'bad',
  'Se dio de baja': 'warn',
  'Abrió solo automático (iPhone)': 'na',
  'Entregado sin abrir': 'na',
  'Sin estado': 'na',
}

function fechaLegible(fecha) {
  if (!fecha) return '—'
  if (fecha === 'ilegible') return 'Fecha ilegible'
  return formatoFechaEnvio(fecha)
}

function useDetalle(opciones) {
  const serializado = JSON.stringify(opciones)
  const control = useRef(null)
  const [estado, setEstado] = useState({ fase: 'cargando' })

  const cargar = useCallback(async () => {
    control.current?.abort()
    const nuevo = new AbortController()
    control.current = nuevo
    setEstado({ fase: 'cargando' })
    try {
      const resultado = await pedirInformeMailing({ ...JSON.parse(serializado), signal: nuevo.signal })
      if (nuevo.signal.aborted) return
      if (resultado.ok) return setEstado({ fase: 'lista', datos: resultado.datos })
      setEstado({ fase: 'error', error: resultado.mensaje })
    } catch (error) {
      if (!nuevo.signal.aborted) setEstado({ fase: 'error', error: error.message })
    }
  }, [serializado])

  useEffect(() => {
    cargar()
    return () => control.current?.abort()
  }, [cargar])

  return { estado }
}

function Buscador({ valor, alCambiar, id }) {
  return <label className="mkt-buscador" htmlFor={id}>
    <Search size={14} aria-hidden="true" />
    <span className="mkt-solo-lector">Buscar correo, campaña o cargo</span>
    <input id={id} type="search" placeholder="Correo, campaña o cargo" value={valor}
      onChange={(e) => alCambiar(e.target.value)} autoComplete="off" />
  </label>
}

function TablaDetalle({ datos, informe = false }) {
  const [busqueda, setBusqueda] = useState('')
  const [errorExcel, setErrorExcel] = useState(null)
  const idBuscar = useId()
  const texto = busqueda.trim().toLowerCase()
  const personas = useMemo(() => datos.personas.filter((p) => !texto
    || [p.correo, p.campana, p.cargo, p.motivo].some((v) => String(v ?? '').toLowerCase().includes(texto))), [datos, texto])

  const exportarExcel = () => {
    const columnas = [
      ['Correo', 'correo'],
      ['País', 'pais'],
      ['Campaña', 'campana'],
      ['Fecha de envío', 'fechaEnvio'],
      ['Resultado', 'resultado'],
      ['Clics', 'clics'],
      ['Recomendación', 'recomendacion'],
    ]
    const filas = [
      columnas.map(([titulo]) => titulo),
      ...personas.map((p) => columnas.map(([, campo]) => campo === 'fechaEnvio' ? fechaLegible(p[campo]) : p[campo] ?? '')),
    ]
    try {
      const hoja = XLSX.utils.aoa_to_sheet(filas)
      hoja['!cols'] = [{ wch: 34 }, { wch: 18 }, { wch: 48 }, { wch: 18 }, { wch: 36 }, { wch: 10 }, { wch: 58 }]
      const libro = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(libro, hoja, 'Informe detallado')
      const fecha = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(libro, `Informe_detallado_mailing_${fecha}.xlsx`)
      setErrorExcel(null)
    } catch (error) {
      console.error('[Mailing] No se pudo generar el Excel:', error)
      setErrorExcel('No se pudo generar el archivo Excel. Intenta de nuevo o avisa al equipo técnico.')
    }
  }

  const acciones = (datos.acciones ?? []).map((a) => `${formatoNumero(a.cantidad)} ${a.nombre}`).join(' · ')
  const t = datos.totales
  return <>
    {!informe && <div className="mkt-acciones-cabeza">
      <div className="mkt-acciones-resumen">{acciones || 'No hay acciones recomendadas para esta lista.'}</div>
      <Buscador id={idBuscar} valor={busqueda} alCambiar={setBusqueda} />
      {datos.totalTarjeta != null && <span className={`mkt-cuadre ${datos.cuadra ? 'is-ok' : 'is-bad'}`} role="status">
        {formatoNumero(datos.personas.length)} de {formatoNumero(datos.totalTarjeta)} según la tarjeta {datos.cuadra ? '· cuadra' : '· NO cuadra'}
      </span>}
    </div>}
    {informe && <div className="mkt-auditoria-controles">
      <span className="mkt-auditoria-pastilla">Mostrando {formatoNumero(datos.personas.length)} correos · {datos.paisTexto}</span>
      <Buscador id={idBuscar} valor={busqueda} alCambiar={setBusqueda} />
      <button type="button" className="mkt-xf-limpiar" onClick={exportarExcel}>
        <Download size={15} aria-hidden="true" /> Excel
      </button>
    </div>}
    {errorExcel && <p className="mkt-error-detalle" role="alert">{errorExcel}</p>}
    <div className="mkt-personas-tabla mkt-auditoria-tabla">
      <table className="mkt-tabla">
        <thead><tr>{informe ? <>
          <th scope="col">Correo</th><th scope="col">País</th><th scope="col">Campaña</th>
          <th scope="col">Fecha de envío</th><th scope="col">Resultado</th><th scope="col" className="mkt-num">Clics</th>
          <th scope="col">Recomendación</th>
        </> : <>
          <th scope="col">Correo</th><th scope="col">País</th><th scope="col">Campaña</th>
          <th scope="col">Motivo</th><th scope="col">Fecha</th><th scope="col">Recomendación</th>
        </>}</tr></thead>
        <tbody>
          {personas.length === 0 && <tr><td colSpan={informe ? 7 : 6} className="mkt-tenue">Ninguna persona coincide con la búsqueda.</td></tr>}
          {personas.map((p, n) => <tr key={`${p.campanaId}-${p.correo}-${n}`}>
            <td className="mkt-personas-correo">{p.correo}</td><td>{p.pais}</td>
            <td title={p.campana}>{p.campana}</td>
            {informe ? <>
              <td className="mkt-sin-salto">{fechaLegible(p.fechaEnvio)}</td>
              <td><span className={`mkt-pill mkt-b-${TONO_RESULTADO[p.resultado] ?? 'na'}`}>{p.resultado}</span></td>
              <td className="mkt-num">{formatoNumero(p.clics)}</td>
              <td>{p.recomendacion || '—'}</td>
            </> : <>
              <td>{p.motivo || '—'}</td><td className="mkt-sin-salto">{fechaLegible(p.fecha)}</td>
              <td>{p.recomendacion || '—'}</td>
            </>}
          </tr>)}
        </tbody>
        {informe && <tfoot><tr><th colSpan={7} scope="row">
          Totales · Personas {formatoNumero(t.personas)} · Entregados {formatoNumero(t.entregados)} · Aperturas reales {formatoNumero(t.aperturasReales)}
          {' '}· Con clic {formatoNumero(t.personasConClic)} · Rebote permanente {formatoNumero(t.rebotesPermanentes)}
          {' '}· Rebote temporal {formatoNumero(t.rebotesTemporales)} · Bajas {formatoNumero(t.bajas)} · Quejas {formatoNumero(t.quejas)}
        </th></tr></tfoot>}
      </table>
    </div>
    <p className="mkt-tenue mkt-personas-pie">Mostrando {formatoNumero(personas.length)} de {formatoNumero(datos.personas.length)} correos.
      {informe && <>{' '}Excel contiene las mismas columnas, sin IPs.</>}</p>
  </>
}

function ContenidoDetalle({ opciones, informe = false }) {
  const hook = useDetalle(opciones)
  if (hook.estado.fase === 'cargando') return <p className="mkt-tenue" role="status">Cargando detalle…</p>
  if (hook.estado.fase === 'error') return <div className="mkt-aviso is-atencion" role="alert"><strong>No se pudo cargar la lista</strong><div>{hook.estado.error}</div></div>
  return <TablaDetalle datos={{ ...hook.estado.datos, paisTexto: opciones.paisTexto }} informe={informe} />
}

export function ListaTarjeta({ tipo, etiqueta, vista, filtros, campanas, onCerrar }) {
  const cerrar = useRef(null)
  const opciones = useMemo(() => ({
    vista, pais: filtros.pais, campanas, desde: filtros.desde || undefined, hasta: filtros.hasta || undefined,
    cargos: filtros.cargos, tarjeta: tipo, paisTexto: PAISES_FILTRO.find((p) => p.valor === filtros.pais)?.etiqueta ?? 'Todos',
  }), [vista, filtros, campanas, tipo])
  useEffect(() => {
    cerrar.current?.focus()
    const tecla = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar])
  return createPortal(<div className="mkt-ventana" role="presentation">
    <button type="button" className="mkt-ventana-fondo" aria-label="Cerrar" tabIndex={-1} onClick={onCerrar} />
    <section className="mkt-ventana-caja mkt-lista-dinamica" role="dialog" aria-modal="true" aria-labelledby="mkt-lista-titulo">
      <header className="mkt-ventana-encabezado">
        <div><div className="mkt-eyebrow">Lista filtrada · {etiqueta}</div><h2 id="mkt-lista-titulo">{etiqueta}</h2>
          <p className="mkt-tenue">Solo recomendaciones; no se modifica Brevo. Esta lista no se descarga ni entra al PDF.</p></div>
        <button type="button" ref={cerrar} className="mkt-boton-icono" aria-label="Cerrar" onClick={onCerrar}><X size={18} /></button>
      </header>
      <div className="mkt-ventana-cuerpo"><ContenidoDetalle opciones={opciones} /></div>
    </section>
  </div>, document.body)
}

export function InformeDetallado({ datos, vista, filtros, cargando, className = '' }) {
  const campanas = useMemo(() => datos.campanas.filter((c) => !c.excluida).map((c) => c.id), [datos])
  const paisTexto = PAISES_FILTRO.find((p) => p.valor === filtros.pais)?.etiqueta ?? 'Todos'
  const opciones = useMemo(() => ({
    vista, pais: filtros.pais, campanas, desde: filtros.desde || undefined, hasta: filtros.hasta || undefined,
    cargos: filtros.cargos, paisTexto,
  }), [vista, filtros, campanas, paisTexto])
  return <section className={`mkt-auditoria ${className}`} aria-labelledby="mkt-auditoria-titulo">
    <h2 className="mkt-sgl" id="mkt-auditoria-titulo">Auditoría y exportación</h2>
    <div className="mkt-card">
      <div className="mkt-auditoria-intro">
        <h3 className="mkt-card-title">Informe detallado de correos</h3>
        <p className="mkt-card-caption">Usa automáticamente los filtros de arriba.</p>
      </div>
      {cargando ? <p className="mkt-tenue" role="status">Actualizando los filtros…</p>
          : <ContenidoDetalle key={JSON.stringify(opciones)} opciones={opciones} informe />}
    </div>
  </section>
}
