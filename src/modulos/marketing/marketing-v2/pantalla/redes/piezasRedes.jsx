// Canales de marketing · Redes sociales: piezas visuales propias (no se cambian las de Mailing).
// Tarjeta compacta con mini gráfica (como las compactas de Mailing), dona que se puede tocar, anillo de
// cumplimiento y barras de alcance por semana (Facebook e Instagram lado a lado). Clases mkv2-redes-…
import { useState } from 'react'
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

/** Tarjeta compacta: ícono + título + «?», número grande con la mini gráfica a la derecha y UNA línea de subtítulo. */
export function TarjetaRedes({ titulo, icono: Icono, color, valor, sub, serie, tip, onClick }) {
  const Caja = onClick ? 'button' : 'div'
  return <Caja {...(onClick ? { type: 'button', onClick } : {})} className={`mkv2-redes-kpi ${onClick ? 'is-clic' : ''}`} style={{ '--mkv2-acento': color }} data-tip={tip}>
    <span className="mkv2-redes-kpi-cabeza">
      {Icono && <span className="mkv2-redes-kpi-icono" aria-hidden="true"><Icono size={11} strokeWidth={2.8} /></span>}
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
export function DonaRedes({ items = [], centro, sub, onElegir, activo = '', formato = numero, tipDe }) {
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
    <div className="mkv2-redes-dona-lista">
      {items.map((i) => <button type="button" key={i.k} className={`${marcado === i.k ? 'is-marcado' : ''} ${activo === i.k ? 'is-activo' : ''}`} disabled={!onElegir}
        onMouseEnter={() => setSobre(i.k)} onMouseLeave={() => setSobre(null)} onClick={onElegir ? () => onElegir(i.k) : undefined} data-tip={tip(i)}>
        <i style={{ background: i.c }} /><span>{i.l}</span><b>{formato(i.v)}</b><em>{pct(i.v)} %</em>
      </button>)}
    </div>
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

/** Alcance por semana: columnas de Facebook e Instagram lado a lado (solo las redes que pasan el filtro). */
export function BarrasSemana({ semanas = [], redes = ['fb', 'ig'] }) {
  const max = Math.max(...semanas.flatMap((s) => redes.map((r) => s[r])), 1)
  return <div className="mkv2-redes-semanas">
    <div className="mkv2-redes-semanas-graf">
      {semanas.map((s) => <div key={s.semana} className="mkv2-redes-semana">
        <div className="mkv2-redes-semana-barras">
          {redes.map((r) => <span key={r} className="mkv2-redes-columna" style={{ '--alto': `${(s[r] / max) * 100}%`, '--c': COLOR_RED[r] }}
            data-tip={`${r === 'fb' ? 'Facebook' : 'Instagram'} · días ${s.desde}–${s.hasta}: ${numero(s[r])} de alcance`} />)}
        </div>
        <small>{s.desde}–{s.hasta}</small>
      </div>)}
    </div>
    <div className="mkv2-redes-leyenda">
      {redes.map((r) => <span key={r}><i style={{ background: COLOR_RED[r] }} />{r === 'fb' ? 'Facebook' : 'Instagram'}</span>)}
    </div>
  </div>
}
