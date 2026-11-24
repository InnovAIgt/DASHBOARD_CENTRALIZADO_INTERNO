// Canales de marketing · Mailing · Vista por EJECUTIVO Y TERRITORIO (pedido del ingeniero, MAILING.md secciones 1 y 8).
// Detalle por persona (historial + webhook) cruzado con Cumplimiento de Clientes (SOLO LECTURA): el ejecutivo y el
// país (territorio) salen de la cuenta del cliente. Solo coincidencia exacta; lo demás va a «Sin identificar».
// Arriba, una tarjeta por territorio (clic = filtro País); abajo, una fila por ejecutivo + país, ordenable.
import { useMemo, useState } from 'react'
import { Bandera } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { numero, ordenarPor, pct } from '../../datos/calculos.js'
import { metricasPorTerritorio, NOMBRE_PAIS } from '../../datos/porEjecutivo.js'
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
