// Canales de marketing · Mailing · Comparar campañas (MAILING.md, sección 7). Datos reales de Brevo.
// La comparación por asunto es descriptiva: no prueba que el asunto sea la causa (las audiencias cambian).
import { useMemo, useState } from 'react'
import { COLORES } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { diaGuatemala, fechaCorta, numero, ordenarPor, pct, porCargo, porCorregirCampana, porcentaje } from '../../datos/calculos.js'
import { Aviso, COLOR_SEMAFORO, Enfoque, FilaBarra, Gris, InsigniaCargo, PildoraEntrega, Tarjeta, TablaOrdenable } from './piezas.jsx'

const METRICAS = {
  entrega: { label: 'Tasa de entrega', valor: (c) => c.tasas.entrega, color: (c) => COLOR_SEMAFORO[c.semaforo] },
  apertura: { label: 'Aperturas / entregados (incluye automáticas)', valor: (c) => c.tasas.apertura, color: () => COLORES.azulClaro },
  clic: { label: 'Clics / entregados', valor: (c) => c.tasas.clic, color: () => COLORES.verde },
  rebote: { label: 'Rebotes / enviados', valor: (c) => porcentaje(c.totales.reboteTemporal + c.totales.rebotePermanente, c.totales.enviados), color: () => COLORES.rosa },
  corregir: { label: 'Correos por corregir / enviados (solo con webhook)', valor: null, color: () => COLORES.rojo },
}

function Rendimiento({ campanas, resumen, metricaInicial, verCampana }) {
  const [metrica, setMetrica] = useState(METRICAS[metricaInicial] ? metricaInicial : 'entrega')
  const m = METRICAS[metrica]
  const valor = metrica === 'corregir' ? (c) => porCorregirCampana(c, resumen) : m.valor
  const filas = ordenarPor(campanas.filter((c) => c.estado === 'enviada'), valor).filter((c) => valor(c) !== null)
  return <Tarjeta titulo="Rendimiento de campañas" sub="Una barra por campaña · clic en una campaña para ver solo esa en Resultados generales"
    acciones={<label className="mkv2-campo-linea"><span>Comparar por</span>
      <select className="mkv2-control" value={metrica} onChange={(e) => setMetrica(e.target.value)}>
        {Object.entries(METRICAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select></label>}>
    {filas.length
      ? <div className="mkv2-embudo mkv2-compara">
        {filas.map((c) => <FilaBarra key={c.id} nombre={c.nombre} valor={valor(c)} max={100} color={m.color(c) ?? COLORES.tenue}
          cifra={pct(valor(c))} detalle={`${numero(c.totales.enviados)} enviados`} title={`${c.nombre} · ${c.asunto} · clic para ver solo esta campaña`}
          onClick={() => verCampana(c)} />)}
      </div>
      : <Aviso icono="info" titulo="Sin datos para esta métrica" texto={metrica === 'corregir' ? 'Disponible para campañas enviadas después de activar el webhook.' : 'No hay campañas enviadas con los filtros actuales.'} />}
  </Tarjeta>
}

function PorCargo({ campanas, filtrar }) {
  const filas = porCargo(campanas)
  const columnas = [
    { id: 'cargo', label: 'Cargo', celda: (f) => <InsigniaCargo cargo={f.cargo} /> },
    { id: 'campanas', label: 'Campañas', num: true, celda: (f) => numero(f.campanas) },
    { id: 'enviados', label: 'Enviados', num: true, celda: (f) => numero(f.enviados) },
    { id: 'entregados', label: 'Entregados', num: true, celda: (f) => numero(f.entregados) },
    { id: 'aperturas', label: 'Aperturas', num: true, celda: (f) => numero(f.aperturas) },
    { id: 'clics', label: 'Con clic', num: true, celda: (f) => numero(f.clics) },
    { id: 'rebotes', label: 'Rebotes', num: true, celda: (f) => numero(f.reboteTemporal + f.rebotePermanente) },
    { id: 'entrega', label: '% entrega', num: true, celda: (f) => <PildoraEntrega tasa={f.tasas.entrega} semaforo={f.semaforo} /> },
    { id: 'apertura', label: '% apertura', num: true, celda: (f) => pct(f.tasas.apertura) },
    { id: 'clic', label: '% clic', num: true, celda: (f) => pct(f.tasas.clic) },
  ]
  return <Tarjeta titulo="Resultados por cargo destinatario" sub="Mismas bases: entrega y rebotes sobre enviados; aperturas y clics sobre entregados · clic en un cargo para filtrar">
    <TablaOrdenable columnas={columnas} filas={filas} clave={(f) => f.cargo} vacio="Sin campañas enviadas con los filtros actuales."
      onFila={(f) => filtrar({ cargo: f.cargo })} tituloFila={(f) => `Filtrar por ${f.cargo}`} />
  </Tarjeta>
}

const COLUMNAS_DETALLE = (resumen) => [
  { id: 'campana', label: 'Campaña', clase: 'mkv2-celda-larga', valor: (c) => c.nombre, celda: (c) => <strong className="mkv2-texto-fuerte">{c.nombre}</strong> },
  { id: 'asunto', label: 'Asunto', clase: 'mkv2-celda-larga', valor: (c) => c.asunto, celda: (c) => c.asunto || '—' },
  { id: 'cargo', label: 'Cargo', valor: (c) => c.cargo, celda: (c) => <InsigniaCargo cargo={c.cargo} /> },
  { id: 'envios', label: 'Envíos', num: true, valor: (c) => c.totales.enviados, celda: (c) => numero(c.totales.enviados) },
  { id: 'entrega', label: '% entrega', num: true, valor: (c) => c.tasas.entrega, celda: (c) => <PildoraEntrega tasa={c.tasas.entrega} semaforo={c.semaforo} /> },
  { id: 'apertura', label: '% apertura', num: true, valor: (c) => c.tasas.apertura, celda: (c) => pct(c.tasas.apertura) },
  { id: 'clic', label: '% clic', num: true, valor: (c) => c.tasas.clic, celda: (c) => pct(c.tasas.clic) },
  { id: 'rt', label: '% rebote temporal', num: true, valor: (c) => c.tasas.reboteTemporal, celda: (c) => pct(c.tasas.reboteTemporal) },
  { id: 'rp', label: '% rebote permanente', num: true, valor: (c) => c.tasas.rebotePermanente, celda: (c) => pct(c.tasas.rebotePermanente) },
  { id: 'corregir', label: '% por corregir', num: true, valor: (c) => porCorregirCampana(c, resumen), celda: (c) => <Gris texto={pct(porCorregirCampana(c, resumen))} /> },
  { id: 'fecha', label: 'Fecha de envío', valor: (c) => diaGuatemala(c.fecha), celda: (c) => <span className="fv2-sin-salto">{fechaCorta(c.fecha)}</span> },
]

function Detallada({ campanas, resumen, verCampana }) {
  const [orden, setOrden] = useState({ col: 'fecha', dir: 'desc' })
  const columnas = useMemo(() => COLUMNAS_DETALLE(resumen), [resumen])
  const enviadas = campanas.filter((c) => c.estado === 'enviada')
  const col = columnas.find((c) => c.id === orden.col)
  const filas = col?.valor ? ordenarPor(enviadas, col.valor, orden.dir) : enviadas
  const cambiar = (id) => setOrden((o) => ({ col: id, dir: o.col === id && o.dir === 'desc' ? 'asc' : 'desc' }))
  return <Tarjeta titulo="Comparación detallada" sub="Haz clic en un encabezado para ordenar · entrega y rebotes sobre envíos; aperturas y clics sobre entregados">
    <TablaOrdenable columnas={columnas} filas={filas} clave={(c) => c.id} orden={orden} onOrden={cambiar} vacio="Sin campañas enviadas con los filtros actuales."
      onFila={verCampana} tituloFila={(c) => `Ver solo «${c.nombre}» en Resultados generales`} />
  </Tarjeta>
}

export function CompararCampanas({ campanas, resumen, foco, limpiarFoco, volver, filtrar }) {
  const verCampana = (c) => { filtrar({ campana: String(c.id) }); volver() }
  return <>
    {foco && <Enfoque titulo={foco.titulo ?? 'Comparar campañas'} detalle={`${numero(campanas.length)} campañas según los filtros de arriba`} onTodos={limpiarFoco} onVolver={volver} />}
    <div className="mkv2-hero">
      <div>
        <div className="mkv2-hero-eyebrow">Comparativo</div>
        <h2>Comparativo de campañas y asuntos</h2>
        <p>Compara campañas, cargos y asuntos sin mezclar bases. La comparación por asunto es descriptiva: no prueba que el asunto sea la causa, porque las audiencias cambian.</p>
      </div>
    </div>
    <Rendimiento key={foco?.metrica ?? 'entrega'} campanas={campanas} resumen={resumen} metricaInicial={foco?.metrica} verCampana={verCampana} />
    <PorCargo campanas={campanas} filtrar={filtrar} />
    <Detallada campanas={campanas} resumen={resumen} verCampana={verCampana} />
  </>
}
