// Canales de marketing · Mailing · Campañas (comparar). Datos reales.
// DOS GRÁFICAS LADO A LADO con el mismo estilo de tarjetas (lugar 1-2-3 con medalla, barra con brillo, % grande,
// etiquetas y meta 90 % en entrega) y UN solo selector de métrica que cambia las dos:
//   · «Por campaña»: totales de Brevo (no se separan por país). Título «#id · NOMBRE»; debajo el asunto, pequeño.
//     Por defecto solo campañas con 20+ envíos (MINIMO_ENVIOS en calculos.js), 10 a la vista y «Ver todas».
//   · «Por comercial»: detalle por persona (historial + webhook) cruzado con Cumplimiento (solo lectura); solo
//     coincidencia exacta; «Sin identificar» al final, en gris. Sí cambia con el filtro de País.
// Al hacer clic en una tarjeta, su detalle se abre AHÍ MISMO, debajo (acordeón); otro clic lo cierra; uno por gráfica.
// Con menos de 5 entregados: «pocos datos», nunca gana ni lleva medalla.
// La comparación por asunto es descriptiva: no prueba que el asunto sea la causa (las audiencias cambian).
import { useCallback, useMemo, useState } from 'react'
import { campanasComparables, diaGuatemala, fechaCorta, MINIMO_ENTREGADOS, MINIMO_ENVIOS, NOMBRE_CARGO, numero, ordenarPor, pct, pocosDatos, porCargo, porCorregirCampana, porcentaje } from '../../datos/calculos.js'
import { limpiarCampo, textosCampana } from '../../datos/campana.js'
import { metricasPorEjecutivo, SIN_IDENTIFICAR, textoPaises } from '../../datos/porEjecutivo.js'
import { DetalleCampana } from './DetalleCampana.jsx'
import { DetalleEjecutivo } from './DetalleEjecutivo.jsx'
import { Aviso, COLOR_MAILING, COLOR_SEMAFORO, Enfoque, FilaBarra, LeyendaSemaforo, Pct, PildoraEntrega, Tarjeta, TablaOrdenable, TituloCampana } from './piezas.jsx'

const VISIBLES = 10
const nombreCargo = (cargo) => NOMBRE_CARGO[cargo] ?? cargo ?? 'Sin clasificar'
/** Sin emojis (los asuntos a veces los traen). */
const sinEmojis = (t) => String(t ?? '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim()

/** Métricas: botón, título (con la ganadora), base, color y valor para campaña (Brevo) y para ejecutivo (detalle). */
const METRICAS = {
  entrega: { boton: 'Entrega', titulo: 'Mejor entrega', base: 'de enviados', campana: (c) => c.tasas.entrega, ejecutivo: (e) => e.tasas.entrega, color: (x) => COLOR_SEMAFORO[x.semaforo] ?? COLOR_MAILING.gris },
  apertura: { boton: 'Apertura', titulo: 'Mejor apertura', base: 'de entregados', campana: (c) => c.tasas.apertura, ejecutivo: (e) => e.tasas.apertura, color: () => COLOR_MAILING.apertura },
  clic: { boton: 'Clic', titulo: 'Mejor clic', base: 'de entregados', campana: (c) => c.tasas.clic, ejecutivo: (e) => e.tasas.clic, color: () => COLOR_MAILING.clic },
  rebote: { boton: 'Rebotes', titulo: 'Más rebotes', base: 'de enviados', campana: (c) => porcentaje(c.totales.reboteTemporal + c.totales.rebotePermanente, c.totales.enviados), ejecutivo: (e) => e.tasas.rebote, color: () => COLOR_MAILING.duro },
  corregir: { boton: 'Por corregir', titulo: 'Más por corregir', base: 'de enviados', campana: null, ejecutivo: (e) => e.tasas.corregir, color: () => COLOR_MAILING.duro },
}
const GRIS = COLOR_MAILING.gris

/**
 * Tarjeta del ranking (mismo estilo en las dos gráficas) + su acordeón: si está abierta, el detalle va justo debajo,
 * unido con el mismo borde dorado.
 */
function TarjetaRanking({ pos, medalla, color, titulo, sub, chips, valor, maximo, metrica, base, abierta, onClick, tip, children }) {
  return <div className={`mkv2-rank-item ${abierta ? 'is-abierta' : ''}`}>
    <button type="button" className="mkv2-rank is-compacta" style={{ '--a': color, animationDelay: `${Math.min(pos, 12) * 0.04}s` }}
      onClick={onClick} aria-expanded={abierta} data-tip={tip}>
      <span className={`mkv2-rank-pos ${medalla ? `is-m${pos}` : ''}`}>{pos}</span>
      <span className="mkv2-rank-nombre">
        <span className="mkv2-tc is-grande"><strong className="mkv2-tc-titulo">{titulo}</strong>{sub && <small className="mkv2-tc-linea">{sub}</small>}</span>
        <span className="mkv2-rank-chips">{chips}</span>
        <span className="mkv2-rank-pista">
          <i style={{ width: `${Math.max(1, Math.min(100, ((valor ?? 0) / maximo) * 100))}%` }} />
          {metrica === 'entrega' && <b className="mkv2-meta" style={{ left: '90%' }} aria-hidden="true" />}
        </span>
      </span>
      <span className="mkv2-rank-valor"><b><Pct n={valor} /></b><small>{base}</small></span>
    </button>
    {abierta && <div className="mkv2-acordeon" role="region">{children}</div>}
  </div>
}

/** Encabezado de cada gráfica: conclusión (con la ganadora) y fuente. */
function Cabeza({ titulo, fuente, nota }) {
  return <div className="mkv2-grafica-cabeza">
    <h3>{titulo}</h3>
    <p>{fuente}{nota && <> · <b>{nota}</b></>}</p>
  </div>
}

function GraficaCampanas({ lista, pequenas, incluir, setIncluir, metrica, resumen, verCampana, verCorreos, filasDe }) {
  const m = METRICAS[metrica]
  const [todas, setTodas] = useState(false)
  const [abierta, setAbierta] = useState(null)
  const valor = metrica === 'corregir' ? (c) => porCorregirCampana(c, resumen) : m.campana
  const filas = ordenarPor(lista.filter((c) => valor(c) !== null), valor)
  const ganadora = filas.find((c) => !pocosDatos(c))
  const maximo = metrica === 'entrega' ? 100 : Math.max(...filas.map(valor), 0) * 1.1 || 1
  const vista = todas ? filas : filas.slice(0, VISIBLES)
  const titulo = (c) => `#${c.id} · ${limpiarCampo(c.nombre) || textosCampana(c).titulo}`
  return <section className="mkv2-grafica">
    <Cabeza titulo={ganadora ? `${m.titulo}: «${titulo(ganadora)}» (${pct(valor(ganadora))})` : `${m.titulo}: sin datos`}
      fuente="Por campaña · Totales de Brevo" nota="Totales de Brevo: no se separan por país" />
    <button type="button" role="switch" aria-checked={incluir} className={`mkv2-interruptor-pill ${incluir ? 'is-on' : ''}`} onClick={() => { setIncluir(!incluir); setTodas(false) }}>
      <i aria-hidden="true" />Incluir campañas pequeñas ({numero(pequenas)})
    </button>
    {vista.length
      ? <div className="mkv2-rank-lista">
        {vista.map((c, i) => {
          const pocos = pocosDatos(c)
          const asunto = sinEmojis(textosCampana(c).asunto)
          return <TarjetaRanking key={`${metrica}-${c.id}`} pos={i + 1} medalla={i < 3 && !pocos} color={m.color(c)} metrica={metrica} base={m.base}
            titulo={titulo(c)} sub={asunto || undefined} valor={valor(c)} maximo={maximo} abierta={abierta === c.id}
            onClick={() => setAbierta(abierta === c.id ? null : c.id)}
            tip={`${titulo(c)}\n${asunto}\n${m.boton}: ${pct(valor(c))} ${m.base} · ${numero(c.totales.enviados)} enviados${pocos ? ' · pocos datos' : ''}\nClic para ver el detalle`}
            chips={<>
              <span className="mkv2-chip is-cargo">{nombreCargo(c.cargo)}</span>
              <span className="mkv2-chip">{numero(c.totales.enviados)} enviados</span>
              <span className="mkv2-chip">{fechaCorta(c.fecha)}</span>
              {pocos && <span className="mkv2-chip is-pocos">pocos datos</span>}
            </>}>
            <DetalleCampana c={c} filas={filasDe(c.id)} verCampana={verCampana} verCorreos={verCorreos} />
          </TarjetaRanking>
        })}
      </div>
      : <Aviso icono="info" titulo="Sin datos para esta métrica" texto={metrica === 'corregir' ? 'Disponible para campañas con historial importado o enviadas después de activar el webhook.' : 'No hay campañas enviadas con los filtros actuales.'} />}
    {filas.length > VISIBLES && <div className="mkv2-ver-mas">
      <button type="button" className="fv2-pildora" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : `Ver todas (${numero(filas.length)})`}</button>
    </div>}
  </section>
}

function GraficaComerciales({ ejecutivos, campanasConDetalle, metrica, cruce, hayCartera, campanaDe, verCartera }) {
  const m = METRICAS[metrica]
  const [todas, setTodas] = useState(false)
  const [abierta, setAbierta] = useState(null)
  const valor = m.ejecutivo
  const pocos = (e) => e.totales.entregados < MINIMO_ENTREGADOS
  const conValor = ejecutivos.filter((e) => valor(e) !== null)
  // Ordenadas de mayor a menor; «Sin identificar» siempre al final.
  const filas = [...ordenarPor(conValor.filter((e) => !e.sinIdentificar), valor), ...conValor.filter((e) => e.sinIdentificar)]
  const ganadora = filas.find((e) => !e.sinIdentificar && !pocos(e))
  const maximo = metrica === 'entrega' ? 100 : Math.max(...filas.map(valor), 0) * 1.1 || 1
  const vista = todas ? filas : filas.slice(0, VISIBLES)
  const cartera = (e) => (e.sinIdentificar ? 'Correos sin cliente identificado' : e.cartera != null ? `Cartera de ${numero(e.cartera)} clientes` : `${numero(e.clientesAlcanzados)} clientes alcanzados`)
  return <section className="mkv2-grafica">
    <Cabeza titulo={ganadora ? `${m.titulo}: ${ganadora.ejecutivo} (${pct(valor(ganadora))})` : `${m.titulo}: sin datos`}
      fuente={`Por comercial · Detalle por persona · ${numero(campanasConDetalle)} ${campanasConDetalle === 1 ? 'campaña' : 'campañas'}`}
      nota={hayCartera ? undefined : 'Cartera no disponible: se muestran los clientes alcanzados'} />
    <p className="mkv2-nota mkv2-grafica-nota">Solo coincidencia exacta con Cumplimiento de Clientes; los posibles por dominio y los que no están en la base quedan en «Sin identificar».</p>
    {cruce && cruce !== 'ok'
      ? <Aviso titulo="Pendiente del cruce" texto="No se pudo leer Cumplimiento de Clientes: no se puede separar por comercial hasta que responda." />
      : vista.length
        ? <div className="mkv2-rank-lista">
          {vista.map((e, i) => {
            const gris = e.sinIdentificar
            return <TarjetaRanking key={`${metrica}-${e.ejecutivo}`} pos={gris ? '—' : i + 1} medalla={!gris && i < 3 && !pocos(e)} color={gris ? GRIS : m.color(e)} metrica={metrica} base={m.base}
              titulo={e.ejecutivo} sub={cartera(e)} valor={valor(e)} maximo={maximo} abierta={abierta === e.ejecutivo}
              onClick={() => setAbierta(abierta === e.ejecutivo ? null : e.ejecutivo)}
              tip={`${e.ejecutivo}\n${cartera(e)}\n${m.boton}: ${pct(valor(e))} ${m.base} · ${numero(e.totales.enviados)} enviados a su cartera en ${numero(e.campanas.length)} campañas${pocos(e) ? ' · pocos datos' : ''}\nClic para ver el detalle`}
              chips={<>
                {textoPaises(e.paises) && <span className="mkv2-chip is-cargo">{textoPaises(e.paises)}</span>}
                <span className="mkv2-chip">{numero(e.totales.enviados)} enviados</span>
                {pocos(e) && <span className="mkv2-chip is-pocos">pocos datos</span>}
              </>}>
              <DetalleEjecutivo e={e} campanaDe={campanaDe} verCartera={verCartera} />
            </TarjetaRanking>
          })}
        </div>
        : <Aviso icono="info" titulo="Sin detalle por persona" texto="No hay campañas con historial importado o webhook en los filtros actuales." />}
    {filas.length > VISIBLES && <div className="mkv2-ver-mas">
      <button type="button" className="fv2-pildora" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : `Ver todas (${numero(filas.length)})`}</button>
    </div>}
  </section>
}

/** Las dos gráficas con un solo selector de métrica, la nota y los 3 cuadritos (de las campañas). */
function Rendimiento({ lista, pequenas, incluir, setIncluir, resumen, metricaInicial, verCampana, verCorreos, filasDe, campanaDe, verCartera, ejecutivos, campanasConDetalle, cruce, hayCartera }) {
  const [metrica, setMetrica] = useState(METRICAS[metricaInicial] ? metricaInicial : 'entrega')
  const solidas = lista.filter((c) => !pocosDatos(c))
  const porEntrega = ordenarPor(solidas.filter((c) => c.tasas.entrega !== null), (c) => c.tasas.entrega)
  const porApertura = ordenarPor(solidas.filter((c) => c.tasas.apertura !== null), (c) => c.tasas.apertura)
  const cuadritos = [
    { titulo: 'Mejor entrega', c: porEntrega[0], v: (c) => c.tasas.entrega, color: COLOR_MAILING.entregados, claro: '#6fd3a6' },
    { titulo: 'Mejor apertura', c: porApertura[0], v: (c) => c.tasas.apertura, color: COLOR_MAILING.apertura, claro: '#8fc4f0' },
    { titulo: 'Entrega más baja', c: porEntrega.at(-1), v: (c) => c.tasas.entrega, color: COLOR_MAILING.duro, claro: '#ff8a99' },
  ]
  return <Tarjeta titulo="Rendimiento de campañas y comerciales" sub="Clic en una tarjeta para ver su detalle ahí mismo · otro clic lo cierra"
    acciones={<div className="mkv2-segmento" role="tablist" aria-label="Comparar por">
      {Object.entries(METRICAS).map(([k, v]) => <button key={k} type="button" role="tab" aria-selected={metrica === k}
        className={metrica === k ? 'is-activo' : ''} onClick={() => setMetrica(k)}>{v.boton}</button>)}
    </div>}>
    {metrica === 'entrega' && <div className="mkv2-rank-herramientas"><LeyendaSemaforo /></div>}
    <div className="mkv2-dos-graficas">
      <GraficaCampanas lista={lista} pequenas={pequenas} incluir={incluir} setIncluir={setIncluir} metrica={metrica} resumen={resumen} verCampana={verCampana} verCorreos={verCorreos} filasDe={filasDe} />
      <GraficaComerciales ejecutivos={ejecutivos} campanasConDetalle={campanasConDetalle} metrica={metrica} cruce={cruce} hayCartera={hayCartera} campanaDe={campanaDe} verCartera={verCartera} />
    </div>
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

export function CompararCampanas({ campanas, resumen, detalle, detalleTodo, foco, abrir, limpiarFoco, volver, filtrar }) {
  const verCampana = (c) => { filtrar({ campana: String(c.id) }); volver() }
  const verCorreos = (c) => { filtrar({ campana: String(c.id) }); abrir({ vista: 'detalle', estado: 'todos', titulo: `Correos de ${textosCampana(c).corto}` }) }
  // Detalle de una campaña: sus filas por correo SIN filtro de país (la gráfica «Por campaña» no se separa por país).
  const porCampana = useMemo(() => {
    const m = new Map()
    for (const f of detalleTodo?.mostrarCorreos ? detalleTodo.filas : []) m.set(f.campana_id, [...(m.get(f.campana_id) ?? []), f])
    return m
  }, [detalleTodo])
  const filasDe = (id) => porCampana.get(id) ?? []
  const nombres = useMemo(() => Object.fromEntries(campanas.map((c) => [c.id, c])), [campanas])
  const campanaDe = useCallback((id) => nombres[id] ?? null, [nombres])
  // «Ver cartera completa»: Relación con clientes filtrada por ese ejecutivo.
  const verCartera = (e) => { filtrar({ cliente: e.ejecutivo }); abrir({ vista: 'clientes', titulo: `Cartera de ${e.ejecutivo}` }) }
  const [incluir, setIncluir] = useState(false)
  const { lista, pequenas } = useMemo(() => campanasComparables(campanas, incluir), [campanas, incluir])
  // «Por comercial»: filas por correo de las campañas filtradas (ya con País y Cliente aplicados arriba).
  const { ejecutivos, campanasConDetalle } = useMemo(() => {
    const ids = new Set(campanas.map((c) => c.id))
    const filas = (detalle?.mostrarCorreos ? detalle.filas : []).filter((f) => ids.has(f.campana_id))
    return { ejecutivos: metricasPorEjecutivo(filas, detalle?.carteras ?? null), campanasConDetalle: new Set(filas.map((f) => f.campana_id)).size }
  }, [campanas, detalle])
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
    <Rendimiento key={foco?.metrica ?? 'entrega'} lista={lista} pequenas={pequenas} incluir={incluir} setIncluir={setIncluir} resumen={resumen} metricaInicial={foco?.metrica}
      verCampana={verCampana} verCorreos={verCorreos} filasDe={filasDe} campanaDe={campanaDe} verCartera={verCartera} ejecutivos={ejecutivos} campanasConDetalle={campanasConDetalle} cruce={detalle?.cruce} hayCartera={Array.isArray(detalle?.carteras)} />
    <PorCargo campanas={campanas} filtrar={filtrar} />
    <Detallada lista={lista} verCampana={verCampana} />
  </>
}
