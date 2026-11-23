// Canales de marketing · Mailing · Comparar campañas (MAILING.md, sección 7). Datos reales de Brevo.
// Como la maqueta de Comparar (solo se leyó): título con la ganadora, botones de métrica, una TARJETA por campaña
// (medalla en las 3 primeras, asunto arriba y «#id · nombre · fecha» abajo, barra con brillo, meta 90 % en entrega),
// por defecto solo campañas con 20+ envíos (MINIMO_ENVIOS en calculos.js), 10 a la vista y «Ver todas».
// Con menos de 5 entregados: «pocos datos», nunca gana ni lleva medalla.
// La comparación por asunto es descriptiva: no prueba que el asunto sea la causa (las audiencias cambian).
import { useMemo, useState } from 'react'
import { campanasComparables, diaGuatemala, fechaCorta, MINIMO_ENVIOS, NOMBRE_CARGO, numero, ordenarPor, pct, pocosDatos, porCargo, porCorregirCampana, porcentaje } from '../../datos/calculos.js'
import { textosCampana } from '../../datos/campana.js'
import { Aviso, COLOR_MAILING, COLOR_SEMAFORO, Enfoque, FilaBarra, LeyendaSemaforo, Pct, PildoraEntrega, Tarjeta, TablaOrdenable, TituloCampana } from './piezas.jsx'

const VISIBLES = 10
const nombreCargo = (cargo) => NOMBRE_CARGO[cargo] ?? cargo ?? 'Sin clasificar'

/** Métricas: botón, título (con la ganadora), valor, base y color (entrega con semáforo). */
const METRICAS = {
  entrega: { boton: 'Entrega', titulo: 'Mejor entrega', base: 'de enviados', valor: (c) => c.tasas.entrega, color: (c) => COLOR_SEMAFORO[c.semaforo] ?? COLOR_MAILING.gris },
  apertura: { boton: 'Apertura', titulo: 'Mejor apertura', base: 'de entregados', valor: (c) => c.tasas.apertura, color: () => COLOR_MAILING.apertura },
  clic: { boton: 'Clic', titulo: 'Mejor clic', base: 'de entregados', valor: (c) => c.tasas.clic, color: () => COLOR_MAILING.clic },
  rebote: { boton: 'Rebotes', titulo: 'Más rebotes', base: 'de enviados', valor: (c) => porcentaje(c.totales.reboteTemporal + c.totales.rebotePermanente, c.totales.enviados), color: () => COLOR_MAILING.duro },
  corregir: { boton: 'Por corregir', titulo: 'Más por corregir', base: 'de enviados', valor: null, color: () => COLOR_MAILING.duro },
}

/** Una tarjeta de campaña en el ranking. */
function TarjetaRanking({ c, pos, valor, maximo, m, metrica, medalla, onClick }) {
  const color = m.color(c)
  const t = textosCampana(c)
  const pocos = pocosDatos(c)
  return <button type="button" className="mkv2-rank" style={{ '--a': color, animationDelay: `${Math.min(pos, 12) * 0.04}s` }} onClick={onClick}
    data-tip={`${t.titulo}\n${t.linea}\n${m.titulo.replace(/^(Mejor|Más) /, '')}: ${pct(valor)} ${m.base} · ${numero(c.totales.enviados)} enviados${pocos ? ' · pocos datos' : ''} — clic para ver solo esta campaña`}>
    <span className={`mkv2-rank-pos ${medalla ? `is-m${pos}` : ''}`}>{pos}</span>
    <span className="mkv2-rank-nombre">
      <TituloCampana campana={c} grande />
      <span className="mkv2-rank-chips">
        <span className="mkv2-chip is-cargo">{nombreCargo(c.cargo)}</span>
        <span className="mkv2-chip">{numero(c.totales.enviados)} enviados</span>
        {pocos && <span className="mkv2-chip is-pocos">pocos datos</span>}
      </span>
    </span>
    <span className="mkv2-rank-pista">
      <i style={{ width: `${Math.max(1, Math.min(100, (valor / maximo) * 100))}%` }} />
      {metrica === 'entrega' && <b className="mkv2-meta" style={{ left: '90%' }} aria-hidden="true" />}
    </span>
    <span className="mkv2-rank-valor"><b><Pct n={valor} /></b><small>{m.base}</small></span>
  </button>
}

function Rendimiento({ lista, pequenas, incluir, setIncluir, resumen, metricaInicial, verCampana }) {
  const [metrica, setMetrica] = useState(METRICAS[metricaInicial] ? metricaInicial : 'entrega')
  const [todas, setTodas] = useState(false)
  const m = METRICAS[metrica]
  const valor = metrica === 'corregir' ? (c) => porCorregirCampana(c, resumen) : m.valor
  const filas = ordenarPor(lista.filter((c) => valor(c) !== null), valor)
  const ganadora = filas.find((c) => !pocosDatos(c))
  const maximo = metrica === 'entrega' ? 100 : Math.max(...filas.map(valor), 0) * 1.1 || 1
  const vista = todas ? filas : filas.slice(0, VISIBLES)
  // Medallas: las 3 primeras posiciones, solo si no son «pocos datos».
  const medalla = (c, i) => i < 3 && !pocosDatos(c)
  // Cuadritos: mejor entrega, mejor apertura y entrega más baja (sin «pocos datos»).
  const solidas = lista.filter((c) => !pocosDatos(c))
  const porEntrega = ordenarPor(solidas.filter((c) => c.tasas.entrega !== null), (c) => c.tasas.entrega)
  const porApertura = ordenarPor(solidas.filter((c) => c.tasas.apertura !== null), (c) => c.tasas.apertura)
  const cuadritos = [
    { titulo: 'Mejor entrega', c: porEntrega[0], v: (c) => c.tasas.entrega, color: COLOR_MAILING.entregados, claro: '#6fd3a6' },
    { titulo: 'Mejor apertura', c: porApertura[0], v: (c) => c.tasas.apertura, color: COLOR_MAILING.apertura, claro: '#8fc4f0' },
    { titulo: 'Entrega más baja', c: porEntrega.at(-1), v: (c) => c.tasas.entrega, color: COLOR_MAILING.duro, claro: '#ff8a99' },
  ]

  return <Tarjeta titulo={ganadora ? `${m.titulo}: «${textosCampana(ganadora).titulo}» (${pct(valor(ganadora))})` : m.titulo}
    sub="Una barra por campaña, de mayor a menor · clic para ver solo esa campaña · Totales de Brevo: no se separan por país"
    acciones={<div className="mkv2-segmento" role="tablist" aria-label="Comparar por">
      {Object.entries(METRICAS).map(([k, v]) => <button key={k} type="button" role="tab" aria-selected={metrica === k}
        className={metrica === k ? 'is-activo' : ''} onClick={() => setMetrica(k)}>{v.boton}</button>)}
    </div>}>
    <div className="mkv2-rank-herramientas">
      <button type="button" role="switch" aria-checked={incluir} className={`mkv2-interruptor-pill ${incluir ? 'is-on' : ''}`} onClick={() => { setIncluir(!incluir); setTodas(false) }}>
        <i aria-hidden="true" />Incluir campañas pequeñas ({numero(pequenas)})
      </button>
      {metrica === 'entrega' && <LeyendaSemaforo />}
    </div>
    {vista.length
      ? <div className="mkv2-rank-lista">
        {vista.map((c, i) => <TarjetaRanking key={`${metrica}-${c.id}`} c={c} pos={i + 1} valor={valor(c)} maximo={maximo} m={m} metrica={metrica}
          medalla={medalla(c, i)} onClick={() => verCampana(c)} />)}
      </div>
      : <Aviso icono="info" titulo="Sin datos para esta métrica" texto={metrica === 'corregir' ? 'Disponible para campañas con historial importado o enviadas después de activar el webhook.' : 'No hay campañas enviadas con los filtros actuales.'} />}
    {filas.length > VISIBLES && <div className="mkv2-ver-mas">
      <button type="button" className="fv2-pildora" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : `Ver todas (${numero(filas.length)})`}</button>
    </div>}
    <p className="mkv2-nota mkv2-pie">Una diferencia entre asuntos no demuestra por sí sola que un asunto causó mejores resultados: las audiencias y los tamaños de campaña pueden ser diferentes.</p>
    <div className="mkv2-cuadritos">
      {cuadritos.map((q) => <button type="button" key={q.titulo} className="mkv2-cuadrito" style={{ '--c': q.color, '--c2': q.claro }} disabled={!q.c}
        onClick={q.c ? () => verCampana(q.c) : undefined} data-tip={q.c ? `${q.titulo}: ${textosCampana(q.c).unaLinea} · ${pct(q.v(q.c))}` : undefined}>
        <small>{q.titulo}</small>
        {q.c ? <><TituloCampana campana={q.c} fecha={false} /><span className="mkv2-cuadrito-num"><Pct n={q.v(q.c)} /></span></> : <span className="fv2-tenue">Sin datos</span>}
      </button>)}
    </div>
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
  { id: 'campana', label: 'Campaña', clase: 'mkv2-celda-campana', valor: (c) => textosCampana(c).titulo, celda: (c) => <TituloCampana campana={c} fecha={false} /> },
  { id: 'cargo', label: 'Cargo', valor: (c) => nombreCargo(c.cargo), celda: (c) => nombreCargo(c.cargo) },
  { id: 'envios', label: 'Envíos', num: true, valor: (c) => c.totales.enviados, celda: (c) => numero(c.totales.enviados) },
  { id: 'entrega', label: '% entrega', num: true, valor: (c) => c.tasas.entrega, celda: (c) => <PildoraEntrega tasa={c.tasas.entrega} semaforo={c.semaforo} /> },
  { id: 'apertura', label: '% apertura registrada', num: true, valor: (c) => c.tasas.apertura, celda: (c) => pct(c.tasas.apertura) },
  { id: 'clic', label: '% clic', num: true, valor: (c) => c.tasas.clic, celda: (c) => pct(c.tasas.clic) },
  { id: 'rt', label: '% rebote temporal', num: true, valor: (c) => c.tasas.reboteTemporal, celda: (c) => pct(c.tasas.reboteTemporal) },
  { id: 'rp', label: '% rebote duro', num: true, valor: (c) => c.tasas.rebotePermanente, celda: (c) => pct(c.tasas.rebotePermanente) },
  { id: 'fecha', label: 'Fecha envío', valor: (c) => diaGuatemala(c.fecha), celda: (c) => <span className="fv2-sin-salto">{fechaCorta(c.fecha)}</span> },
]

function Detallada({ lista, verCampana }) {
  const [orden, setOrden] = useState({ col: 'fecha', dir: 'desc' })
  const [todas, setTodas] = useState(false)
  const col = COLUMNAS_DETALLE.find((c) => c.id === orden.col)
  const filas = col?.valor ? ordenarPor(lista, col.valor, orden.dir) : lista
  const cambiar = (id) => setOrden((o) => ({ col: id, dir: o.col === id && o.dir === 'desc' ? 'asc' : 'desc' }))
  return <Tarjeta titulo="Comparación detallada" sub="Porcentajes de entrega y rebote sobre envíos; aperturas y clics sobre entregados">
    <TablaOrdenable columnas={COLUMNAS_DETALLE} filas={todas ? filas : filas.slice(0, VISIBLES)} clave={(c) => c.id} orden={orden} onOrden={cambiar} vacio="Sin datos para comparar."
      onFila={verCampana} tituloFila={(c) => `Ver solo «${textosCampana(c).corto}» en Resultados generales`} />
    {filas.length > VISIBLES && <div className="mkv2-ver-mas">
      <button type="button" className="fv2-pildora" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : `Ver todas (${numero(filas.length)})`}</button>
    </div>}
  </Tarjeta>
}

export function CompararCampanas({ campanas, resumen, foco, limpiarFoco, volver, filtrar }) {
  const verCampana = (c) => { filtrar({ campana: String(c.id) }); volver() }
  const [incluir, setIncluir] = useState(false)
  const { lista, pequenas } = useMemo(() => campanasComparables(campanas, incluir), [campanas, incluir])
  return <>
    {foco && <Enfoque titulo={foco.titulo ?? 'Comparar campañas'} detalle={`${numero(campanas.length)} campañas según los filtros de arriba`} onTodos={limpiarFoco} onVolver={volver} />}
    <div className="mkv2-hero">
      <h2>Comparativo de campañas y asuntos</h2>
      <p>Compara campañas, cargos y asuntos sin mezclar denominadores ni duplicar destinatarios.</p>
    </div>
    <div className="mkv2-comparando">
      {lista.length === 0 ? 'No hay campañas con esos filtros.'
        : lista.length === 1 ? 'Actualmente solo hay una campaña para esta selección. Cuando agregues otras, aparecerán aquí las comparaciones reales por asunto y cargo.'
          : <>Comparando <b>{numero(lista.length)} campañas</b>{incluir ? '' : ` (con ${MINIMO_ENVIOS} envíos o más)`}. Cada tasa utiliza el denominador indicado.</>}
    </div>
    <Rendimiento key={foco?.metrica ?? 'entrega'} lista={lista} pequenas={pequenas} incluir={incluir} setIncluir={setIncluir} resumen={resumen} metricaInicial={foco?.metrica} verCampana={verCampana} />
    <PorCargo campanas={campanas} filtrar={filtrar} />
    <Detallada lista={lista} verCampana={verCampana} />
  </>
}
