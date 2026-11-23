// Canales de marketing · Mailing · Correos por corregir y Detalle por correo (MAILING.md, secciones 3 a 5 y 8).
// Reciben el clic de Resultados generales (foco: qué estado se pidió) y responden a los filtros de arriba.
// MUESTRAN CORREOS sin inicio de sesión, por decisión de Keily (docs/marketing/v2/DECISIONES.md); el servidor los
// puede ocultar con MKT_MOSTRAR_CORREOS = no. Los datos vienen de /api/marketing/mailing/detalle (historial importado
// y webhook). Cliente y Ejecutivo dicen «Pendiente del cruce» hasta tener Cumplimiento de Clientes.
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { COLORES, Insignia } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import {
  direccionesCorregir, ESTADOS_DETALLE, estadoDetalle, fechaCorta, filtrarDetalle, FILTROS_DETALLE, numero, opcionesDe,
  paginar, pct, porcentaje, sumarResumen, sumarTotales,
} from '../../datos/calculos.js'
import { exportarExcel } from '../../datos/excel.js'
import { Aviso, Enfoque, FilaBarra, Gris, InsigniaCargo, Mini, Tarjeta, TEXTO_WEBHOOK } from './piezas.jsx'

const PENDIENTE_CRUCE = 'Pendiente del cruce'
const v = (s, n) => (s.hayDatos ? numero(n) : '—')
const detalleFiltro = (campanas) => `${numero(campanas.length)} campañas según los filtros de arriba`
const TAMANOS = [25, 50, 100]
const COLOR_ESTADO = {
  todos: COLORES.azul, entregado: COLORES.verdeClaro, apertura: COLORES.azulClaro, apertura_automatica: COLORES.azulClaro, clic: COLORES.verde,
  rebotes: COLORES.rosa, rebote_temporal: COLORES.amarillo, rebote_permanente: COLORES.rosa, sin_confirmacion: COLORES.tenue, baja: COLORES.amarillo, spam: COLORES.rosa,
}
const TONO_ESTADO = { entregado: 'verde', rebote_temporal: 'amarillo', rebote_permanente: 'rojo', sin_confirmacion: 'neutro' }
const ORIGEN = { historial: 'Historial importado', webhook: 'Webhook', ambos: 'Historial y webhook' }

// ---------------- Piezas de tabla: buscador, selector, paginación, exportar ----------------

function Buscador({ valor, onCambio, placeholder }) {
  return <label className="mkv2-buscar-v">
    <Search size={14} aria-hidden="true" />
    <input className="mkv2-control" type="search" value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
  </label>
}

function Selector({ etiqueta, valor, onCambio, opciones, todos = 'Todos' }) {
  return <label className="mkv2-campo-v mkv2-campo-chico">
    <span>{etiqueta}</span>
    <select className="mkv2-control" value={valor} onChange={(e) => onCambio(e.target.value)}>
      <option value="">{todos}</option>
      {opciones.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
    </select>
  </label>
}

function Paginacion({ p, onPagina, tamano, onTamano }) {
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

function BotonExcel({ onClick, total }) {
  const [estado, setEstado] = useState('')
  const exportar = async () => { setEstado('Preparando…'); const tipo = await onClick(); setEstado(tipo === 'csv' ? 'Se descargó en CSV' : '') }
  return <button type="button" className="fv2-pildora" onClick={exportar} disabled={!total || estado === 'Preparando…'} title="Exporta lo que se ve, con los filtros aplicados">
    <Download size={13} />{estado || `Exportar a Excel (${numero(total)})`}
  </button>
}

/** Tabla simple con filas ya paginadas. */
function Tabla({ columnas, filas, vacio, clave }) {
  return <div className="fv2-tabla-caja">
    <table className="fv2-tabla mkv2-tabla">
      <thead><tr>{columnas.map((c) => <th key={c.label} scope="col">{c.label}</th>)}</tr></thead>
      <tbody>
        {filas.map((f) => <tr key={clave(f)}>{columnas.map((c) => <td key={c.label} className={c.clase ?? ''}>{c.celda(f)}</td>)}</tr>)}
        {!filas.length && <tr><td colSpan={columnas.length} className="fv2-tabla-vacia mkv2-vacio-fila">{vacio}</td></tr>}
      </tbody>
    </table>
  </div>
}

/** Aviso cuando el detalle no se puede mostrar (error, interruptor apagado o sin datos). */
function AvisoDetalle({ detalle, errorDetalle }) {
  if (errorDetalle) return <Aviso titulo="No se pudo leer el detalle por correo" texto={errorDetalle} />
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

const nombreCampana = (nombres, id) => nombres[id]?.nombre ?? `Campaña ${id}`
const filtrosTexto = (campanas, extra) => [['Campañas (filtros de arriba)', `${campanas.length}: ${campanas.map((c) => c.nombre).join(' · ')}`], ...extra]

// ---------------- Correos por corregir ----------------

function Motivos({ titulo, sub, motivos, color, hayDatos }) {
  const max = motivos[0]?.[1] ?? 0
  return <Tarjeta titulo={titulo} sub={sub}>
    {hayDatos && motivos.length
      ? <div className="mkv2-embudo">{motivos.map(([m, n]) => <FilaBarra key={m} nombre={m} valor={n} max={max} color={color} />)}</div>
      : <Aviso icono="info" titulo={hayDatos ? 'Sin casos en las campañas filtradas' : 'Sin detalle por correo todavía'} texto={hayDatos ? undefined : TEXTO_WEBHOOK} />}
  </Tarjeta>
}

export function CorreosPorCorregir({ campanas, resumen, errorResumen, detalle, errorDetalle, foco, limpiarFoco, volver }) {
  const s = useMemo(() => sumarResumen(campanas, resumen), [campanas, resumen])
  const { nombres, filas } = usarDetalle(campanas, detalle)
  const [f, setF] = useState({ texto: '', motivo: '', origen: '' })
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(25)
  const corregir = useMemo(() => filas.filter((x) => x.status === 'CORREGIR'), [filas])
  const lista = useMemo(() => {
    const base = filtrarDetalle(corregir, { ...FILTROS_DETALLE, texto: f.texto, motivo: f.motivo }, { nombres })
    return direccionesCorregir(base).filter((d) => !f.origen || d.origenes.includes(f.origen))
  }, [corregir, f, nombres])
  const p = paginar(lista, pagina, tamano)
  const poner = (k) => (val) => { setF((x) => ({ ...x, [k]: val })); setPagina(1) }

  const columnas = [
    { label: 'Dirección de correo', clase: 'mkv2-celda-correo', celda: (d) => <strong className="mkv2-texto-fuerte">{d.correo}</strong>, valor: (d) => d.correo, ancho: 34 },
    { label: 'Cliente', celda: () => <span className="fv2-tenue">{PENDIENTE_CRUCE}</span>, valor: () => PENDIENTE_CRUCE, ancho: 20 },
    { label: 'Ejecutivo de ventas', celda: () => <span className="fv2-tenue">{PENDIENTE_CRUCE}</span>, valor: () => PENDIENTE_CRUCE, ancho: 20 },
    { label: 'Status de correo', celda: () => <Insignia tono="rojo">CORREGIR</Insignia>, valor: () => 'CORREGIR CORREO', ancho: 18 },
    { label: 'Motivo técnico', clase: 'mkv2-celda-media', celda: (d) => d.motivos.join(' · '), valor: (d) => d.motivos, ancho: 30 },
    { label: 'Indicación', clase: 'mkv2-celda-larga', celda: (d) => d.indicaciones.join(' · '), valor: (d) => d.indicaciones, ancho: 44 },
    { label: 'Resultado final', clase: 'mkv2-celda-media', celda: (d) => d.estados.join(' · '), valor: (d) => d.estados, ancho: 20 },
    { label: 'Campaña(s)', clase: 'mkv2-celda-larga', celda: (d) => d.campanas.map((id) => nombreCampana(nombres, id)).join(' · '), valor: (d) => d.campanas.map((id) => nombreCampana(nombres, id)), ancho: 40 },
    { label: 'Asunto(s)', clase: 'mkv2-celda-larga', celda: (d) => [...new Set(d.campanas.map((id) => nombres[id]?.asunto).filter(Boolean))].join(' · ') || '—', valor: (d) => [...new Set(d.campanas.map((id) => nombres[id]?.asunto).filter(Boolean))], ancho: 40 },
    { label: 'Fecha de rebote', celda: (d) => <span className="fv2-sin-salto">{fechaCorta(d.fechaRebote)}</span>, valor: (d) => fechaCorta(d.fechaRebote), ancho: 14 },
    { label: 'Origen', celda: (d) => d.origenes.map((o) => ORIGEN[o] ?? o).join(' · '), valor: (d) => d.origenes.map((o) => ORIGEN[o] ?? o), ancho: 20 },
  ]
  const exportar = () => exportarExcel({
    nombreBase: `correos-por-corregir_${new Date().toISOString().slice(0, 10)}`,
    titulo: 'CORREOS POR CORREGIR · MAILING', subtitulo: `${numero(lista.length)} direcciones únicas · ${numero(campanas.length)} campañas`,
    columnas, filas: lista,
    filtros: filtrosTexto(campanas, [['Búsqueda', f.texto || 'Ninguna'], ['Motivo técnico', f.motivo || 'Todos'], ['Origen', ORIGEN[f.origen] ?? 'Todos']]),
  })

  return <>
    {foco && <Enfoque titulo={foco.titulo ?? 'Correos por corregir'} detalle={detalleFiltro(campanas)} onTodos={limpiarFoco} onVolver={volver} />}
    <AvisoDetalle detalle={detalle} errorDetalle={errorDetalle} />
    {errorResumen && <Aviso titulo="No se pudo leer el resumen de eventos" texto={errorResumen} />}
    {s.hayDatos
      ? <Aviso titulo={`${numero(direccionesCorregir(corregir).length)} direcciones únicas requieren corrección o verificación`} texto="Solo las marcadas «CORREGIR CORREO» según el motivo del rebote final. CORREGIR es una revisión de datos, no prueba que la cuenta no exista." />
      : <Aviso icono="info" titulo="Correos por corregir" texto={`${TEXTO_WEBHOOK} Las demás campañas no tienen motivo de rebote por persona.`} />}
    <div className="mkv2-minis">
      <Mini nombre="Correos por corregir" valor={v(s, s.corregir)} nota="Filas CORREGIR (correo y campaña)" color={COLORES.rosa} />
      <Mini nombre="% de los enviados" valor={s.hayDatos ? pct(porcentaje(s.corregir, s.enviados)) : '—'} nota="Sobre los enviados con detalle" color={COLORES.amarillo} />
      <Mini nombre="Rebotes que se mantienen" valor={v(s, s.estados.rebote_temporal + s.estados.rebote_permanente - s.corregir)} nota="Rebote sin error de dirección (MANTENER)" color={COLORES.azulClaro} />
      <Mini nombre="Campañas con detalle" valor={numero(s.campanasConDetalle)} nota={`${numero(s.conHistorial)} con historial importado · ${numero(s.conWebhook)} con webhook`} />
    </div>
    <div className="mkv2-duo">
      <Motivos titulo="Motivos técnicos · CORREGIR" sub="Por qué se pide revisar la dirección" motivos={s.motivosCorregir} color={COLORES.rosa} hayDatos={s.hayDatos} />
      <Motivos titulo="Motivos técnicos · MANTENER" sub="Rebotes que no prueban que la dirección esté mal" motivos={s.motivosMantener} color={COLORES.azulClaro} hayDatos={s.hayDatos} />
    </div>
    <Tarjeta titulo="Correos pendientes por ejecutivo de ventas" sub="Direcciones únicas agrupadas por ejecutivo · aviso con plazo de 48 horas">
      <Aviso icono="info" titulo="Pendiente del cruce con Cumplimiento de Clientes"
        texto="El ejecutivo sale de la cuenta del cliente (País + Código). Mientras tanto, todas las direcciones están en el listado de abajo." />
    </Tarjeta>
    <Tarjeta titulo="Listado de correos por corregir" sub="Una fila por dirección (aunque haya fallado en varias campañas) · exporta lo que se ve"
      acciones={<BotonExcel onClick={exportar} total={lista.length} />}>
      <div className="mkv2-barra-tabla">
        <Buscador valor={f.texto} onCambio={poner('texto')} placeholder="Buscar dirección, dominio o campaña" />
        <Selector etiqueta="Motivo técnico" valor={f.motivo} onCambio={poner('motivo')} opciones={opcionesDe(corregir, 'motivoTecnico')} />
        <Selector etiqueta="Origen" valor={f.origen} onCambio={poner('origen')} opciones={Object.entries(ORIGEN).slice(0, 2)} />
      </div>
      <Tabla columnas={columnas} filas={p.filas} clave={(d) => d.correo}
        vacio={detalle?.mostrarCorreos === false ? 'Los correos están ocultos.' : corregir.length ? 'Sin resultados con esta búsqueda o filtros.' : TEXTO_WEBHOOK} />
      <Paginacion p={p} onPagina={setPagina} tamano={tamano} onTamano={(t) => { setTamano(t); setPagina(1) }} />
    </Tarjeta>
  </>
}

// ---------------- Detalle por correo ----------------

export function DetallePorCorreo({ campanas, resumen, errorResumen, detalle, errorDetalle, foco, limpiarFoco, volver }) {
  const [f, setF] = useState({ ...FILTROS_DETALLE, estado: foco?.estado ?? 'todos' })
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(25)
  const t = useMemo(() => sumarTotales(campanas), [campanas])
  const s = useMemo(() => sumarResumen(campanas, resumen), [campanas, resumen])
  const { nombres, filas } = usarDetalle(campanas, detalle)
  const lista = useMemo(() => filtrarDetalle(filas, f, { nombres }), [filas, f, nombres])
  const p = paginar(lista, pagina, tamano)
  const e = estadoDetalle(f.estado)
  const poner = (k) => (val) => { setF((x) => ({ ...x, [k]: val })); setPagina(1) }
  const elegir = (id) => () => poner('estado')(id)

  const columnas = [
    { label: 'Correo', clase: 'mkv2-celda-correo', celda: (x) => <strong className="mkv2-texto-fuerte">{x.correo}</strong>, valor: (x) => x.correo, ancho: 34 },
    { label: 'Cliente y país', celda: () => <span className="fv2-tenue">{PENDIENTE_CRUCE}</span>, valor: () => PENDIENTE_CRUCE, ancho: 20 },
    { label: 'Ejecutivo', celda: () => <span className="fv2-tenue">{PENDIENTE_CRUCE}</span>, valor: () => PENDIENTE_CRUCE, ancho: 20 },
    { label: 'Campaña', clase: 'mkv2-celda-larga', celda: (x) => nombreCampana(nombres, x.campana_id), valor: (x) => nombreCampana(nombres, x.campana_id), ancho: 36 },
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
    columnas, filas: lista,
    filtros: filtrosTexto(campanas, [['Estado', e.label], ['Status', f.status || 'Todos'], ['Apertura', f.apertura || 'Todas'], ['Clic', f.clic || 'Todos'],
      ['Origen', ORIGEN[f.origen] ?? 'Todos'], ['Búsqueda', f.texto || 'Ninguna']]),
  })

  return <>
    {foco && <Enfoque titulo={`Detalle del indicador · ${e.label}`} detalle={detalleFiltro(campanas)} onTodos={() => { setF(FILTROS_DETALLE); limpiarFoco() }} onVolver={volver} />}
    <AvisoDetalle detalle={detalle} errorDetalle={errorDetalle} />
    {errorResumen && <Aviso titulo="No se pudo leer el resumen de eventos" texto={errorResumen} />}

    <div className="mkv2-minis mkv2-minis5">
      {ESTADOS_DETALLE.filter((x) => x.id !== 'todos').map((x) => <Mini key={x.id} nombre={x.label} valor={numero(x.brevo(t))} color={COLOR_ESTADO[x.id]}
        nota={s.hayDatos ? `Brevo · con detalle: ${numero(x.webhook(s))}` : 'Total de Brevo'} activo={f.estado === x.id} onClick={elegir(x.id)} enlace="Ver" />)}
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
      <Tabla columnas={columnas} filas={p.filas} clave={(x) => `${x.campana_id}|${x.correo}`}
        vacio={detalle?.mostrarCorreos === false ? 'Los correos están ocultos.' : filas.length ? 'Sin resultados con esta búsqueda o filtros.' : TEXTO_WEBHOOK} />
      <Paginacion p={p} onPagina={setPagina} tamano={tamano} onTamano={(n) => { setTamano(n); setPagina(1) }} />
    </Tarjeta>
  </>
}
