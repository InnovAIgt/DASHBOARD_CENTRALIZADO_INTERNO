// Marketing por canales · "Métricas de interacción": 4 anillos dibujados a mano (SVG, sin librerías),
// con el formato del dashboard original "Campañas de correo" (.ring / .r-sub / .r-def / .r-bench).
// Color del anillo = su evaluación (D26): Excelente verde, Promedio azul, Bajo amarillo,
// Crítico rojo (solo entrega < 90 %).
import { Explicacion } from './comunes.jsx'
import { ESTADO_NIVEL, NIVELES, evaluar, formatoNumero, formatoPct, textoRangos } from './datos.js'

const R = 58
const CIRCUNFERENCIA = 2 * Math.PI * R

/** Los 4 anillos, con su "X de Y" y su línea de explicación. */
export const ANILLOS = [
  { campo: 'pctEntrega', corto: 'ENTREGA', parte: 'entregados', total: 'enviados', de: 'enviados', linea: 'Correos aceptados por los servidores' },
  { campo: 'pctApertura', corto: 'APERTURA', parte: 'aperturasReales', total: 'entregados', de: 'entregados', linea: 'Personas que lo abrieron (sin automáticas)' },
  { campo: 'pctClic', corto: 'CTR', parte: 'personasConClic', total: 'entregados', de: 'entregados', linea: 'Personas que dieron clic' },
  { campo: 'pctCtor', corto: 'CTOR', parte: 'personasConClic', total: 'aperturasReales', de: 'aperturas', linea: 'De quienes abrieron, cuántos dieron clic' },
]

function Anillo({ m, anillo, definicion }) {
  const p = m[anillo.campo]
  const nivel = evaluar(anillo.campo, p)
  const estado = ESTADO_NIVEL[nivel]
  const avance = p == null ? 0 : Math.max(0, Math.min(1, p))
  const textoPct = p == null ? '—' : formatoPct(p)
  return <div className={`mkt-ring is-${estado}`}>
    <svg width="130" height="130" viewBox="0 0 140 140" role="img"
      aria-label={`${anillo.corto}: ${p == null ? 'pocos datos' : textoPct}, ${NIVELES[nivel].texto}`}>
      <circle className="mkt-ring-fondo" cx="70" cy="70" r={R} />
      <circle className="mkt-ring-avance" cx="70" cy="70" r={R} strokeDasharray={`${CIRCUNFERENCIA * avance} ${CIRCUNFERENCIA}`} transform="rotate(-90 70 70)" />
      <text className="mkt-ring-pct" x="70" y="68">{p == null ? 'pocos' : textoPct}</text>
      <text className="mkt-ring-nombre" x="70" y="88">{p == null ? 'DATOS' : anillo.corto}</text>
    </svg>
    <div className="mkt-r-sub">{formatoNumero(m[anillo.parte])} de {formatoNumero(m[anillo.total])} {anillo.de} <Explicacion texto={definicion} /></div>
    <div className="mkt-r-def">{anillo.linea}</div>
    <div className={`mkt-r-bench mkt-b-${estado}`}>
      <span>● {NIVELES[nivel].texto}</span>
      <span className="mkt-r-note">{textoRangos(anillo.campo).join(' · ')}</span>
    </div>
  </div>
}

export function MetricasInteraccion({ m, definiciones }) {
  return <div className="mkt-rings">
    {ANILLOS.map((a) => <Anillo key={a.campo} m={m} anillo={a} definicion={definiciones[a.campo]} />)}
  </div>
}
