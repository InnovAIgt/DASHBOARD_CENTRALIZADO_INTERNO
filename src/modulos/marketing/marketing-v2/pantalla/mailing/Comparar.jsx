// Canales de marketing · Mailing · Comparar campañas (MAILING.md, sección 7). Datos reales de Brevo.
// Misma estructura, columnas y textos que la referencia visual (renderComparison), con el tema negro:
// recuadro inicial y aviso, «Rendimiento de campañas» (una barra por campaña, «#id · asunto» y cargo debajo),
// «Resultados por cargo destinatario» (semáforo y meta de 90 %) y «Comparación detallada».
// La comparación por asunto es descriptiva: no prueba que el asunto sea la causa (las audiencias cambian).
import { useMemo, useState } from 'react'
import { Insignia } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { diaGuatemala, fechaCorta, NOMBRE_CARGO, numero, ordenarPor, pct, porCargo, porCorregirCampana, porcentaje } from '../../datos/calculos.js'
import { Aviso, COLOR_MAILING, COLOR_SEMAFORO, Enfoque, FilaBarra, LeyendaSemaforo, Pct, PildoraEntrega, Tarjeta, TablaOrdenable } from './piezas.jsx'

const nombreCargo = (cargo) => NOMBRE_CARGO[cargo] ?? cargo ?? 'Sin clasificar'
/** «#74 · asunto» (o el nombre si no hay asunto): las campañas viejas tienen nombres largos. */
const titulo = (c) => `#${c.id} · ${c.asunto || c.nombre}`

const METRICAS = {
  entrega: { label: 'Tasa de entrega', valor: (c) => c.tasas.entrega, color: (c) => COLOR_SEMAFORO[c.semaforo] ?? COLOR_MAILING.gris },
  apertura: { label: 'Aperturas registradas / entregados', valor: (c) => c.tasas.apertura, color: () => COLOR_MAILING.apertura },
  clic: { label: 'Clics / entregados', valor: (c) => c.tasas.clic, color: () => COLOR_MAILING.clic },
  rebote: { label: 'Rebotes / enviados', valor: (c) => porcentaje(c.totales.reboteTemporal + c.totales.rebotePermanente, c.totales.enviados), color: () => COLOR_MAILING.duro },
  corregir: { label: 'Correos por corregir / enviados', valor: null, color: () => COLOR_MAILING.duro },
}

/** Nombre de una fila de barra: «#id · asunto» en negrita (cortado con «…») y el cargo pequeño debajo. */
function NombreCampana({ c }) {
  return <span className="mkv2-compara-nombre"><strong>{titulo(c)}</strong><small>{nombreCargo(c.cargo)}</small></span>
}

function Rendimiento({ campanas, resumen, metricaInicial, verCampana }) {
  const [metrica, setMetrica] = useState(METRICAS[metricaInicial] ? metricaInicial : 'entrega')
  const m = METRICAS[metrica]
  const valor = metrica === 'corregir' ? (c) => porCorregirCampana(c, resumen) : m.valor
  const filas = ordenarPor(campanas.filter((c) => c.estado === 'enviada'), valor).filter((c) => valor(c) !== null)
  return <Tarjeta titulo="Rendimiento de campañas" sub="Una barra por campaña · métrica seleccionada"
    acciones={<label className="mkv2-campo-linea"><span>Comparar por</span>
      <select className="mkv2-control" value={metrica} onChange={(e) => setMetrica(e.target.value)}>
        {Object.entries(METRICAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select></label>}>
    {filas.length
      ? <div className="mkv2-embudo mkv2-compara">
        {filas.map((c) => <FilaBarra key={c.id} nombre={<NombreCampana c={c} />} valor={valor(c)} max={100} color={m.color(c)}
          cifra={<Pct n={valor(c)} />} tip={`${titulo(c)} · ${nombreCargo(c.cargo)} · ${m.label}: ${pct(valor(c))} · ${numero(c.totales.enviados)} enviados — clic para ver solo esta campaña`}
          onClick={() => verCampana(c)} />)}
      </div>
      : <Aviso icono="info" titulo="Sin datos para esta métrica" texto={metrica === 'corregir' ? 'Disponible para campañas con historial importado o enviadas después de activar el webhook.' : 'No hay campañas enviadas con los filtros actuales.'} />}
    <p className="mkv2-nota">Una diferencia entre asuntos no demuestra por sí sola que un asunto causó mejores resultados: las audiencias y los tamaños de campaña pueden ser diferentes.</p>
  </Tarjeta>
}

function PorCargo({ campanas, filtrar }) {
  const filas = porCargo(campanas)
  const columnas = [
    { id: 'cargo', label: 'Cargo', celda: (f) => <strong className="mkv2-texto-fuerte">{nombreCargo(f.cargo)}</strong> },
    { id: 'campanas', label: 'Campañas', num: true, celda: (f) => numero(f.campanas) },
    { id: 'enviados', label: 'Enviados', num: true, celda: (f) => numero(f.enviados) },
    { id: 'entregados', label: 'Entregados', num: true, celda: (f) => numero(f.entregados) },
    { id: 'aperturas', label: 'Abiertos registrados', num: true, celda: (f) => numero(f.aperturas) },
    { id: 'clics', label: 'Con clic', num: true, celda: (f) => numero(f.clics) },
    { id: 'rebotes', label: 'Rebotes', num: true, celda: (f) => numero(f.reboteTemporal + f.rebotePermanente) },
    { id: 'entrega', label: '% entrega', num: true, celda: (f) => <PildoraEntrega tasa={f.tasas.entrega} semaforo={f.semaforo} /> },
    { id: 'apertura', label: '% apertura', num: true, celda: (f) => pct(f.tasas.apertura) },
    { id: 'clic', label: '% clic', num: true, celda: (f) => pct(f.tasas.clic) },
  ]
  return <Tarjeta titulo="Resultados por cargo destinatario" sub="Comparación de Gerente General, Gerente Financiero y Gerente de Operaciones cuando existan campañas cargadas para cada cargo">
    <div className="mkv2-embudo mkv2-embudo-cargo">
      {filas.map((f) => <FilaBarra key={f.cargo} nombre={nombreCargo(f.cargo)} valor={f.tasas.entrega ?? 0} max={100} meta={90}
        color={COLOR_SEMAFORO[f.semaforo] ?? COLOR_MAILING.gris} cifra={<Pct n={f.tasas.entrega} />} detalle="entrega"
        tip={`${nombreCargo(f.cargo)}: ${pct(f.tasas.entrega)} de entrega (${numero(f.entregados)} de ${numero(f.enviados)}) · meta 90 % — clic para filtrar`}
        onClick={() => filtrar({ cargo: f.cargo })} />)}
    </div>
    <LeyendaSemaforo />
    <div className="mkv2-espacio" />
    <TablaOrdenable columnas={columnas} filas={filas} clave={(f) => f.cargo} vacio="Sin cargos para comparar."
      onFila={(f) => filtrar({ cargo: f.cargo })} tituloFila={(f) => `Filtrar por ${nombreCargo(f.cargo)}`} />
  </Tarjeta>
}

const COLUMNAS_DETALLE = [
  { id: 'campana', label: 'Campaña', valor: (c) => c.id, celda: (c) => <Insignia tono="azul" title={c.nombre}>#{c.id}</Insignia> },
  { id: 'asunto', label: 'Asunto', clase: 'mkv2-celda-asunto', valor: (c) => c.asunto || c.nombre,
    celda: (c) => <span className="mkv2-recorte mkv2-texto-fuerte" data-tip={`${c.asunto || '—'} · ${c.nombre}`}>{c.asunto || c.nombre}</span> },
  { id: 'cargo', label: 'Cargo', valor: (c) => nombreCargo(c.cargo), celda: (c) => nombreCargo(c.cargo) },
  { id: 'envios', label: 'Envíos', num: true, valor: (c) => c.totales.enviados, celda: (c) => numero(c.totales.enviados) },
  { id: 'entrega', label: '% entrega', num: true, valor: (c) => c.tasas.entrega, celda: (c) => <PildoraEntrega tasa={c.tasas.entrega} semaforo={c.semaforo} /> },
  { id: 'apertura', label: '% apertura registrada', num: true, valor: (c) => c.tasas.apertura, celda: (c) => pct(c.tasas.apertura) },
  { id: 'clic', label: '% clic', num: true, valor: (c) => c.tasas.clic, celda: (c) => pct(c.tasas.clic) },
  { id: 'rt', label: '% rebote temporal', num: true, valor: (c) => c.tasas.reboteTemporal, celda: (c) => pct(c.tasas.reboteTemporal) },
  { id: 'rp', label: '% rebote duro', num: true, valor: (c) => c.tasas.rebotePermanente, celda: (c) => pct(c.tasas.rebotePermanente) },
  { id: 'fecha', label: 'Fecha envío', valor: (c) => diaGuatemala(c.fecha), celda: (c) => <span className="fv2-sin-salto">{fechaCorta(c.fecha)}</span> },
]

function Detallada({ campanas, verCampana }) {
  const [orden, setOrden] = useState({ col: 'fecha', dir: 'desc' })
  const enviadas = campanas.filter((c) => c.estado === 'enviada')
  const col = COLUMNAS_DETALLE.find((c) => c.id === orden.col)
  const filas = col?.valor ? ordenarPor(enviadas, col.valor, orden.dir) : enviadas
  const cambiar = (id) => setOrden((o) => ({ col: id, dir: o.col === id && o.dir === 'desc' ? 'asc' : 'desc' }))
  return <Tarjeta titulo="Comparación detallada" sub="Porcentajes de entrega y rebote sobre envíos; aperturas y clics sobre entregados">
    <TablaOrdenable columnas={COLUMNAS_DETALLE} filas={filas} clave={(c) => c.id} orden={orden} onOrden={cambiar} vacio="Sin datos para comparar."
      onFila={verCampana} tituloFila={(c) => `Ver solo «#${c.id}» en Resultados generales`} />
  </Tarjeta>
}

export function CompararCampanas({ campanas, resumen, foco, limpiarFoco, volver, filtrar }) {
  const verCampana = (c) => { filtrar({ campana: String(c.id) }); volver() }
  const enviadas = useMemo(() => campanas.filter((c) => c.estado === 'enviada').length, [campanas])
  return <>
    {foco && <Enfoque titulo={foco.titulo ?? 'Comparar campañas'} detalle={`${numero(campanas.length)} campañas según los filtros de arriba`} onTodos={limpiarFoco} onVolver={volver} />}
    <div className="mkv2-hero">
      <h2>Comparativo de campañas y asuntos</h2>
      <p>Compara campañas, cargos y asuntos sin mezclar denominadores ni duplicar destinatarios.</p>
    </div>
    <div className="mkv2-comparando">
      {enviadas === 0 ? 'No hay campañas con esos filtros.'
        : enviadas === 1 ? 'Actualmente solo hay una campaña para esta selección. Cuando agregues otras, aparecerán aquí las comparaciones reales por asunto y cargo.'
          : `Comparando ${numero(enviadas)} campañas. Cada tasa utiliza el denominador indicado.`}
    </div>
    <Rendimiento key={foco?.metrica ?? 'entrega'} campanas={campanas} resumen={resumen} metricaInicial={foco?.metrica} verCampana={verCampana} />
    <PorCargo campanas={campanas} filtrar={filtrar} />
    <Detallada campanas={campanas} verCampana={verCampana} />
  </>
}
