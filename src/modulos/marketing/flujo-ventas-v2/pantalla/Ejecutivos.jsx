// Flujo de ventas v2 · pestaña "Ejecutivos" (4.0b): "Resultados por ejecutivo" en tarjetas.
// Cifras de pantalla/datos.js (tarjetasEjecutivos). Colores: regla D12 y círculo D14.
import { useMemo, useState } from 'react'
import { formatNumber } from '../utils/analytics.js'
import { COLORES, formatearRatio, PaisChip, Vacio } from './comunes.jsx'
import { embudoEtapas, LIMITES_CONVERSION, tarjetasEjecutivos, tonoConversion } from './datos.js'
import { BarritasMes } from './graficas.jsx'
import { DetalleAsesor, DetalleMes } from './Ventanas.jsx'

const COLOR_TONO = { verde: COLORES.verde, azul: COLORES.azul, amarillo: COLORES.amarillo }

/** Círculo que se llena según la conversión de calificados. */
function CirculoConversion({ ratio, vacio }) {
  const r = 34
  const largo = 2 * Math.PI * r
  const lleno = vacio ? 0 : Math.min(1, ratio) * largo
  return <div className="fv2-circulo" aria-label={vacio ? 'Sin datos' : `Conversión de calificados ${formatearRatio(ratio)}`}>
    <svg viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      {!vacio && <circle cx="40" cy="40" r={r} fill="none" stroke={COLOR_TONO[tonoConversion(ratio)]} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${lleno} ${largo}`} transform="rotate(-90 40 40)" />}
    </svg>
    <span><b>{vacio ? '—' : `${Math.round(ratio * 100)}%`}</b><small>conversión</small></span>
  </div>
}

function Tarjeta({ t, meses, onAbrir, onMes }) {
  const vacio = t.sinLeads
  const ventas = t.conversion.ganadosCalificados
  const extra = t.conversion.ganadosNoCalificados
  return <article className={`fv2-tarjeta-ejec ${t.posicion === 1 ? 'is-primero' : ''} ${vacio ? 'is-apagada' : ''}`}
    role={vacio ? undefined : 'button'} tabIndex={vacio ? undefined : 0}
    onClick={vacio ? undefined : onAbrir}
    onKeyDown={vacio ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir() } }}
    title={vacio ? undefined : `Ver el detalle de ${t.name}`}>
    <header>
      <span className="fv2-avatar">{t.iniciales}</span>
      <div className="fv2-tarjeta-nombre">
        <strong>{t.name}</strong>
        <span className="fv2-en-linea"><PaisChip pais={t.country} /> {t.country} · {vacio ? 'sin leads en el período' : `${formatNumber(t.qualified)} calificados recibidos`}</span>
      </div>
      <span className={`fv2-posicion ${t.posicion === 1 ? 'is-primero' : ''}`}>{t.posicion ? `${t.posicion === 1 ? '★ ' : ''}#${t.posicion}` : '—'}</span>
    </header>
    <div className="fv2-tarjeta-cuerpo">
      <CirculoConversion ratio={t.conversion.ratio} vacio={vacio || !t.qualified} />
      <div className="fv2-tarjeta-ventas">
        <div><strong>{formatNumber(ventas)}</strong> ventas</div>
        <small>{vacio ? 'Sin leads asignados en el período' : `de ${formatNumber(t.qualified)} calificados${extra > 0 ? ` · +${formatNumber(extra)} de no calificados` : ''}`}</small>
        <div className="fv2-tarjeta-etiquetas">
          <span className="fv2-insignia is-neutro">{formatNumber(t.units)} unidades</span>
          {t.vencidos.length > 0
            ? <span className="fv2-insignia is-rojo">{formatNumber(t.vencidos.length)} seguimientos vencidos</span>
            : <span className="fv2-insignia is-verde">al día</span>}
        </div>
      </div>
    </div>
    <footer>
      <span className="fv2-tarjeta-sub">Ventas por mes</span>
      <BarritasMes meses={t.meses} onMes={onMes} apagado={vacio} />
      {meses.length === 1 && <p className="fv2-nota">Amplía el Período para comparar meses.</p>}
    </footer>
  </article>
}

export function Ejecutivos({ leads, baseEjecutivos }) {
  const [asesorSel, setAsesorSel] = useState(null)
  const [mesSel, setMesSel] = useState(null)
  const { tarjetas, meses, equipo } = useMemo(() => tarjetasEjecutivos(leads, baseEjecutivos), [leads, baseEjecutivos])
  const embudoEquipo = useMemo(() => embudoEtapas(leads), [leads])
  const pct = (v) => `${Math.round(v * 100)} %`

  return <section className="fv2-panel">
    <header className="fv2-panel-cabeza">
      <div>
        <div className="fv2-panel-titulo">Resultados por ejecutivo</div>
        <div className="fv2-panel-sub">Cuánto vendió cada uno de los leads calificados que recibió, y cómo le fue mes a mes</div>
      </div>
    </header>
    {tarjetas.length
      ? <div className="fv2-tarjetas-ejec">
        {tarjetas.map((t) => <Tarjeta key={t.name} t={t} meses={meses}
          onAbrir={() => setAsesorSel({ name: t.name, country: t.country, posicion: t.posicion })}
          onMes={(m) => setMesSel({ month: m.month, country: t.country, ejecutivo: t.name, leads: m.leads })} />)}
      </div>
      : <Vacio titulo="Sin ejecutivos con los filtros actuales" />}
    <footer className="fv2-equipo">
      <span>
        <b>Equipo:</b> {formatNumber(equipo.ventas)} ventas de {formatNumber(equipo.calificados)} calificados · {formatearRatio(equipo.ratio)} de conversión · {formatNumber(equipo.unidades)} unidades ·{' '}
        <span className={equipo.vencidos ? 'fv2-texto-rojo' : ''}>{formatNumber(equipo.vencidos)} vencidos</span>
      </span>
      <span className="fv2-tenue">El círculo es la conversión de calificados · verde ≥ {pct(LIMITES_CONVERSION.bueno)}, azul {pct(LIMITES_CONVERSION.bajo)}–{pct(LIMITES_CONVERSION.bueno)}, amarillo &lt; {pct(LIMITES_CONVERSION.bajo)} · clic en una tarjeta para ver su detalle</span>
    </footer>

    {asesorSel && <DetalleAsesor {...asesorSel} leads={leads} month={null}
      equipo={{ ratio: equipo.ratio, embudo: embudoEquipo }}
      onClose={() => setAsesorSel(null)} />}
    {mesSel && <DetalleMes {...mesSel} onClose={() => setMesSel(null)} />}
  </section>
}
