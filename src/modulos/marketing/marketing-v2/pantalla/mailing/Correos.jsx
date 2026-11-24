// Canales de marketing · Mailing · Correos por corregir y Detalle por correo (MAILING.md, secciones 3 a 5 y 8).
// Reciben el clic de Resultados generales (foco: qué estado se pidió) y responden a los filtros de arriba.
// MUESTRAN CORREOS sin inicio de sesión, por decisión de Keily (docs/marketing/v2/DECISIONES.md); el servidor los
// puede ocultar con MKT_MOSTRAR_CORREOS = no. Los datos vienen de /api/marketing/mailing/detalle (historial importado
// y webhook). Cliente y Ejecutivo dicen «Pendiente del cruce» hasta tener Cumplimiento de Clientes.
import { useCallback, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { COLORES, Insignia } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { CeldaEmpresas, textoEmpresas } from './empresas.jsx'
import { PorEjecutivo } from './Ejecutivos.jsx'
import { Ficha } from './Ficha.jsx'
import {
  CLASIFICACIONES, clasificarCruce, empresasDe, ESTADOS_DETALLE, estadoDetalle, fechaCorta, fechaHora, filtrarDetalle, FILTROS_DETALLE, numero,
  paginar, sumarResumen, sumarTotales,
} from '../../datos/calculos.js'
import { columnasCampana, textosCampana } from '../../datos/campana.js'
import { aCsv, descargarCsv } from '../../datos/csv.js'
import { exportarExcel } from '../../datos/excel.js'
import { Aviso, Enfoque, FilaBarra, Gris, InsigniaCargo, Tarjeta, TarjetaBajita, TEXTO_WEBHOOK, TituloCampana } from './piezas.jsx'

const v = (s, n) => (s.hayDatos ? numero(n) : '—')
const detalleFiltro = (campanas) => `${numero(campanas.length)} campañas según los filtros de arriba`
const TAMANOS = [25, 50, 100]
const COLOR_ESTADO = {
  todos: COLORES.azul, entregado: COLORES.verdeClaro, apertura: COLORES.azulClaro, apertura_automatica: COLORES.azulClaro, clic: COLORES.verde,
  rebotes: COLORES.rosa, rebote_temporal: COLORES.amarillo, rebote_permanente: COLORES.rosa, sin_confirmacion: COLORES.tenue, baja: COLORES.amarillo, spam: COLORES.rosa,
}
export const TONO_ESTADO = { entregado: 'verde', rebote_temporal: 'amarillo', rebote_permanente: 'rojo', sin_confirmacion: 'neutro' }
export const ORIGEN = { historial: 'Historial importado', webhook: 'Webhook', ambos: 'Historial y webhook' }

// ---------------- Piezas de tabla: buscador, selector, paginación, exportar ----------------

export function Buscador({ valor, onCambio, placeholder }) {
  return <label className="mkv2-buscar-v">
    <Search size={14} aria-hidden="true" />
    <input className="mkv2-control" type="search" value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
  </label>
}

export function Selector({ etiqueta, valor, onCambio, opciones, todos = 'Todos' }) {
  return <label className="mkv2-campo-v mkv2-campo-chico">
    <span>{etiqueta}</span>
    <select className="mkv2-control" value={valor} onChange={(e) => onCambio(e.target.value)}>
      <option value="">{todos}</option>
      {opciones.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
    </select>
  </label>
}

export function Paginacion({ p, onPagina, tamano, onTamano }) {
  return <div className="mkv2-paginacion">
    <span>{numero(p.total)} filas · página {numero(p.pagina)} de {numero(p.paginas)}</span>
    <div className="mkv2-acciones">
      <select className="mkv2-control mkv2-control-chico" value={tamano} onChange={(e) => onTamano(Number(e.target.value))} aria-label="Filas por página">
        {TAMANOS.map((t) => <option key={t} value={t}>{t} por página</option>)}
      </select>
      <button type="button" className="fv2-pildora" disabled={p.pagina <= 1} onClick={() => onPagina(p.pagina - 1)} aria-label="Página anterior"><ChevronLeft size={14} /></button>
      <button type="button" className="fv2-pildora" disabled={p.pagina >= p.paginas} onClick={() => onPagina(p.pagina + 1)} aria-label="Página siguiente"><ChevronRight size={14} /></button>
    </div>
  </div>
}

export function BotonExcel({ onClick, total }) {
  const [estado, setEstado] = useState('')
  const exportar = async () => { setEstado('Preparando…'); const tipo = await onClick(); setEstado(tipo === 'csv' ? 'Se descargó en CSV' : '') }
  return <button type="button" className="fv2-pildora" onClick={exportar} disabled={!total || estado === 'Preparando…'} title="Exporta lo que se ve, con los filtros aplicados">
    <Download size={13} />{estado || `Exportar a Excel (${numero(total)})`}
  </button>
}

/** Tabla simple con filas ya paginadas. Con onFila, cada fila abre la ficha (clic o Enter). */
export function Tabla({ columnas, filas, vacio, clave, onFila }) {
  return <div className="fv2-tabla-caja">
    <table className="fv2-tabla mkv2-tabla">
      <thead><tr>{columnas.map((c) => <th key={c.label} scope="col">{c.label}</th>)}</tr></thead>
      <tbody>
        {filas.map((f) => <tr key={clave(f)} className={onFila ? 'mkv2-fila-clic' : undefined} tabIndex={onFila ? 0 : undefined}
          title={onFila ? 'Ver la ficha de este correo' : undefined} onClick={onFila ? () => onFila(f) : undefined}
          onKeyDown={onFila ? (e) => { if (e.key === 'Enter') onFila(f) } : undefined}>
          {columnas.map((c) => <td key={c.label} className={c.clase ?? ''}>{c.celda(f)}</td>)}
        </tr>)}
        {!filas.length && <tr><td colSpan={columnas.length} className="fv2-tabla-vacia mkv2-vacio-fila">{vacio}</td></tr>}
      </tbody>
    </table>
  </div>
}

/** Aviso cuando el detalle no se puede mostrar (error, interruptor apagado o sin datos). */
export function AvisoDetalle({ detalle, errorDetalle, onReintentar }) {
  if (errorDetalle) return <Aviso titulo="No se pudo leer el detalle por correo" texto={errorDetalle} onReintentar={onReintentar} />
  if (detalle && !detalle.mostrarCorreos) return <Aviso icono="candado" titulo="Los correos están ocultos" texto={`${detalle.aviso ?? ''} Hay ${numero(detalle.total)} filas; solo se muestran conteos.`} />
  return null
}

/** Datos comunes: campañas filtradas arriba → ids y nombres; filas del detalle de esas campañas. */
function usarDetalle(campanas, detalle) {
  return useMemo(() => {
    const nombres = Object.fromEntries(campanas.map((c) => [c.id, c]))
    const ids = new Set(campanas.map((c) => c.id))
    const filas = (detalle?.mostrarCorreos ? detalle.filas : []).filter((x) => ids.has(x.campana_id))
    return { nombres, ids, filas }
  }, [campanas, detalle])
}

/** Campaña en una línea («Asunto — #74 NOMBRE»): búsquedas y textos. En pantalla se usa <TituloCampana>. */
export const nombreCampana = (nombres, id) => textosCampana(nombres[id], id).unaLinea

/** Para exportar: la columna «Campaña» se vuelve «Campaña (#)», «Asunto» y «Nombre de campaña». */
export function columnasExportar(columnas, nombres) {
  return columnas.filter((c) => c.valor).flatMap((c) => (c.label === 'Campaña'
    ? columnasCampana((x) => [nombres[x.campana_id] ?? { id: x.campana_id }]).map((k) => ({ ...k, ancho: k.label === 'Campaña (#)' ? 12 : 36 }))
    : [c]))
}

/** Filas del MISMO correo (una por campaña) para la ficha; la campaña elegida primero, luego la más reciente. */
export function filasDelCorreo(filas, correo, campanaPrimero = null) {
  return filas.filter((x) => x.correo === correo)
    .sort((a, b) => (b.campana_id === campanaPrimero) - (a.campana_id === campanaPrimero) || b.campana_id - a.campana_id)
}
const filtrosTexto = (campanas, extra) => [['Campañas (filtros de arriba)', `${campanas.length}: ${campanas.map((c) => textosCampana(c).corto).join(' · ')}`], ...extra]

// ---------------- Correos por corregir ----------------
// Misma estructura que la referencia visual: franja con el total y «Exportar lista CSV», «Correos pendientes por
// ejecutivo» (Ejecutivos.jsx) y el listado con una fila por correo + campaña; «Ver eventos» abre la ficha de siempre.

/** Motivos técnicos (CORREGIR / MANTENER): se muestran en Detalle por correo (paso 5 del rediseño). */
export function Motivos({ titulo, sub, motivos, color, hayDatos }) {
  const max = motivos[0]?.[1] ?? 0
  return <Tarjeta titulo={titulo} sub={sub}>
    {hayDatos && motivos.length
      ? <div className="mkv2-embudo">{motivos.map(([m, n]) => <FilaBarra key={m} nombre={m} valor={n} max={max} color={color} />)}</div>
      : <Aviso icono="info" titulo={hayDatos ? 'Sin casos en las campañas filtradas' : 'Sin detalle por correo todavía'} texto={hayDatos ? undefined : TEXTO_WEBHOOK} />}
  </Tarjeta>
}

const CLASE_RELACION = { objetivo: 'is-verde', otro: 'is-ambar', varias: 'is-ambar', posible: 'is-ambar', sin: 'is-gris' }

/** Celda Cliente como la referencia: empresa en negrita y debajo «código país · relación» (verde = cargo objetivo). */
export function CeldaCliente({ fila, cargo }) {
  if (fila?.clientes === null || fila?.clientes === undefined) return <span className="fv2-tenue">Pendiente del cruce</span>
  const { tipo, empresas } = empresasDe(fila)
  const relacion = clasificarCruce(fila, cargo)
  const nombre = tipo === 'sin' ? 'Sin identificar' : relacion === 'varias' ? 'Varias empresas relacionadas' : empresas[0].cliente
  const codigos = [...new Set(empresas.map((e) => `${e.codigo} ${e.pais}`))]
  return <span className={`mkv2-cliente-celda ${tipo === 'posible' ? 'is-posible' : ''}`}
    data-tip={empresas.length ? empresas.map((e) => `${e.cliente} (${e.pais}-${e.codigo})`).join(' · ') : undefined}>
    <strong>{nombre}</strong>
    <small>{codigos.join(' / ')}{codigos.length ? ' · ' : ''}<span className={`mkv2-relacion ${CLASE_RELACION[relacion]}`}>{CLASIFICACIONES[relacion]}</span></small>
  </span>
}

const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export function CorreosPorCorregir({ campanas, errorResumen, detalle, errorDetalle, foco, limpiarFoco, volver, reintentar }) {
  const { nombres, filas } = usarDetalle(campanas, detalle)
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(25)
  const [ficha, setFicha] = useState(null)
  const cerrarFicha = useCallback(() => setFicha(null), [])
  const campanaDe = useCallback((id) => nombres[id] ?? null, [nombres])
  const cargoDe = (id) => nombres[id]?.cargo ?? 'Sin clasificar'
  // Una fila por correo + campaña marcada CORREGIR; la más reciente primero.
  const corregir = useMemo(() => filas.filter((x) => x.status === 'CORREGIR')
    .sort((a, b) => String(b.fechaRebote ?? '').localeCompare(String(a.fechaRebote ?? '')) || a.correo.localeCompare(b.correo)), [filas])
  const lista = useMemo(() => {
    const q = normalizar(texto)
    if (!q) return corregir
    return corregir.filter((x) => normalizar(`${x.correo} ${textoEmpresas(x, 'ejecutivo')} ${textoEmpresas(x, 'cliente')} ${nombreCampana(nombres, x.campana_id)}`).includes(q))
  }, [corregir, texto, nombres])
  const unicas = new Set(corregir.map((x) => x.correo.toLowerCase())).size
  const p = paginar(lista, pagina, tamano)

  const columnas = [
    { label: 'Dirección de correo', clase: 'mkv2-celda-correo', celda: (x) => <strong className="mkv2-texto-fuerte">{x.correo}</strong>, valor: (x) => x.correo },
    { label: 'Cliente', clase: 'mkv2-celda-media', celda: (x) => <CeldaCliente fila={x} cargo={cargoDe(x.campana_id)} />,
      valor: (x) => `${textoEmpresas(x, 'cliente')} · ${x.clientes == null ? 'Pendiente del cruce' : CLASIFICACIONES[clasificarCruce(x, cargoDe(x.campana_id))]}` },
    { label: 'Ejecutivo de ventas', clase: 'mkv2-celda-media', celda: (x) => <CeldaEmpresas fila={x} campo="ejecutivo" />, valor: (x) => textoEmpresas(x, 'ejecutivo') },
    { label: 'Status de correo', celda: () => <Insignia tono="rojo">CORREGIR CORREO</Insignia>, valor: () => 'CORREGIR CORREO' },
    { label: 'Motivo técnico', clase: 'mkv2-celda-media', celda: (x) => x.motivoTecnico ?? 'Pendiente de verificar', valor: (x) => x.motivoTecnico ?? 'Pendiente de verificar' },
    { label: 'Resultado final', celda: (x) => <Insignia tono={TONO_ESTADO[x.estado]}>{x.estadoTexto}</Insignia>, valor: (x) => x.estadoTexto },
    { label: 'Campaña', clase: 'mkv2-celda-campana', celda: (x) => <TituloCampana campana={nombres[x.campana_id]} id={x.campana_id} />, valor: (x) => nombreCampana(nombres, x.campana_id) },
    { label: 'Fecha rebote', celda: (x) => <span className="fv2-sin-salto">{fechaHora(x.fechaRebote)}</span>, valor: (x) => fechaHora(x.fechaRebote) },
    { label: 'Detalle', celda: (x) => <button type="button" className="fv2-pildora mkv2-ver-eventos" onClick={() => setFicha({ correo: x.correo, campana: x.campana_id })}>Ver eventos</button>, valor: null },
  ]
  const exportar = () => descargarCsv(`correos-por-corregir_${new Date().toISOString().slice(0, 10)}`, aCsv([
    ...columnasExportar(columnas, nombres),
    { label: 'Indicación', valor: (x) => x.indicacion },
  ], lista))

  return <>
    {foco && <Enfoque titulo={foco.titulo ?? 'Correos por corregir'} detalle={detalleFiltro(campanas)} onTodos={limpiarFoco} onVolver={volver} />}
    <AvisoDetalle detalle={detalle} errorDetalle={errorDetalle} onReintentar={reintentar} />
    {errorResumen && <Aviso titulo="No se pudo leer el resumen de eventos" texto={errorResumen} onReintentar={reintentar} />}
    <div className="mkv2-franja-roja" role="status">
      <div>
        <strong>{numero(unicas)} {unicas === 1 ? 'correo requiere' : 'correos requieren'} corrección o verificación</strong>
        <span>{numero(corregir.length)} casos (correo + campaña) · se muestran únicamente los marcados «CORREGIR CORREO» en la base de análisis.{filas.length ? '' : ` ${TEXTO_WEBHOOK}`}</span>
      </div>
      <button type="button" className="fv2-pildora" onClick={exportar} disabled={!lista.length}><Download size={13} />Exportar lista CSV</button>
    </div>
    <PorEjecutivo filas={lista} campanaDe={campanaDe} cruce={detalle?.cruce} />
    <Tarjeta titulo="Listado de correos por corregir" sub="Detalle completo por campaña, disponible también para exportar."
      acciones={<>
        <Buscador valor={texto} onCambio={(v) => { setTexto(v); setPagina(1) }} placeholder="Buscar dirección, dominio o ejecutivo" />
        <button type="button" className="fv2-pildora" onClick={exportar} disabled={!lista.length}><Download size={13} />Exportar lista</button>
      </>}>
      <Tabla columnas={columnas} filas={p.filas} clave={(x) => `${x.campana_id}|${x.correo}`}
        vacio={detalle?.mostrarCorreos === false ? 'Los correos están ocultos.' : corregir.length ? 'Sin resultados con esta búsqueda.' : 'No hay correos por corregir con los filtros actuales.'} />
      <Paginacion p={p} onPagina={setPagina} tamano={tamano} onTamano={(t) => { setTamano(t); setPagina(1) }} />
      <p className="mkv2-nota">«CORREGIR CORREO» significa verificar y corregir la dirección o su configuración antes del próximo envío. No prueba, por sí solo, que el buzón sea inexistente.</p>
    </Tarjeta>
    {ficha && <Ficha filas={filasDelCorreo(filas, ficha.correo, ficha.campana)} nombres={nombres} onCerrar={cerrarFicha} />}
  </>
}

// ---------------- Detalle por correo ----------------

export function DetallePorCorreo({ campanas, resumen, errorResumen, detalle, errorDetalle, foco, limpiarFoco, volver, reintentar }) {
  const [f, setF] = useState({ ...FILTROS_DETALLE, estado: foco?.estado ?? 'todos' })
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(25)
  const t = useMemo(() => sumarTotales(campanas), [campanas])
  const s = useMemo(() => sumarResumen(campanas, resumen), [campanas, resumen])
  const { nombres, filas } = usarDetalle(campanas, detalle)
  const lista = useMemo(() => filtrarDetalle(filas, f, { nombres }), [filas, f, nombres])
  const [ficha, setFicha] = useState(null)
  const cerrarFicha = useCallback(() => setFicha(null), [])
  const p = paginar(lista, pagina, tamano)
  const e = estadoDetalle(f.estado)
  const poner = (k) => (val) => { setF((x) => ({ ...x, [k]: val })); setPagina(1) }
  const elegir = (id) => () => poner('estado')(id)

  const columnas = [
    { label: 'Correo', clase: 'mkv2-celda-correo', celda: (x) => <strong className="mkv2-texto-fuerte">{x.correo}</strong>, valor: (x) => x.correo, ancho: 34 },
    { label: 'Cliente', clase: 'mkv2-celda-media', celda: (x) => <CeldaEmpresas fila={x} campo="cliente" />, valor: (x) => textoEmpresas(x, 'cliente'), ancho: 34 },
    { label: 'País', celda: (x) => <CeldaEmpresas fila={x} campo="pais" />, valor: (x) => textoEmpresas(x, 'pais'), ancho: 16 },
    { label: 'Ejecutivo', clase: 'mkv2-celda-media', celda: (x) => <CeldaEmpresas fila={x} campo="ejecutivo" />, valor: (x) => textoEmpresas(x, 'ejecutivo'), ancho: 26 },
    { label: 'Campaña', clase: 'mkv2-celda-campana', celda: (x) => <TituloCampana campana={nombres[x.campana_id]} id={x.campana_id} />, valor: (x) => nombreCampana(nombres, x.campana_id), ancho: 36 },
    { label: 'Cargo', celda: (x) => <InsigniaCargo cargo={nombres[x.campana_id]?.cargo ?? 'Sin clasificar'} />, valor: (x) => nombres[x.campana_id]?.cargo ?? 'Sin clasificar', ancho: 14 },
    { label: 'Estado final', celda: (x) => <Insignia tono={TONO_ESTADO[x.estado]}>{x.estadoTexto}</Insignia>, valor: (x) => x.estadoTexto, ancho: 18 },
    { label: 'Status', celda: (x) => <Insignia tono={x.status === 'CORREGIR' ? 'rojo' : 'neutro'}>{x.status}</Insignia>, valor: (x) => `${x.status} CORREO`, ancho: 18 },
    { label: 'Motivo técnico', clase: 'mkv2-celda-media', celda: (x) => <Gris texto={x.motivoTecnico ?? '—'} />, valor: (x) => x.motivoTecnico ?? '', ancho: 30 },
    { label: 'Indicación', clase: 'mkv2-celda-larga', celda: (x) => x.indicacion, valor: (x) => x.indicacion, ancho: 44 },
    { label: 'Apertura', celda: (x) => x.apertura, valor: (x) => x.apertura, ancho: 22 },
    { label: 'Clic', celda: (x) => x.clic, valor: (x) => x.clic, ancho: 20 },
    { label: 'Origen', celda: (x) => ORIGEN[x.origen] ?? x.origen, valor: (x) => ORIGEN[x.origen] ?? x.origen, ancho: 20 },
    { label: 'Fecha de envío', celda: (x) => <span className="fv2-sin-salto">{fechaCorta(x.fechaEnvio)}</span>, valor: (x) => fechaCorta(x.fechaEnvio), ancho: 14 },
  ]
  const exportar = () => exportarExcel({
    nombreBase: `detalle-por-correo_${new Date().toISOString().slice(0, 10)}`,
    titulo: 'DETALLE POR CORREO · MAILING', subtitulo: `${numero(lista.length)} filas (correo y campaña) · estado: ${e.label}`,
    columnas: columnasExportar(columnas, nombres), filas: lista,
    filtros: filtrosTexto(campanas, [['Estado', e.label], ['Status', f.status || 'Todos'], ['Apertura', f.apertura || 'Todas'], ['Clic', f.clic || 'Todos'],
      ['Origen', ORIGEN[f.origen] ?? 'Todos'], ['Búsqueda', f.texto || 'Ninguna']]),
  })

  return <>
    {foco && <Enfoque titulo={`Detalle del indicador · ${e.label}`} detalle={detalleFiltro(campanas)} onTodos={() => { setF(FILTROS_DETALLE); limpiarFoco() }} onVolver={volver} />}
    <AvisoDetalle detalle={detalle} errorDetalle={errorDetalle} onReintentar={reintentar} />
    {errorResumen && <Aviso titulo="No se pudo leer el resumen de eventos" texto={errorResumen} onReintentar={reintentar} />}

    <div className="mkv2-bajitas">
      {ESTADOS_DETALLE.filter((x) => x.id !== 'todos').map((x) => <TarjetaBajita key={x.id} titulo={x.label} valor={numero(x.brevo(t))} color={COLOR_ESTADO[x.id]}
        sub={s.hayDatos ? `con detalle: ${numero(x.webhook(s))}` : 'total de Brevo'} activo={f.estado === x.id} onClick={elegir(f.estado === x.id ? 'todos' : x.id)}
        tip={`${x.label}: ${numero(x.brevo(t))} según Brevo${x.notaBrevo ? ` (${x.notaBrevo})` : ''}${s.hayDatos ? `
Con detalle por persona: ${numero(x.webhook(s))}` : ''}
${f.estado === x.id ? 'Clic para ver todos' : 'Clic para ver solo estos en la tabla'}`} />)}
    </div>

    <Tarjeta titulo="Detalle por destinatario" sub={`Una fila por correo y campaña · ${e.label}: ${numero(e.brevo(t))} según Brevo; con detalle por persona: ${numero(lista.length)} filas`}
      acciones={<BotonExcel onClick={exportar} total={lista.length} />}>
      <div className="mkv2-barra-tabla">
        <Buscador valor={f.texto} onCambio={poner('texto')} placeholder="Buscar correo, dominio o campaña" />
        <Selector etiqueta="Estado" valor={f.estado === 'todos' ? '' : f.estado} onCambio={(val) => poner('estado')(val || 'todos')}
          opciones={ESTADOS_DETALLE.filter((x) => x.id !== 'todos').map((x) => [x.id, x.label])} />
        <Selector etiqueta="Status" valor={f.status} onCambio={poner('status')} opciones={[['CORREGIR', 'CORREGIR'], ['MANTENER', 'MANTENER']]} />
        <Selector etiqueta="Apertura" valor={f.apertura} onCambio={poner('apertura')} opciones={['APERTURA REGISTRADA', 'APERTURA AUTOMÁTICA', 'NO REGISTRADA']} todos="Todas" />
        <Selector etiqueta="Clic" valor={f.clic} onCambio={poner('clic')} opciones={['CLIC REGISTRADO', 'SIN CLIC REGISTRADO']} />
        <Selector etiqueta="Origen" valor={f.origen} onCambio={poner('origen')} opciones={Object.entries(ORIGEN)} />
      </div>
      <Tabla columnas={columnas} filas={p.filas} clave={(x) => `${x.campana_id}|${x.correo}`} onFila={(x) => setFicha({ correo: x.correo, campana: x.campana_id })}
        vacio={detalle?.mostrarCorreos === false ? 'Los correos están ocultos.' : filas.length ? 'Sin resultados con esta búsqueda o filtros.' : TEXTO_WEBHOOK} />
      <Paginacion p={p} onPagina={setPagina} tamano={tamano} onTamano={(n) => { setTamano(n); setPagina(1) }} />
    </Tarjeta>
    {ficha && <Ficha filas={filasDelCorreo(filas, ficha.correo, ficha.campana)} nombres={nombres} onCerrar={cerrarFicha} />}
  </>
}
