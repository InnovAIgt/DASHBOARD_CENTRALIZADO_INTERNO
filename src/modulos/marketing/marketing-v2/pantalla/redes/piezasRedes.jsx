// Canales de marketing · Redes sociales: piezas visuales propias (no se cambian las de Mailing).
// Tarjeta compacta con mini gráfica (como las compactas de Mailing), dona que se puede tocar, anillo de
// cumplimiento y barras de alcance por semana (Facebook e Instagram lado a lado). Clases mkv2-redes-…
import { useLayoutEffect, useRef, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { numero } from '../../datos/calculos.js'
import { COLOR_RED } from '../../datos/redes.js'

/** Mini gráfica discreta (26 px de alto) para la derecha de una tarjeta. */
export function MiniGrafica({ serie = [], color }) {
  if (serie.length < 2) return null
  const an = 64
  const al = 26
  const max = Math.max(...serie, 1)
  const pts = serie.map((v, i) => [(i * an) / (serie.length - 1), al - 3 - (v / max) * (al - 6)])
  const [ux, uy] = pts.at(-1)
  return <svg className="mkv2-redes-mini" width={an} height={al} viewBox={`0 0 ${an} ${al}`} aria-hidden="true">
    <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts.map((p) => p.join(',')).join(' ')} />
    <circle cx={ux} cy={uy} r="2.6" fill={color} />
  </svg>
}

/**
 * Tarjeta compacta: título + «?», número grande con la mini gráfica a la derecha y una línea de subtítulo. Sin íconos
 * (versión profesional del mockup); el color va solo en el borde de arriba. Clic = ventana de detalle (onClick).
 */
export function TarjetaRedes({ titulo, color, valor, sub, serie, tip, onClick }) {
  const Caja = onClick ? 'button' : 'div'
  return <Caja {...(onClick ? { type: 'button', onClick } : {})} className={`mkv2-redes-kpi ${onClick ? 'is-clic' : ''}`} style={{ '--mkv2-acento': color }} data-tip={tip}>
    <span className="mkv2-redes-kpi-cabeza">
      <span className="mkv2-redes-kpi-titulo">{titulo}</span>
      <span className="mkv2-ayuda" aria-hidden="true">?</span>
    </span>
    <span className="mkv2-redes-kpi-cuerpo">
      <span className="mkv2-redes-kpi-num">{valor}</span>
      <MiniGrafica serie={serie} color={color} />
    </span>
    <span className="mkv2-redes-kpi-sub">{sub}</span>
  </Caja>
}

/**
 * Dona que se puede tocar: items [{k, l, v, c}]; el clic en un sector o en su fila llama onElegir(k).
 * activo = clave resaltada (filtro puesto). formato = cómo se escribe cada valor.
 */
export function DonaRedes({ items = [], centro, sub, onElegir, activo = '', formato = numero, tipDe, sinLista = false }) {
  const [sobre, setSobre] = useState(null)
  const total = items.reduce((n, i) => n + (Number(i.v) || 0), 0)
  const R = 56
  const C = 2 * Math.PI * R
  const hueco = items.filter((i) => i.v > 0).length > 1 ? 3 : 0
  let acumulado = 0
  const sectores = items.filter((i) => i.v > 0).map((i) => {
    const largo = (i.v / total) * C
    const s = { ...i, largo: Math.max(0, largo - hueco), offset: -acumulado }
    acumulado += largo
    return s
  })
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0)
  const tip = (i) => tipDe?.(i) ?? `${i.l}: ${formato(i.v)} · ${pct(i.v)} %`
  const marcado = sobre ?? activo
  return <div className={`mkv2-redes-dona ${marcado ? 'is-foco' : ''}`}>
    <div className="mkv2-redes-dona-figura">
      <svg viewBox="0 0 150 150" className="mkv2-redes-dona-svg" role="img">
        <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="18" />
        <g transform="rotate(-90 75 75)">
          {sectores.map((s) => <circle key={s.k} cx="75" cy="75" r={R} fill="none" stroke={s.c} strokeWidth={marcado === s.k ? 22 : 18}
            strokeDasharray={`${s.largo} ${C}`} strokeDashoffset={s.offset} data-tip={tip(s)}
            className={`mkv2-redes-dona-sector ${marcado && marcado !== s.k ? 'is-apagado' : ''} ${onElegir ? 'is-clic' : ''}`}
            onMouseEnter={() => setSobre(s.k)} onMouseLeave={() => setSobre(null)} onClick={onElegir ? () => onElegir(s.k) : undefined} />)}
        </g>
      </svg>
      <span className="mkv2-redes-dona-centro"><strong>{centro}</strong><small>{sub}</small></span>
    </div>
    {!sinLista && <div className="mkv2-redes-dona-lista">
      {items.map((i) => <button type="button" key={i.k} className={`${marcado === i.k ? 'is-marcado' : ''} ${activo === i.k ? 'is-activo' : ''}`} disabled={!onElegir}
        onMouseEnter={() => setSobre(i.k)} onMouseLeave={() => setSobre(null)} onClick={onElegir ? () => onElegir(i.k) : undefined} data-tip={tip(i)}>
        <i style={{ background: i.c }} /><span>{i.l}</span><b>{formato(i.v)}</b><em>{pct(i.v)} %</em>
      </button>)}
    </div>}
  </div>
}

/** Anillo de cumplimiento (% en el centro, color del semáforo). */
export function Anillo({ pct, color }) {
  const R = 34
  const C = 2 * Math.PI * R
  const v = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0
  return <svg className="mkv2-redes-anillo" viewBox="0 0 84 84" aria-hidden="true">
    <circle r={R} cx="42" cy="42" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8" />
    <circle r={R} cx="42" cy="42" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" transform="rotate(-90 42 42)"
      strokeDasharray={`${(v / 100) * C} ${C}`} className="mkv2-redes-anillo-arco" />
    <text x="42" y="47" textAnchor="middle">{Number.isFinite(pct) ? `${Math.round(pct)}%` : '—'}</text>
  </svg>
}

/**
 * Alcance por semana: columnas de Facebook e Instagram lado a lado (solo las redes que pasan el filtro).
 * corte = día de hoy si el mes está en curso: las semanas que empiezan después dicen «por venir».
 */
export function BarrasSemana({ semanas = [], redes = ['fb', 'ig'], corte = null, onElegir }) {
  const max = Math.max(...semanas.flatMap((s) => redes.map((r) => s[r])), 1)
  return <div className="mkv2-redes-semanas">
    <div className="mkv2-redes-semanas-graf">
      {semanas.map((s) => <div key={s.semana} className={`mkv2-redes-semana ${onElegir ? 'mkv2-redes-clic' : ''}`}
        {...(onElegir ? { role: 'button', tabIndex: 0, onClick: () => onElegir(s), onKeyDown: (e) => { if (e.key === 'Enter') onElegir(s) } } : {})}>
        <div className="mkv2-redes-semana-barras">
          {redes.map((r) => <span key={r} className="mkv2-redes-columna" style={{ '--alto': `${(s[r] / max) * 100}%`, '--c': COLOR_RED[r] }}
            data-tip={`${r === 'fb' ? 'Facebook' : 'Instagram'} · días ${s.desde}–${s.hasta}: ${numero(s[r])} de alcance`} />)}
        </div>
        <small className={corte && s.desde > corte ? 'is-futura' : ''}>{s.desde}–{s.hasta}{corte && s.desde > corte ? ' · por venir' : ''}</small>
      </div>)}
    </div>
    <div className="mkv2-redes-leyenda">
      {redes.map((r) => <span key={r}><i style={{ background: COLOR_RED[r] }} />{r === 'fb' ? 'Facebook' : 'Instagram'}</span>)}
    </div>
  </div>
}

/**
 * Programado vs publicado por marca: por cada marca, columna gris (programadas a la fecha) y columna con el color del
 * semáforo (publicadas). filas = [{marca, nombre, programadas, publicadas, cumplimiento, color}]. Clic = filtrar marca.
 */
export function BarrasProgramado({ filas = [], onElegir, activa = '' }) {
  const max = Math.max(1, ...filas.map((f) => Math.max(f.programadas, f.publicadas)))
  return <div className="mkv2-redes-prog">
    <div className="mkv2-redes-prog-graf">
      {filas.map((f) => <button type="button" key={f.marca} className={`mkv2-redes-prog-grupo ${activa === f.marca ? 'is-activa' : ''}`} onClick={onElegir ? () => onElegir(f.marca) : undefined}
        data-tip={`${f.nombre}
${f.publicadas} de ${f.programadas} programadas · ${f.cumplimiento === null ? '—' : `${Math.round(f.cumplimiento)} %`}`}>
        <span className="mkv2-redes-prog-barras">
          <span className="mkv2-redes-columna is-programada" style={{ '--alto': `${(f.programadas / max) * 100}%` }}><b>{f.programadas}</b></span>
          <span className="mkv2-redes-columna" style={{ '--alto': `${(f.publicadas / max) * 100}%`, '--c': f.color }}><b style={{ color: f.color }}>{f.publicadas}</b></span>
        </span>
        <small>{f.corto}</small>
      </button>)}
    </div>
  </div>
}

/**
 * Barras horizontales de COSTO POR MENSAJE con la línea de la meta (Pauta del Resumen y Presupuestos de Anuncios).
 * filas = [{id, nombre, tip, sub, costo, pocos, semaforo, onClick}]. Las de «pocos datos» van plegadas abajo.
 * Barra más corta = más barato; si no pasa la línea punteada, está en meta.
 */
export function BarrasCosto({ filas = [], meta = null, formato, colorDe, resumenPocos = null, mostrarCosto = false }) {
  const buenas = filas.filter((f) => !f.pocos && f.costo !== null)
  const pocas = filas.filter((f) => f.pocos || f.costo === null)
  const max = Math.max(meta ?? 0, ...buenas.map((f) => f.costo), 0.01) * 1.12
  const fila = (f) => <div key={f.id} className={`mkv2-redes-costo-fila ${f.pocos ? 'is-pocos' : ''} ${f.onClick ? 'mkv2-redes-clic' : ''}`} data-tip={f.tip}
    {...(f.onClick ? { role: 'button', tabIndex: 0, onClick: f.onClick, onKeyDown: (e) => { if (e.key === 'Enter') f.onClick() } } : {})}>
    <span className="mkv2-redes-costo-nombre"><b className="mkv2-una-linea" data-tip={f.tipNombre}>{f.nombre}</b>{f.sub2 && <small className="mkv2-una-linea">{f.sub2}</small>}<small className="mkv2-redes-costo-sub">{f.sub}</small></span>
    <span className="mkv2-redes-costo-barra">
      {!f.pocos && f.costo !== null && <i style={{ width: `${(f.costo / max) * 100}%`, background: colorDe(f) }} />}
      {meta && <em style={{ left: `${(meta / max) * 100}%` }} aria-hidden="true" />}
    </span>
    <span className="mkv2-redes-costo-valor">{f.pocos || f.costo === null ? (mostrarCosto && f.costo !== null ? <span className="mkv2-redes-sem">{formato(f.costo)}</span> : <span className="mkv2-redes-pocos">pocos datos</span>) : <span className={`mkv2-redes-sem ${f.semaforo ? `is-${f.semaforo}` : ''}`}>{formato(f.costo)}</span>}{f.estado && <small className={f.enMeta ? 'is-verde' : 'is-ambar'}>{f.estado}</small>}</span>
  </div>
  return <div className="mkv2-redes-costos">
    {meta && <div className="mkv2-redes-costo-meta"><span /><span><em style={{ left: `${(meta / max) * 100}%` }}>Meta {formato(meta)}</em></span><span /></div>}
    {buenas.length ? buenas.map(fila) : <p className="mkv2-redes-vacio is-gris">Aún no hay suficientes datos este mes</p>}
    {pocas.length > 0 && <details className="mkv2-seg-pocos"><summary>{resumenPocos ?? <>Ver {pocas.length} con pocos datos <small>(menos de 5 mensajes)</small></>}</summary>{pocas.map(fila)}</details>}
  </div>
}

/** Píldora de «Lo importante del mes» (una línea, sin ícono: el color va en el borde; la explicación va en el globo). */
export function PildoraImportante({ color, texto, detalle, tip, onClick }) {
  const Caja = onClick ? 'button' : 'span'
  return <Caja {...(onClick ? { type: 'button', onClick } : {})} className="mkv2-redes-importante" style={{ '--c': color }} data-tip={tip}>
    <b>{texto}</b>{detalle && <span>{detalle}</span>}
  </Caja>
}

/**
 * Tarjeta compacta de Anuncios (mockup_anuncios_compacto): línea de color arriba que se desvanece, ícono, título,
 * subtítulo corto, enlace «Ver reparto ›» opcional, contenido y la lectura abajo (siempre pegada al pie, para que las
 * tarjetas de la fila tengan la misma altura sin huecos). color = el de la tarjeta. aviso = «Cargando…» o el error de
 * Meta: se muestra en lugar del contenido (sin enlace ni lectura). nota = aviso chico abajo (por ejemplo, datos guardados).
 */
export function TarjetaCompacta({ color, icono, titulo, sub, enlace = null, lectura = '', aviso = null, nota = null, children }) {
  return <section className="mkv2-tarjeta mkv2-tc" style={{ '--c': color }}>
    <header className="mkv2-tc-cabeza">
      <span className="mkv2-tc-ico" aria-hidden="true">{icono}</span>
      <div className="mkv2-tc-tit"><h2>{titulo}</h2>{sub && <p>{sub}</p>}</div>
      {enlace && !aviso && <button type="button" className="mkv2-tc-enlace" onClick={enlace.alHacer}>{enlace.texto} ›</button>}
    </header>
    <div className="mkv2-tc-cuerpo">{aviso ?? children}{!aviso && nota}</div>
    {lectura && !aviso && <LecturaCorta texto={lectura} />}
  </section>
}

/** Lectura en 1 línea con ícono; «Ver más» la despliega completa (solo aparece si no cabe). */
export function LecturaCorta({ texto }) {
  const [abierta, setAbierta] = useState(false)
  const [corta, setCorta] = useState(false)
  const ref = useRef(null)
  useLayoutEffect(() => {
    const medir = () => { const el = ref.current; if (el && !abierta) setCorta(el.scrollWidth > el.clientWidth + 1) }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [texto, abierta])
  return <div className={`mkv2-tc-lectura ${abierta ? 'is-abierta' : ''}`}>
    <i aria-hidden="true"><Lightbulb size={11} /></i>
    <span ref={ref}>{texto}</span>
    {(corta || abierta) && <button type="button" onClick={() => setAbierta((a) => !a)}>{abierta ? 'Ver menos' : 'Ver más'}</button>}
  </div>
}

/** Costo por mensaje en píldora suave: verde en meta, ámbar sobre la meta; «pocos datos» con menos de 5; — sin mensajes. */
export function PildoraCosto({ costo, mensajes, pocos, meta, formato }) {
  if (!mensajes) return <span className="mkv2-tc-pildora is-nada">—</span>
  if (pocos) return <span className="mkv2-tc-pildora is-pocos">pocos datos</span>
  // Se compara el costo redondeado a centavos (el que se ve): US$ 1.50 con meta US$ 1.50 es «en meta».
  return <span className={`mkv2-tc-pildora ${meta ? (Math.round(costo * 100) / 100 <= meta ? 'is-verde' : 'is-ambar') : ''}`}>{formato(costo)}</span>
}
