// Marketing por canales · gráficas dibujadas a mano (sin librerías), con el formato del mockup aprobado:
// "Aperturas por cargo", "Evolución por mes" y "Embudo de conversión".
// Las cifras vienen calculadas del servidor; aquí solo se dibujan.
import { Explicacion } from './comunes.jsx'
import { ESTADO_NIVEL, NIVELES, REFERENCIAS, bloque, evaluar, formatoMes, formatoNumero, formatoPct } from './datos.js'

// ------------------------------------------------------------------ aperturas por cargo

export function AperturasPorCargo({ porCargo, vista, def }) {
  // De mayor a menor % de apertura (los de pocos datos, al final), como el mockup.
  const filas = porCargo.map((g) => ({ cargo: g.cargo, m: bloque(g, vista) }))
    .sort((a, b) => (b.m.pctApertura ?? -1) - (a.m.pctApertura ?? -1))
  const { promedio, excelente } = REFERENCIAS.pctApertura
  // Escala 0–30 %; si algún cargo pasa de 30 %, se amplía al siguiente 10 %.
  const tope = Math.max(excelente, Math.ceil(Math.max(0, ...filas.map((f) => f.m.pctApertura ?? 0)) * 10) / 10)
  const pos = (p) => `${(p / tope) * 100}%`
  const marcas = Array.from({ length: Math.round(tope * 10) + 1 }, (_, i) => i / 10)
  return <div className="mkt-card">
    <div className="mkt-card-cabeza">
      <div>
        <h3 className="mkt-card-title">Aperturas por cargo <Explicacion texto={def.cargo} /></h3>
        <p className="mkt-card-caption">% de apertura real · cargo tomado del nombre de la campaña</p>
      </div>
      <div className="mkt-leyenda-vertical">
        <span><i className="mkt-guia is-info" aria-hidden="true" />{formatoPct(promedio, 0)} promedio</span>
        <span><i className="mkt-guia is-ok" aria-hidden="true" />{formatoPct(excelente, 0)} excelente</span>
      </div>
    </div>
    {filas.length === 0 && <p className="mkt-tenue">Sin campañas.</p>}
    <div className="mkt-cargos">
      {filas.map(({ cargo, m }) => {
        const nivel = evaluar('pctApertura', m.pctApertura)
        const estado = ESTADO_NIVEL[nivel]
        return <div key={cargo}>
          <div className="mkt-cargo-fila">
            <span className="mkt-cargo-nombre">{cargo}</span>
            <span className={`mkt-cargo-pct mkt-is-${estado}`}>{m.pctApertura == null ? 'pocos datos' : formatoPct(m.pctApertura)}
              {' '}<span className={`mkt-pill mkt-b-${estado}`}>{NIVELES[nivel].texto}</span></span>
          </div>
          <div className="mkt-cargo-pista" role="img" aria-label={`${cargo}: ${m.pctApertura == null ? 'pocos datos' : formatoPct(m.pctApertura)} de apertura`}>
            <div className={`mkt-cargo-relleno mkt-fondo-${estado}`} style={{ width: m.pctApertura == null ? 0 : pos(m.pctApertura) }} />
            <div className="mkt-guia-linea is-info" style={{ left: pos(promedio) }} aria-hidden="true" />
            <div className="mkt-guia-linea is-ok" style={{ left: `calc(${pos(excelente)} - 2px)` }} aria-hidden="true" />
          </div>
          <div className="mkt-cargo-sub">{formatoNumero(m.aperturasReales)} de {formatoNumero(m.entregados)} entregados · CTR {formatoPct(m.pctClic)} · CTOR {formatoPct(m.pctCtor)}</div>
        </div>
      })}
      <div className="mkt-escala" aria-hidden="true">{marcas.map((x) => <span key={x}>{formatoPct(x, 0)}</span>)}</div>
    </div>
  </div>
}

// ------------------------------------------------------------------ evolución por mes

// Barras en azul/gris (no son un semáforo); los colores de estado solo van en las 3 mini tarjetas.
const SERIES = [
  { campo: 'enviados', label: 'Enviados', clase: 'is-s1' },
  { campo: 'entregados', label: 'Entregados', clase: 'is-s2' },
  { campo: 'aperturasReales', label: 'Aperturas', clase: 'is-s3' },
  { campo: 'personasConClic', label: 'Clics', clase: 'is-s4' },
]
const MINIS = [['pctEntrega', 'Entrega'], ['pctApertura', 'Apertura'], ['pctClic', 'CTR']]
const ALTO = 159
const BASE = 179
const ANCHO_BARRA = 44
const ANCHO_GRUPO = 4 * (ANCHO_BARRA + 8) + 22
const ESPACIOS_MINIMOS = 2

/** Tope del eje con 3 tramos de números redondos (p. ej. 853 → 900: 0 · 300 · 600 · 900). */
export function topeBonito(n) {
  if (n <= 0) return 3
  const tramo = n / 3
  const base = 10 ** Math.floor(Math.log10(tramo))
  const paso = [1, 2, 2.5, 3, 4, 5, 10].map((x) => x * base).find((x) => x >= tramo)
  return paso * 3
}

export function EvolucionPorMes({ meses, vista }) {
  const filas = meses.map((m) => ({ mes: m.mes, d: bloque(m, vista) }))
  const ultimo = filas.at(-1)
  const tope = topeBonito(Math.max(0, ...filas.flatMap((f) => SERIES.map((s) => f.d[s.campo]))))
  const y = (v) => BASE - (v / tope) * ALTO
  const espacios = Math.max(filas.length, ESPACIOS_MINIMOS)
  const ancho = 44 + espacios * ANCHO_GRUPO
  return <div className="mkt-card">
    <h3 className="mkt-card-title">Evolución por mes</h3>
    <p className="mkt-card-caption">Volumen del envío y resultado de cada mes</p>
    {ultimo && <div className="mkt-minis">
      {MINIS.map(([campo, nombre]) => {
        const estado = ESTADO_NIVEL[evaluar(campo, ultimo.d[campo])]
        return <div key={campo} className={`mkt-mini mkt-st-${estado}`}>
          <div className="mkt-mini-nombre">{nombre}</div>
          <div className={`mkt-mini-valor mkt-is-${estado}`}>{ultimo.d[campo] == null ? '—' : formatoPct(ultimo.d[campo])}</div>
        </div>
      })}
    </div>}
    {filas.length === 0 ? <p className="mkt-tenue">Todavía no hay meses con campañas.</p>
      : <div className="mkt-grafica-envoltura"><svg className="mkt-grafica" viewBox={`0 0 ${ancho} 214`} style={{ minWidth: Math.min(ancho, 520) }} role="img"
        aria-label={filas.map((f) => `${formatoMes(f.mes, true)}: ${SERIES.map((s) => `${formatoNumero(f.d[s.campo])} ${s.label.toLowerCase()}`).join(', ')}`).join('; ')}>
        {[0, 1 / 3, 2 / 3, 1].map((k) => <g key={k}>
          <line x1="44" x2={ancho - 10} y1={y(tope * k)} y2={y(tope * k)} className={k === 0 ? 'mkt-eje' : 'mkt-guia-h'} />
          <text x="38" y={y(tope * k) + 3} className="mkt-eje-texto" textAnchor="end">{formatoNumero(Math.round(tope * k))}</text>
        </g>)}
        {filas.map((f, i) => {
          const x0 = 70 + i * ANCHO_GRUPO
          return <g key={f.mes}>
            {SERIES.map((s, j) => {
              const v = f.d[s.campo]
              const alto = Math.max(v > 0 ? 3 : 0, BASE - y(v))
              const x = x0 + j * (ANCHO_BARRA + 8)
              return <g key={s.campo}>
                <rect x={x} y={BASE - alto} width={ANCHO_BARRA} height={alto} rx="4" className={`mkt-serie ${s.clase}`}><title>{`${formatoMes(f.mes, true)} · ${s.label}: ${formatoNumero(v)}`}</title></rect>
                <text x={x + ANCHO_BARRA / 2} y={BASE - alto - 6} className="mkt-barra-numero" textAnchor="middle">{formatoNumero(v)}</text>
                <text x={x + ANCHO_BARRA / 2} y={194} className="mkt-eje-texto" textAnchor="middle">{s.label}</text>
              </g>
            })}
            <text x={x0 + (4 * (ANCHO_BARRA + 8) - 8) / 2} y={210} className="mkt-mes-texto" textAnchor="middle">{formatoMes(f.mes, true)}</text>
          </g>
        })}
        {filas.length < ESPACIOS_MINIMOS && <g>
          <rect x={70 + filas.length * ANCHO_GRUPO} y={BASE - ALTO + 8} width={ANCHO_GRUPO - 30} height={ALTO - 8} rx="8" className="mkt-hueco" />
          <text x={70 + filas.length * ANCHO_GRUPO + (ANCHO_GRUPO - 30) / 2} y={98} className="mkt-eje-texto" textAnchor="middle">Aquí aparecerán</text>
          <text x={70 + filas.length * ANCHO_GRUPO + (ANCHO_GRUPO - 30) / 2} y={114} className="mkt-eje-texto" textAnchor="middle">los próximos meses</text>
        </g>}
      </svg></div>}
    <div className="mkt-leyenda">{SERIES.map((s) => <span key={s.campo}><i className={`mkt-serie ${s.clase}`} />{s.label}</span>)}</div>
    {filas.length < 2 && <p className="mkt-card-pie">Con un solo mes todavía no hay tendencia. Al sumar meses, se compara mes contra mes.
      {ultimo && <> Las mini tarjetas son de {formatoMes(ultimo.mes, true)}.</>}</p>}
  </div>
}

// ------------------------------------------------------------------ embudo de conversión

export function Embudo({ m }) {
  const pasos = [
    { label: 'Enviados', valor: m.enviados },
    { label: 'Entregados', valor: m.entregados, extra: formatoPct(m.pctEntrega) },
    { label: 'Aperturas', valor: m.aperturasReales },
    { label: 'Clics', valor: m.personasConClic },
  ]
  return <div className="mkt-card">
    <h3 className="mkt-card-title">Embudo de conversión</h3>
    <div className="mkt-embudo" role="list">
      {pasos.map((p) => <div key={p.label} className="mkt-fun-row" role="listitem">
        <span className="mkt-fun-lbl">{p.label}</span>
        <div className="mkt-fun-bar" style={{ width: m.enviados ? `${(p.valor / m.enviados) * 100}%` : 0 }}>
          {formatoNumero(p.valor)}{p.extra && p.extra !== '—' ? ` · ${p.extra}` : ''}
        </div>
      </div>)}
    </div>
  </div>
}
