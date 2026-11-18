// Redes sociales · pestaña Resumen (mockup aprobado, página 1). De arriba hacia abajo:
//   1. 6 indicadores · 2. Meta de 14 al mes · 3. Leads por mes · 4. Resultados por país
//   5. Resultados por marca · 6. Facebook vs. Instagram
// D-H: aquí NO hay avisos amarillos de "sin métricas" ni de "datos a revisar" (viven en el Informe).
// Todo número se puede cliquear: abre la lista de filas que lo forman.
import { useMemo } from 'react'
import {
  hallazgoRedes, leadsPorMes, META_MENSUAL, metaPorMarcaMes, MARCAS, mesesVisibles, pautaPorMarca,
  pocos, porMarca, porPais, porRed, totales,
} from '../logica/calculos.js'
import { dinero, dineroCorto, entero, mesCorto, mesLargo, plural, porcentaje } from '../logica/formato.js'
import { Bandera, Cifra, Explicacion, Panel, PocosDatos, Vacio } from './comunes.jsx'

// ---------- 1. Indicadores ----------
function Indicador({ etiqueta, valor, tono = 'azul', nota, explicacion, onClick, pocosDatos }) {
  return <button type="button" className={`rds-kpi is-${tono}`} onClick={onClick} title="Ver el detalle">
    <span className="rds-kpi-etiqueta">{etiqueta} <Explicacion texto={explicacion} /></span>
    <span className="rds-kpi-numero">{valor}{pocosDatos && <PocosDatos />}</span>
    <span className="rds-kpi-nota">{nota}</span>
  </button>
}

function Indicadores({ t, filas, publicaciones, abrirLista }) {
  const desglose = pautaPorMarca(filas)
  const con = (k) => filas.filter((f) => (f[k] ?? 0) > 0)
  return <section className="rds-kpis" aria-label="Indicadores">
    <Indicador etiqueta="Publicaciones" valor={entero(t.publicaciones)} tono="azul"
      nota={<><b>{entero(t.hechas)} hechas · {entero(t.programadas)} programadas</b><br />Meta: {META_MENSUAL} por marca al mes</>}
      explicacion="Facebook + Instagram de un mismo post cuentan como 1 publicación. Hechas = fecha hasta hoy; programadas = fecha posterior a hoy."
      onClick={() => abrirLista('Publicaciones', `${plural(t.publicaciones, 'publicación', 'publicaciones')} · ${plural(t.filas, 'fila', 'filas')} (una por red)`, filas)} />
    <Indicador etiqueta="Leads" valor={entero(t.leads)} tono="blanco" nota="Mensajes recibidos"
      explicacion="Suma de la columna Mensajes/Leads."
      onClick={() => abrirLista('Leads', 'Filas con al menos un lead', con('leads'))} />
    <Indicador etiqueta="Calificados" valor={entero(t.calificados)} tono="azul"
      nota={<>{pocos(t.leads) ? 'pocos datos' : `${porcentaje(t.pctCalificados)} de los leads`} · {entero(t.noCalificados)} no calificados</>}
      explicacion="Suma de Lead calificado. No calificados = leads − calificados."
      onClick={() => abrirLista('Calificados', 'Filas con leads calificados', con('calificados'))} />
    <Indicador etiqueta="Cierres" valor={entero(t.cierres)} tono="verde" nota={`${entero(t.unidades)} unidades vendidas`}
      explicacion="Suma de Cierres exitoso (No. clientes) y de No. de unidades."
      onClick={() => abrirLista('Cierres', 'Filas con cierres exitosos', con('cierres'))} />
    <Indicador etiqueta="Pauta invertida" valor={dinero(t.pauta)} tono="amarillo"
      nota={desglose.map((m) => `${m.clave === 'gt' ? 'GT' : m.clave === 'sv' ? 'SV' : 'Datared'} ${dineroCorto(m.pauta)}`).join(' · ')}
      explicacion="Suma de Presupuesto pauta (se suma de nuevo: no se usa la fila de total del Excel)."
      onClick={() => abrirLista('Pauta invertida', 'Filas con pauta', con('pauta'))} />
    <Indicador etiqueta="Costo por lead calificado" valor={dinero(t.costoCalificado)} tono="amarillo"
      nota={`${dinero(t.pauta)} ÷ ${entero(t.calificados)}`} pocosDatos={pocos(t.calificados)}
      explicacion="Pauta invertida ÷ calificados. Se recalcula siempre; no se usan los costos del Excel."
      onClick={() => abrirLista('Costo por lead calificado', `${dinero(t.pauta)} de pauta ÷ ${entero(t.calificados)} calificados`, filas.filter((f) => (f.pauta ?? 0) > 0 || (f.calificados ?? 0) > 0))} />
  </section>
}

// ---------- 2. Meta ----------
const TEXTO_CELDA = {
  cumplio: () => '✓ cumplió',
  faltan: (c) => `faltan ${c.faltan}`,
  sin_posts: () => 'sin posts',
  inicio: () => 'inicio',
  en_curso: (c) => `en curso · van ${c.n}`,
}

function Meta({ filas, datos, meses, marcas, abrirLista }) {
  const grid = useMemo(() => metaPorMarcaMes(filas, { ...datos, meses, marcas }), [filas, datos, meses, marcas])
  return <Panel titulo={`Meta: ${META_MENSUAL} publicaciones al mes`}
    subtitulo="Publicaciones por marca y mes (Facebook + Instagram de un mismo post cuentan como 1) · clic en un mes: sus publicaciones"
    explicacion={`Verde: ${META_MENSUAL} o más. Amarillo: de 1 a ${META_MENSUAL - 1}. Gris: sin publicaciones, primer mes de la marca (no cuenta como incumplido) o mes en curso.`}>
    {meses.length ? <>
      <div className="rds-meta" style={{ '--rds-meses': meses.length }}>
        <span />
        {meses.map((m) => <span key={m} className="rds-meta-mes">{mesCorto(m)}</span>)}
        {grid.map((marca) => <MetaFila key={marca.clave} marca={marca} abrirLista={abrirLista} />)}
      </div>
      <p className="rds-leyenda"><b className="is-verde">Verde</b> = cumplió ({META_MENSUAL} o más) · <b className="is-amarillo">Amarillo</b> = no llegó · <b className="is-gris">Gris</b> = sin publicaciones, primer mes de la marca o mes en curso</p>
    </> : <Vacio titulo="Sin meses en el período elegido" />}
  </Panel>
}

function MetaFila({ marca, abrirLista }) {
  return <>
    <span className="rds-meta-marca">{marca.nombre} <small>{marca.pais}</small></span>
    {marca.celdas.map((c) => {
      const ancho = Math.min(100, (c.n / META_MENSUAL) * 100)
      const titulo = `${marca.nombre} · ${mesLargo(c.mes)}: ${plural(c.n, 'publicación', 'publicaciones')}`
      return <button key={c.mes} type="button" className={`rds-meta-celda is-${c.estado}`} disabled={!c.n}
        onClick={() => abrirLista(titulo, `Meta: ${META_MENSUAL} · ${TEXTO_CELDA[c.estado](c)}`, c.filas)} title={c.n ? 'Ver sus publicaciones' : 'Sin publicaciones'}>
        <b>{c.n || '–'}</b>
        <i><span style={{ width: `${ancho}%` }} /></i>
        <small>{c.estado === 'inicio' ? `inicio · ${c.n}` : TEXTO_CELDA[c.estado](c)}</small>
      </button>
    })}
  </>
}

// ---------- 3. Leads por mes ----------
function LeadsPorMes({ filas, meses, abrirLista }) {
  const datosMes = useMemo(() => leadsPorMes(filas, meses), [filas, meses])
  const max = Math.max(1, ...datosMes.map((m) => m.leads))
  const conDatos = datosMes.filter((m) => !m.sinDatos)
  return <Panel titulo="Leads generados por mes" subtitulo="Calificados + no calificados · encima: total y cierres · clic en un mes: su detalle"
    explicacion="Cada columna suma los leads de las publicaciones del mes (por su fecha). 'Sin datos' = ninguna publicación del mes tiene sus resultados cargados."
    accion={<div className="rds-leyenda-chica"><span className="is-azul">■ Calificados</span><span className="is-gris">■ No calificados</span></div>}>
    {meses.length ? <>
      <div className="rds-columnas" style={{ '--rds-meses': meses.length }}>
        {datosMes.map((m) => <button key={m.mes} type="button" className="rds-columna" disabled={m.sinDatos && !m.filas.length}
          onClick={() => abrirLista(`Leads de ${mesLargo(m.mes)}`, `${entero(m.leads)} leads · ${entero(m.calificados)} calificados · ${entero(m.noCalificados)} no calificados · ${plural(m.cierres, 'cierre', 'cierres')}`, m.filas)}
          title={m.sinDatos ? 'Sin datos de leads' : `${m.leads} leads: ${m.calificados} calificados + ${m.noCalificados} no calificados`}>
          {m.sinDatos
            ? <span className="rds-columna-sin">sin datos</span>
            : <>
              <span className="rds-columna-cierres">✓ {plural(m.cierres, 'cierre', 'cierres')}</span>
              <span className="rds-columna-total">{entero(m.leads)}</span>
              <span className="rds-columna-barra" style={{ height: `${(m.leads / max) * 100}%` }}>
                <span className="is-no" style={{ flexGrow: Math.max(0, m.noCalificados) }} />
                <span className="is-cal" style={{ flexGrow: m.calificados }} />
              </span>
            </>}
        </button>)}
      </div>
      <div className="rds-columnas-meses" style={{ '--rds-meses': meses.length }}>{meses.map((m) => <span key={m}>{mesCorto(m)}</span>)}</div>
      <p className="rds-nota">
        {conDatos.length ? `Calificados por mes: ${conDatos.map((m) => `${mesCorto(m.mes, false).toLowerCase()} ${m.calificados}`).join(' · ')}.` : 'Ningún mes tiene leads cargados.'}
        {datosMes.some((m) => m.sinDatos) && ` ${datosMes.filter((m) => m.sinDatos).map((m) => mesCorto(m.mes)).join(' y ')} todavía no tienen leads cargados.`}
        {pocos(conDatos.length) && conDatos.length > 0 && <> <PocosDatos /></>}
      </p>
    </> : <Vacio titulo="Sin meses en el período elegido" />}
  </Panel>
}

// ---------- 4. Resultados por país ----------
function BarraCalificados({ calificados, leads }) {
  if (pocos(leads)) return <PocosDatos />
  const r = leads ? calificados / leads : 0
  return <div className="rds-barra-cal"><i><span style={{ width: `${Math.min(100, r * 100)}%` }} /></i><small>{porcentaje(r)} calificados</small></div>
}

function ResultadosPais({ filas, publicaciones, filtros, setFiltros, abrirLista }) {
  const { paises, total } = useMemo(() => porPais(filas, publicaciones), [filas, publicaciones])
  const n = (fila, valor, titulo, lista, clase) => <Cifra className={clase} onClick={() => abrirLista(titulo, fila.nombre ?? 'Total', lista)}>{valor}</Cifra>
  return <Panel titulo="Resultados por país"
    subtitulo="Publicaciones hechas o programadas y sus leads · El Salvador suma RED El Salvador + Datared · clic en un país para filtrar todo el dashboard">
    <div className="rds-tabla-caja">
      <table className="rds-tabla is-grande">
        <thead><tr><th>País</th><th>Marcas</th><th className="num">Hechas</th><th className="num">Programadas</th><th className="num">Leads totales</th><th className="num">Calificados</th><th className="num">No calificados</th><th className="rds-col-barra">Calificados / no calificados</th></tr></thead>
        <tbody>
          {paises.map((p) => <tr key={p.clave} className={filtros.pais === p.clave ? 'is-elegida' : ''}>
            <td><button type="button" className="rds-enlace-fuerte" onClick={() => setFiltros((f) => ({ ...f, pais: f.pais === p.clave ? null : p.clave, marca: null }))}
              title={filtros.pais === p.clave ? 'Quitar el filtro de país' : `Filtrar todo el dashboard por ${p.nombre}`}><Bandera pais={p.clave} /> {p.nombre} <small>{p.clave}</small></button></td>
            <td className="rds-tenue">{p.marcas.join(' · ')}</td>
            <td className="num">{n(p, entero(p.hechas), `Publicaciones hechas · ${p.nombre}`, p.filasLista.filter((f) => f.estado !== 'programada'))}</td>
            <td className="num rds-tenue">{n(p, entero(p.programadas), `Programadas · ${p.nombre}`, p.filasLista.filter((f) => f.estado === 'programada'))}</td>
            <td className="num">{n(p, entero(p.leads), `Leads · ${p.nombre}`, p.filasLista.filter((f) => (f.leads ?? 0) > 0))}</td>
            <td className="num is-azul">{n(p, entero(p.calificados), `Calificados · ${p.nombre}`, p.filasLista.filter((f) => (f.calificados ?? 0) > 0))}</td>
            <td className="num rds-tenue">{n(p, entero(p.noCalificados), `No calificados · ${p.nombre}`, p.filasLista.filter((f) => (f.noCalificados ?? 0) !== 0))}</td>
            <td><BarraCalificados calificados={p.calificados} leads={p.leads} /></td>
          </tr>)}
          {paises.length > 1 && <tr className="rds-fila-total">
            <td>Total</td><td />
            <td className="num">{entero(total.hechas)}</td>
            <td className="num">{entero(total.programadas)}</td>
            <td className="num">{entero(total.leads)}</td>
            <td className="num is-azul">{entero(total.calificados)}</td>
            <td className="num">{entero(total.noCalificados)}</td>
            <td className="rds-tenue">{pocos(total.leads) ? <PocosDatos /> : `${porcentaje(total.pctCalificados)} calificados`}</td>
          </tr>}
        </tbody>
      </table>
    </div>
    <p className="rds-nota">Programadas = publicaciones con fecha posterior a hoy (el Excel no tiene columna de estado).{total.programadas === 0 ? ' Hoy no hay ninguna.' : ''}</p>
  </Panel>
}

// ---------- 5. Resultados por marca ----------
function ResultadosMarca({ filas, publicaciones, filtros, setFiltros, abrirLista }) {
  const marcas = useMemo(() => porMarca(filas, publicaciones), [filas, publicaciones])
  return <Panel titulo="Resultados por marca" subtitulo="Clic en una marca para filtrar todo el dashboard · clic en un número: su detalle">
    <div className="rds-marcas">
      {marcas.map((m) => {
        const elegida = filtros.marca?.length === 1 && filtros.marca[0] === m.clave
        return <article key={m.clave} className={`rds-marca ${elegida ? 'is-elegida' : ''}`}
          onClick={() => setFiltros((f) => ({ ...f, marca: elegida ? null : [m.clave], pais: null }))}
          role="button" tabIndex={0} title={elegida ? 'Quitar el filtro de marca' : `Filtrar todo el dashboard por ${m.nombre}`}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFiltros((f) => ({ ...f, marca: elegida ? null : [m.clave], pais: null })) } }}>
          <header><b>{m.nombre}</b><span><Bandera pais={m.pais} /> {m.pais}</span></header>
          <div className="rds-marca-leads"><Cifra onClick={() => abrirLista(`Leads · ${m.nombre}`, m.nombre, m.filasLista.filter((f) => (f.leads ?? 0) > 0))}>{entero(m.leads)}</Cifra> <span>{m.leads === 1 ? 'lead' : 'leads'}</span></div>
          <BarraCalificados calificados={m.calificados} leads={m.leads} />
          <p><b className="is-azul">{plural(m.calificados, 'calificado', 'calificados')}</b> · {plural(m.noCalificados, 'no calificado', 'no calificados')}</p>
          <div className="rds-marca-datos">
            <div><Cifra onClick={() => abrirLista(`Publicaciones · ${m.nombre}`, m.nombre, m.filasLista)}>{entero(m.publicaciones)}</Cifra><small>publicaciones{pocos(m.publicaciones) ? ' · pocos datos' : ''}</small></div>
            <div><Cifra className="is-verde" onClick={() => abrirLista(`Cierres · ${m.nombre}`, m.nombre, m.filasLista.filter((f) => (f.cierres ?? 0) > 0))}>{entero(m.cierres)}</Cifra><small>cierres · {entero(m.unidades)} unid.</small></div>
            <div>
              {m.calificados
                ? <><Cifra className="is-amarillo" onClick={() => abrirLista(`Pauta · ${m.nombre}`, `${dinero(m.pauta)} ÷ ${m.calificados} calificados`, m.filasLista.filter((f) => (f.pauta ?? 0) > 0))}>{dinero(m.costoCalificado)}</Cifra><small>pauta por lead calif.</small></>
                : <><Cifra className="is-amarillo" onClick={() => abrirLista(`Pauta · ${m.nombre}`, m.nombre, m.filasLista.filter((f) => (f.pauta ?? 0) > 0))}>{dineroCorto(m.pauta)}</Cifra><small>pauta · 0 calificados</small></>}
            </div>
          </div>
        </article>
      })}
    </div>
  </Panel>
}

// ---------- 6. Facebook vs. Instagram ----------
function Redes({ filas, publicaciones, abrirLista }) {
  const redes = useMemo(() => porRed(filas, publicaciones), [filas, publicaciones])
  const fbIg = redes.filter((r) => r.red !== 'Sin red')
  const maxAlcance = Math.max(1, ...fbIg.map((r) => r.alcance))
  const maxLeads = Math.max(1, ...fbIg.map((r) => r.leads))
  return <Panel titulo="Facebook vs. Instagram" subtitulo="¿Qué red trae los leads?" explicacion="Suma del alcance y de los leads de las filas de cada red. Las filas sin red no entran en la comparación.">
    {fbIg.length ? <div className="rds-redes">
      {fbIg.map((r) => <div key={r.red} className="rds-redes-grupo">
        <div className="rds-redes-cabeza"><b className={r.red === 'Instagram' ? 'is-ig' : 'is-fb'}>{r.red}</b>
          <Cifra onClick={() => abrirLista(`Calificados · ${r.red}`, r.red, r.filasLista.filter((f) => (f.calificados ?? 0) > 0))}>{plural(r.calificados, 'calificado', 'calificados')}</Cifra></div>
        <span>Alcance</span><i className="rds-redes-pista"><span className="is-azul" style={{ width: `${(r.alcance / maxAlcance) * 100}%` }} /></i>
        <Cifra className="num" onClick={() => abrirLista(`Alcance · ${r.red}`, `${entero(r.alcance)} de alcance`, r.filasLista)}>{entero(r.alcance)}</Cifra>
        <span>Leads</span><i className="rds-redes-pista"><span className="is-verde" style={{ width: `${Math.max(r.leads ? 1 : 0, (r.leads / maxLeads) * 100)}%` }} /></i>
        <Cifra className="num" onClick={() => abrirLista(`Leads · ${r.red}`, r.red, r.filasLista.filter((f) => (f.leads ?? 0) > 0))}>{entero(r.leads)}</Cifra>
      </div>)}
    </div> : <Vacio titulo="Sin filas de Facebook ni de Instagram" texto="Con los filtros actuales solo hay filas sin red social." />}
    <div className="rds-hallazgo">{hallazgoRedes(redes)}</div>
  </Panel>
}

export function Resumen({ datos, filas, filtros, setFiltros, abrirLista }) {
  const { publicaciones } = datos
  const t = useMemo(() => totales(filas, publicaciones), [filas, publicaciones])
  const meses = useMemo(() => mesesVisibles(datos.meses, filtros), [datos.meses, filtros])
  const marcas = useMemo(() => MARCAS.filter((m) => (!filtros.marca || filtros.marca.includes(m.clave)) && (!filtros.pais || m.pais === filtros.pais)), [filtros])

  if (!filas.length) return <div className="rds-panel"><Vacio titulo="Sin publicaciones con los filtros actuales" texto="Cambia o limpia los filtros." /></div>
  return <div className="rds-vista">
    <Indicadores t={t} filas={filas} publicaciones={publicaciones} abrirLista={abrirLista} />
    <div className="rds-dos">
      <Meta filas={filas} datos={datos} meses={meses} marcas={marcas} abrirLista={abrirLista} />
      <LeadsPorMes filas={filas} meses={meses} abrirLista={abrirLista} />
    </div>
    <ResultadosPais filas={filas} publicaciones={publicaciones} filtros={filtros} setFiltros={setFiltros} abrirLista={abrirLista} />
    <div className="rds-dos">
      <ResultadosMarca filas={filas} publicaciones={publicaciones} filtros={filtros} setFiltros={setFiltros} abrirLista={abrirLista} />
      <Redes filas={filas} publicaciones={publicaciones} abrirLista={abrirLista} />
    </div>
  </div>
}
