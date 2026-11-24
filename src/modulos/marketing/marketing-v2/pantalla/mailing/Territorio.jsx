// Canales de marketing · Mailing · Vista por EJECUTIVO Y TERRITORIO (pedido del ingeniero, MAILING.md secciones 1 y 8).
// Detalle por persona (historial + webhook) cruzado con Cumplimiento de Clientes (SOLO LECTURA): el ejecutivo y el
// país (territorio) salen de la cuenta del cliente. Solo coincidencia exacta; lo demás va a «Sin identificar».
// Arriba, una tarjeta por territorio (clic = filtro País); abajo, una fila por ejecutivo + país, ordenable.
import { useMemo, useState } from 'react'
import { Bandera } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { numero, ordenarPor, pct } from '../../datos/calculos.js'
import { CRUCE_ASESOR, leadsPorEjecutivo, SIN_CRUCE } from '../../datos/leads.js'
import { metricasPorTerritorio, NOMBRE_PAIS } from '../../datos/porEjecutivo.js'
import { EstadoLeads } from './Leads.jsx'
import { Aviso, COLOR_MAILING, COLOR_SEMAFORO, Pct, PildoraEntrega, Tarjeta, TablaOrdenable, TarjetaBajita } from './piezas.jsx'

const COLUMNAS = [
  { id: 'ejecutivo', label: 'Ejecutivo de ventas', clase: 'mkv2-celda-media', valor: (x) => x.ejecutivo,
    celda: (x) => (x.sinIdentificar ? <span className="fv2-tenue" data-tip="Correos sin coincidencia exacta en Cumplimiento de Clientes">{x.ejecutivo}</span> : <strong className="mkv2-texto-fuerte">{x.ejecutivo}</strong>) },
  { id: 'pais', label: 'Territorio', valor: (x) => x.pais,
    celda: (x) => (x.pais === '—' ? <span className="fv2-tenue">—</span> : <span className="fv2-sin-salto"><Bandera pais={x.pais} /> {NOMBRE_PAIS[x.pais] ?? x.pais}</span>) },
  { id: 'cartera', label: 'Cartera', num: true, valor: (x) => x.cartera ?? -1,
    celda: (x) => (x.cartera === null ? <span className="fv2-tenue">—</span> : <span data-tip={`${numero(x.cartera)} clientes asignados en Cumplimiento (${x.pais})`}>{numero(x.cartera)}</span>) },
  { id: 'alcanzados', label: 'Clientes alcanzados', num: true, valor: (x) => x.clientesAlcanzados, celda: (x) => numero(x.clientesAlcanzados) },
  { id: 'enviados', label: 'Destinatarios', num: true, valor: (x) => x.totales.enviados,
    celda: (x) => <span data-tip={`${numero(x.totales.enviados)} filas correo + campaña en ${numero(x.campanas)} ${x.campanas === 1 ? 'campaña' : 'campañas'}`}>{numero(x.totales.enviados)}</span> },
  { id: 'entrega', label: 'Entrega', num: true, valor: (x) => x.tasas.entrega ?? -1, celda: (x) => <PildoraEntrega tasa={x.tasas.entrega} semaforo={x.semaforo} /> },
  { id: 'apertura', label: 'Apertura registrada', num: true, valor: (x) => x.tasas.apertura ?? -1,
    celda: (x) => <span data-tip={`${numero(x.totales.aperturas)} de ${numero(x.totales.entregados)} entregados (sin automáticas de Apple)`}><Pct n={x.tasas.apertura} /></span> },
  { id: 'clic', label: 'Clic', num: true, valor: (x) => x.tasas.clic ?? -1, celda: (x) => <span data-tip={`${numero(x.totales.clics)} de ${numero(x.totales.entregados)} entregados`}><Pct n={x.tasas.clic} /></span> },
  { id: 'corregir', label: 'Por corregir', num: true, valor: (x) => x.totales.corregir,
    celda: (x) => (x.totales.corregir ? <b style={{ color: COLOR_MAILING.duro }} data-tip={`${numero(x.totales.corregir)} direcciones únicas · ${numero(x.totales.casosCorregir)} casos`}>{numero(x.totales.corregir)}</b> : <span className="fv2-tenue">0</span>) },
]

export function PorTerritorio({ filas, carteras, cruce, filtrar, paisFiltro, verCartera }) {
  const { filas: lista, territorios } = useMemo(() => metricasPorTerritorio(filas, carteras), [filas, carteras])
  const [orden, setOrden] = useState({ col: '', dir: 'desc' })
  const col = COLUMNAS.find((c) => c.id === orden.col)
  // Sin orden elegido: por país, luego por destinatarios («Sin identificar» al final).
  const vista = col ? [...ordenarPor(lista.filter((x) => !x.sinIdentificar), col.valor, orden.dir), ...lista.filter((x) => x.sinIdentificar)] : lista
  const cambiar = (id) => setOrden((o) => ({ col: id, dir: o.col === id && o.dir === 'desc' ? 'asc' : 'desc' }))

  return <Tarjeta titulo="Por ejecutivo y territorio" sub="Ejecutivo y país del cliente según Cumplimiento de Clientes (solo lectura) · detalle por persona · clic en un territorio para filtrar el país · clic en una fila para ver su cartera">
    {cruce && cruce !== 'ok'
      ? <Aviso titulo="Pendiente del cruce" texto="No se pudo leer Cumplimiento de Clientes: no se puede separar por ejecutivo ni territorio hasta que responda." />
      : !filas.length
        ? <Aviso icono="info" titulo="Sin detalle por persona" texto="Las campañas filtradas no tienen historial importado ni eventos del webhook." />
        : <>
          <div className="mkv2-bajitas mkv2-territorios">
            {territorios.map((t) => <TarjetaBajita key={t.pais} valor={<Pct n={t.tasas.entrega} />} color={COLOR_SEMAFORO[t.semaforo] ?? COLOR_MAILING.gris}
              titulo={<><Bandera pais={t.pais} /> {NOMBRE_PAIS[t.pais] ?? t.pais}</>}
              sub={`${numero(t.totales.enviados)} destinatarios · ${numero(t.ejecutivos)} ejecutivos`} activo={paisFiltro === t.pais}
              tip={`${NOMBRE_PAIS[t.pais] ?? t.pais}: entrega ${pct(t.tasas.entrega)} · apertura registrada ${pct(t.tasas.apertura)} · clic ${pct(t.tasas.clic)}\n${numero(t.totales.corregir)} direcciones por corregir${t.cartera !== null ? ` · cartera ${numero(t.cartera)} clientes` : ''}\n${paisFiltro === t.pais ? 'Clic para quitar el filtro de país' : 'Clic para ver solo este país'}`}
              onClick={() => filtrar({ pais: paisFiltro === t.pais ? '' : t.pais })} />)}
          </div>
          <TablaOrdenable columnas={COLUMNAS} filas={vista} clave={(x) => `${x.ejecutivo}|${x.pais}`} orden={orden} onOrden={cambiar}
            onFila={(x) => (x.sinIdentificar ? undefined : verCartera(x))} tituloFila={(x) => (x.sinIdentificar ? undefined : `Ver la cartera de ${x.ejecutivo} en Relación con clientes`)}
            vacio="Sin datos con los filtros actuales." />
          <p className="mkv2-nota">Un correo que pertenece a clientes de dos ejecutivos o países cuenta en cada uno; el subtotal por país no lo repite. Cartera = clientes asignados en Cumplimiento a ese ejecutivo en ese país.</p>
        </>}
  </Tarjeta>
}

// ---------- Leads por ejecutivo y territorio (Prospekt) ----------
// El ejecutivo sale de cruzar el ASESOR de Prospekt con los ejecutivos de Cumplimiento (server/mailing/leads.js):
// sin tildes, mayúsculas ni espacios de más; igual o mismas palabras en otro orden = exacta; nombre corto dentro de UN
// solo ejecutivo = posible (en ámbar); lo demás, «Asesor sin cruce». El territorio es el país del lead en Prospekt.
const COLUMNAS_LEADS = [
  { id: 'ejecutivo', label: 'Ejecutivo de ventas', clase: 'mkv2-celda-media', valor: (x) => x.ejecutivo,
    celda: (x) => (x.sinCruce
      ? <span className="fv2-tenue" data-tip={`Asesores de Prospekt sin cruce con Cumplimiento: ${x.asesores.join(', ') || '—'}`}>{SIN_CRUCE}</span>
      : <span data-tip={x.posible ? CRUCE_ASESOR.posible : CRUCE_ASESOR.exacta}><strong className="mkv2-texto-fuerte">{x.ejecutivo}</strong>{x.posible && <small className="mkv2-posible mkv2-posible-etiqueta"> posible</small>}</span>) },
  { id: 'asesor', label: 'Asesor en Prospekt', clase: 'mkv2-celda-media', valor: (x) => x.asesores.join(', '), celda: (x) => x.asesores.join(', ') || <span className="fv2-tenue">—</span> },
  { id: 'pais', label: 'Territorio', valor: (x) => x.pais,
    celda: (x) => (x.pais === '—' ? <span className="fv2-tenue">—</span> : <span className="fv2-sin-salto"><Bandera pais={x.pais} /> {NOMBRE_PAIS[x.pais] ?? x.pais}</span>) },
  { id: 'leads', label: 'Leads', num: true, valor: (x) => x.leads, celda: (x) => <b>{numero(x.leads)}</b> },
  { id: 'exactas', label: 'Exactos', num: true, valor: (x) => x.exactas, celda: (x) => numero(x.exactas) },
  { id: 'estimadas', label: 'Estimados', num: true, valor: (x) => x.estimadas, celda: (x) => numero(x.estimadas) },
  { id: 'cerrados', label: 'Cerrados', num: true, valor: (x) => x.cerrados, celda: (x) => numero(x.cerrados) },
]

/** Leads atribuidos a campañas (exactos + estimados) por ejecutivo y país. filas = leads ya filtrados. */
export function LeadsPorTerritorio({ leads, filas, filtrar, paisFiltro, reintentar }) {
  const { filas: lista, territorios, cruce } = useMemo(() => leadsPorEjecutivo(filas), [filas])
  const [orden, setOrden] = useState({ col: '', dir: 'desc' })
  const col = COLUMNAS_LEADS.find((c) => c.id === orden.col)
  const vista = col ? [...ordenarPor(lista.filter((x) => !x.sinCruce), col.valor, orden.dir), ...lista.filter((x) => x.sinCruce)] : lista
  const cambiar = (id) => setOrden((o) => ({ col: id, dir: o.col === id && o.dir === 'desc' ? 'asc' : 'desc' }))
  const listo = leads.fuente === 'prospekt' && !leads.cargando
  return <Tarjeta titulo="Leads por ejecutivo y territorio" sub="Leads de Prospekt atribuidos a campañas (exactos + estimados) · ejecutivo por el nombre del asesor en Cumplimiento · territorio = país del lead">
    {!listo ? <EstadoLeads leads={leads} reintentar={reintentar} /> : <>
      {territorios.length > 0 && <div className="mkv2-bajitas mkv2-territorios">
        {territorios.map((t) => <TarjetaBajita key={t.pais} valor={numero(t.leads)} color={COLOR_MAILING.clic}
          titulo={t.pais === '—' ? 'Sin país' : <><Bandera pais={t.pais} /> {NOMBRE_PAIS[t.pais] ?? t.pais}</>}
          sub={`${numero(t.exactas)} exactos · ${numero(t.estimadas)} estimados · ${numero(t.cerrados)} cerrados`} activo={paisFiltro === t.pais}
          tip={`${NOMBRE_PAIS[t.pais] ?? t.pais}: ${numero(t.leads)} leads atribuidos\n${paisFiltro === t.pais ? 'Clic para quitar el filtro de país' : 'Clic para ver solo este país'}`}
          onClick={t.pais === '—' ? undefined : () => filtrar({ pais: paisFiltro === t.pais ? '' : t.pais })} />)}
      </div>}
      {lista.length
        ? <TablaOrdenable columnas={COLUMNAS_LEADS} filas={vista} clave={(x) => `${x.ejecutivo}|${x.pais}`} orden={orden} onOrden={cambiar} vacio="" />
        : <Aviso icono="info" titulo="Todavía no hay leads atribuidos a campañas" texto={`De ${numero(filas.length)} leads con los filtros actuales, ninguno quedó como exacto ni estimado. Se llena solo con los leads nuevos.`} />}
      <p className="mkv2-nota">Cruce del asesor con Cumplimiento (todos los leads con los filtros): {numero(cruce.exacta)} con el mismo nombre · {numero(cruce.posible)} posibles (en ámbar) · {numero(cruce.sin_cruce)} sin cruce. Se comparan sin tildes, mayúsculas ni espacios de más; las mismas palabras en otro orden cuentan igual; nunca se adivina por parecido.</p>
    </>}
  </Tarjeta>
}
