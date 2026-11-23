// Canales de marketing · Mailing: piezas visuales (forma de tarjetas, títulos y gráficos de la referencia visual de
// Mailing: tema negro y color por significado). Clases y colores en marketing-v2.css con prefijo mkv2-.
// Todo lo que se puede abrir es un botón: lleva a la sub-pestaña que corresponde (ver Mailing.jsx, «abrir»).
// Dinámico: los números se animan hacia su nuevo valor, las barras crecen y la dona aparece girando; todo se apaga con
// «reducir movimiento». Lo que lleva data-tip muestra un globo con el valor exacto (lo dibuja <Globo> en Mailing.jsx).
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Info, Lock, RefreshCw, X } from 'lucide-react'
import { COLORES, Insignia } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { NOMBRE_CARGO, numero, pct, SIN_CLASIFICAR } from '../../datos/calculos.js'
import { textosCampana } from '../../datos/campana.js'

/** true si la persona pidió «reducir movimiento» en su equipo (o si no hay navegador). */
export const menosMovimiento = () => typeof window === 'undefined' || !window.matchMedia
  || window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Valor que se anima hacia el número nuevo (al cargar sube desde 0; al cambiar un filtro va del valor anterior al
 * nuevo). Sin animación con «reducir movimiento» o si el valor no es un número.
 */
export function useValorAnimado(objetivo, ms = 700) {
  const inicial = typeof window === 'undefined' || menosMovimiento() || !Number.isFinite(objetivo) ? objetivo : 0
  const [valor, setValor] = useState(inicial)
  const actual = useRef(inicial)
  useEffect(() => {
    const desde = Number.isFinite(actual.current) ? actual.current : 0
    if (!Number.isFinite(objetivo) || desde === objetivo || menosMovimiento()) {
      actual.current = objetivo
      setValor(objetivo)
      return undefined
    }
    let id = 0
    const t0 = performance.now()
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / ms)
      const x = desde + (objetivo - desde) * (1 - (1 - p) ** 3)
      actual.current = x
      setValor(p < 1 ? x : objetivo)
      if (p < 1) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [objetivo, ms])
  return valor
}

/** Número animado. formato: cómo se escribe (por defecto, entero con separador de miles). */
export function Numero({ n, formato = (x) => numero(Math.round(x)) }) {
  const v = useValorAnimado(Number.isFinite(n) ? n : NaN)
  return Number.isFinite(n) ? formato(v) : <span className="fv2-tenue">—</span>
}
/** Porcentaje animado («81.2 %»), o «—». */
export const Pct = ({ n }) => (n === null || n === undefined ? <span className="fv2-tenue">—</span> : <Numero n={n} formato={pct} />)

/** Color por significado (los mismos que --mkv2-* de marketing-v2.css). */
export const COLOR_MAILING = {
  enviados: '#2f5d8a', entregados: '#18935f', apertura: '#2f86c9', clic: '#6650c8', temporal: '#d98b1f', duro: '#c9364b',
  amarillo: '#d9a520', gris: '#8c93a3',
}
/** Semáforo de entrega: 100 % verde · 90 % a 99,9 % amarillo · menos de 90 % rojo (la regla está en server/mailing/reglas.js). */
export const COLOR_SEMAFORO = { verde: COLOR_MAILING.entregados, amarillo: COLOR_MAILING.amarillo, rojo: COLOR_MAILING.duro }
export const TEXTO_WEBHOOK = 'Disponible para campañas con historial importado o enviadas después de activar el webhook.'

/** Un dato que no se puede calcular («—») siempre va en gris, nunca en color de alerta. */
const colorDe = (valor, color) => (valor === '—' ? COLOR_MAILING.gris : color)

/** Texto de una celda: «—» va en gris. */
export function Gris({ texto }) {
  return texto === '—' ? <span className="fv2-tenue">—</span> : texto
}

/** Envuelve en botón si hay acción; si no, en un div. tip = texto del globo (valor exacto). */
function Caja({ onClick, className, children, title, style, tip, ...resto }) {
  const comun = { className: onClick ? `${className} is-clic` : className, title: tip ? undefined : title, style, 'data-tip': tip, ...resto }
  return onClick
    ? <button type="button" {...comun} onClick={onClick} aria-label={tip}>{children}</button>
    : <div {...comun}>{children}</div>
}

/**
 * Globo con el valor exacto: sigue al mouse sobre cualquier elemento con data-tip dentro de la pestaña.
 * Devuelve los manejadores para el contenedor y el globo a dibujar.
 */
export function useGlobo() {
  const [globo, setGlobo] = useState(null)
  const mover = (e) => {
    const el = e.target?.closest?.('[data-tip]')
    const texto = el?.getAttribute('data-tip')
    if (!texto) { if (globo) setGlobo(null); return }
    const ancho = typeof window !== 'undefined' ? window.innerWidth : 1200
    setGlobo({ texto, x: Math.min(e.clientX + 14, ancho - 300), y: e.clientY + 16 })
  }
  const nodo = globo ? <div className="mkv2-globo" role="tooltip" style={{ left: globo.x, top: globo.y }}>{globo.texto}</div> : null
  return { manejadores: { onMouseMove: mover, onMouseLeave: () => setGlobo(null) }, nodo }
}

/**
 * Nombre de una campaña en toda la pestaña: ASUNTO arriba (cortado con «…») y debajo «#74 · NOMBRE REAL · fecha»
 * (más el cargo si se pide). El globo muestra los dos textos completos. campana puede faltar (solo id).
 */
export function TituloCampana({ campana, id = campana?.id, fecha = true, cargo = false, grande = false, className = '' }) {
  const t = textosCampana(campana, id, { fecha, cargo })
  return <span className={`mkv2-tc ${grande ? 'is-grande' : ''} ${className}`} data-tip={t.tip}>
    <strong className="mkv2-tc-titulo">{t.titulo}</strong>
    {t.linea && <small className="mkv2-tc-linea">{t.linea}</small>}
  </span>
}

/** Cifra de una tabla que se puede abrir (no activa el clic de la fila). */
export function Cifra({ n, onClick, tip }) {
  if (!onClick || !n) return <span data-tip={tip}>{numero(n)}</span>
  return <button type="button" className="mkv2-cifra" data-tip={tip} aria-label={tip} onClick={(e) => { e.stopPropagation(); onClick() }}>{numero(n)}</button>
}

/** Tarjeta con título, subtítulo y acciones a la derecha (como «card» + «toolbar» de la plantilla). */
export function Tarjeta({ titulo, sub, acciones, children, className = '' }) {
  return <section className={`mkv2-tarjeta ${className}`}>
    {(titulo || acciones) && <div className="mkv2-tarjeta-cabeza">
      <div>
        {titulo && <h2 className="mkv2-tarjeta-titulo">{titulo}</h2>}
        {sub && <p className="mkv2-tarjeta-sub">{sub}</p>}
      </div>
      {acciones && <div className="mkv2-acciones">{acciones}</div>}
    </div>}
    {children}
  </section>
}

/** Título de bloque en mayúsculas («ENTREGAS, REBOTES Y CALIDAD DE CONTACTOS»). */
export function Bloque({ titulo }) {
  return <div className="mkv2-seccion">{titulo}</div>
}

/**
 * Tarjeta de indicador como la de la referencia: ícono y título, número grande en su color, porcentaje con su base,
 * barrita del porcentaje (medidor: 0 a 100; null = sin barrita), texto corto y enlace abajo («Ver destinatarios ↗»).
 */
export function Kpi({ titulo, icono: Icono, valor, porcentaje, base, medidor = null, nota, enlace, color = COLOR_MAILING.enviados, onClick, title, tip }) {
  const ancho = Number.isFinite(medidor) ? Math.max(0, Math.min(100, medidor)) : null
  return <Caja onClick={onClick} className="mkv2-kpi-t" title={title} tip={tip} style={{ '--mkv2-acento': colorDe(valor, color) }}>
    <span className="mkv2-kpi-cabeza">
      {Icono && <span className="mkv2-kpi-icono" aria-hidden="true"><Icono size={15} strokeWidth={2.6} /></span>}
      <span className="mkv2-kpi-titulo">{titulo}</span>
    </span>
    <span className="mkv2-kpi-num">{valor}</span>
    {base && <span className="mkv2-kpi-base">{porcentaje && <b>{porcentaje}</b>} {base}</span>}
    {ancho !== null && <span className="mkv2-kpi-medidor" aria-hidden="true"><i style={{ '--mkv2-medida': `${ancho}%` }} /></span>}
    <span className="mkv2-kpi-sep" aria-hidden="true" />
    {nota && <span className="mkv2-kpi-nota">{nota}</span>}
    {onClick && enlace && <span className="mkv2-enlace">{enlace}<ArrowUpRight size={12} aria-hidden="true" /></span>}
  </Caja>
}

/** Indicador secundario (más chico), clicable si tiene acción. */
export function Mini({ nombre, valor, nota, color = COLORES.texto, onClick, enlace, activo = false, title, extra, tip }) {
  return <Caja onClick={onClick} className={`mkv2-mini ${activo ? 'is-activo' : ''}`} title={title} tip={tip} style={{ '--mkv2-color': colorDe(valor, color) }}>
    <span className="mkv2-mini-nombre">{nombre}</span>
    <span className="mkv2-mini-num">{valor}{extra}</span>
    {nota && <span className="mkv2-mini-nota">{nota}</span>}
    {onClick && enlace && <span className="mkv2-enlace">{enlace}<ArrowUpRight size={12} aria-hidden="true" /></span>}
  </Caja>
}

/**
 * Fila de barra: nombre · pista con barra de color (crece al cargar y se mueve al cambiar) · cifra animada.
 * meta: línea punteada en ese % (por ejemplo 90). Clicable si tiene acción. tip = valor exacto en el globo.
 */
export function FilaBarra({ nombre, valor, max, color, cifra, detalle, title, onClick, activa = false, meta = null, tip }) {
  const ancho = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0
  return <Caja onClick={onClick} className={`mkv2-erow ${activa ? 'is-activa' : ''}`} title={title} tip={tip}>
    <span className="mkv2-erow-nombre">{nombre}</span>
    <span className="mkv2-epista">
      <i style={{ width: `${ancho}%`, '--mkv2-barra': color }} />
      {meta !== null && <b className="mkv2-meta" style={{ left: `${meta}%` }} aria-hidden="true" />}
    </span>
    <span className="mkv2-enum">{cifra ?? <Numero n={valor} />}{detalle && <small>{detalle}</small>}</span>
  </Caja>
}

/**
 * Dona de incidencias (SVG): un sector por estado con separación entre colores, aparece girando; al pasar el mouse
 * por un sector o por su cajita de la leyenda, el centro muestra ese estado. Sectores, centro y leyenda se pueden abrir.
 * partes: [{nombre, valor, color, detalle, onClick}]
 */
export function DonaPartes({ partes, centro, etiqueta, total, onCentro }) {
  const [activa, setActiva] = useState(null)
  const R = 62
  const C = 2 * Math.PI * R
  const conValor = partes.filter((p) => p.valor > 0)
  const hueco = conValor.length > 1 ? 3.5 : 0
  let acumulado = 0
  const sectores = partes.map((p) => {
    const largo = total > 0 ? (p.valor / total) * C : 0
    const s = { ...p, largo: Math.max(0, largo - hueco), offset: -acumulado }
    acumulado += largo
    return s
  })
  const elegida = partes.find((p) => p.nombre === activa)
  const tipDe = (p) => `${p.nombre}: ${numero(p.valor)} de ${numero(total)} enviados (${p.detalle})`
  return <div className="mkv2-dona-area">
    <div className="mkv2-dona">
      <svg viewBox="0 0 160 160" className="mkv2-dona-svg" role="img" aria-label="Incidencias de entrega">
        <circle cx="80" cy="80" r={R} className="mkv2-dona-pista" />
        <g transform="rotate(-90 80 80)">
          {sectores.filter((s) => s.valor > 0).map((s) => <circle key={s.nombre} cx="80" cy="80" r={R} fill="none" stroke={s.color}
            strokeDasharray={`${s.largo} ${C}`} strokeDashoffset={s.offset} data-tip={tipDe(s)}
            className={`mkv2-dona-sector ${activa === s.nombre ? 'is-activa' : ''} ${s.onClick ? 'is-clic' : ''}`}
            onMouseEnter={() => setActiva(s.nombre)} onMouseLeave={() => setActiva(null)} onClick={s.onClick} />)}
        </g>
      </svg>
      <Caja onClick={elegida?.onClick ?? onCentro} className="mkv2-dona-centro" tip={elegida ? tipDe(elegida) : onCentro ? `Ver los destinatarios con rebote (${centro})` : undefined}>
        {elegida
          ? <><strong><Numero n={elegida.valor} /></strong><small>{elegida.nombre.toLowerCase()}</small></>
          : <><strong><Numero n={centro} /></strong><small>{etiqueta}</small></>}
      </Caja>
    </div>
    <div className="mkv2-dona-leyenda">
      {partes.map((p) => <Caja key={p.nombre} onClick={p.onClick} className={`mkv2-dona-item ${activa === p.nombre ? 'is-activa' : ''}`} tip={tipDe(p)}
        onMouseEnter={() => setActiva(p.nombre)} onMouseLeave={() => setActiva(null)}>
        <i style={{ background: p.color }} />
        <span>{p.nombre}</span>
        <b><Numero n={p.valor} /><small>{p.detalle}</small></b>
      </Caja>)}
    </div>
  </div>
}

/** Leyenda del semáforo de entrega con la meta de 90 %. */
export function LeyendaSemaforo() {
  return <div className="mkv2-leyenda-semaforo">
    <span><i style={{ background: COLOR_SEMAFORO.verde }} />100 %</span>
    <span><i style={{ background: COLOR_SEMAFORO.amarillo }} />90 % a 99,9 %</span>
    <span><i style={{ background: COLOR_SEMAFORO.rojo }} />menos de 90 %</span>
    <span><i className="mkv2-leyenda-meta" />Meta 90 %</span>
  </div>
}

/** Mini barra de un porcentaje dentro de una celda (por ejemplo, la apertura de cada campaña). */
export function MiniBarra({ tasa, color, tip }) {
  const ancho = Number.isFinite(tasa) ? Math.max(0, Math.min(100, tasa)) : 0
  return <span className="mkv2-minibarra" data-tip={tip} aria-hidden="true"><i style={{ width: `${ancho}%`, '--mkv2-barra': color }} /></span>
}

/** Píldora de la tasa de entrega con el color del semáforo (el semáforo solo va en la tasa). */
export function PildoraEntrega({ tasa, semaforo }) {
  if (tasa === null || tasa === undefined) return <span className="fv2-tenue">—</span>
  return <Insignia tono={semaforo ?? 'neutro'}>{pct(tasa)}</Insignia>
}

export function InsigniaCargo({ cargo, title }) {
  return <span title={title ?? NOMBRE_CARGO[cargo]}>
    {cargo === SIN_CLASIFICAR ? <Insignia>Sin clasificar</Insignia> : <Insignia tono="azul">{cargo}</Insignia>}
  </span>
}

/** Franja de aviso (amarilla como la «focus-strip» de la plantilla). */
export function Aviso({ titulo, texto, icono = 'alerta', onReintentar }) {
  const Icono = icono === 'candado' ? Lock : icono === 'info' ? Info : AlertTriangle
  return <div className="mkv2-foco" role="note">
    <Icono size={17} aria-hidden="true" />
    <div><strong>{titulo}</strong>{texto && <span>{texto}</span>}</div>
    {onReintentar && <button type="button" className="fv2-pildora mkv2-reintentar" onClick={onReintentar}><RefreshCw size={13} aria-hidden="true" />Reintentar</button>}
  </div>
}

/** Franja que dice qué indicador se está viendo (como el «drill-banner» de la plantilla). */
export function Enfoque({ titulo, detalle, onTodos, onVolver }) {
  return <div className="mkv2-enfoque" role="status">
    <div><strong>{titulo}</strong>{detalle && <span>{detalle}</span>}</div>
    <div className="mkv2-acciones">
      {onTodos && <button type="button" className="fv2-pildora" onClick={onTodos}><X size={13} />Ver todos</button>}
      {onVolver && <button type="button" className="fv2-pildora" onClick={onVolver}>Volver a resultados</button>}
    </div>
  </div>
}

/** Tabla con encabezados que ordenan al hacer clic (si la columna tiene «valor») y filas clicables (onFila). */
export function TablaOrdenable({ columnas, filas, clave, orden, onOrden, vacio, onFila, tituloFila }) {
  return <div className="fv2-tabla-caja">
    <table className="fv2-tabla mkv2-tabla">
      <thead><tr>{columnas.map((c) => {
        const activa = orden?.col === c.id
        const Flecha = !activa ? ArrowUpDown : orden.dir === 'asc' ? ArrowUp : ArrowDown
        return <th key={c.id} className={c.num ? 'num' : ''} scope="col" aria-sort={activa ? (orden.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
          {c.valor && onOrden
            ? <button type="button" className={`mkv2-orden ${activa ? 'is-activa' : ''}`} onClick={() => onOrden(c.id)}>{c.label}<Flecha size={12} aria-hidden="true" /></button>
            : c.label}
        </th>
      })}</tr></thead>
      <tbody>
        {filas.map((f) => <tr key={clave(f)} className={onFila ? 'mkv2-fila-clic' : undefined} onClick={onFila ? () => onFila(f) : undefined}
          title={onFila && tituloFila ? tituloFila(f) : undefined}>
          {columnas.map((c) => <td key={c.id} className={c.num ? 'num' : c.clase ?? ''}>{c.celda(f)}</td>)}
        </tr>)}
        {!filas.length && <tr><td colSpan={columnas.length} className="fv2-tabla-vacia">{vacio}</td></tr>}
      </tbody>
    </table>
  </div>
}

/** Tabla solo con encabezados y un mensaje (vistas con correos, que todavía no se pueden mostrar). */
export function TablaEstructura({ columnas, mensaje }) {
  return <div className="fv2-tabla-caja">
    <table className="fv2-tabla mkv2-tabla">
      <thead><tr>{columnas.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody><tr><td colSpan={columnas.length} className="fv2-tabla-vacia mkv2-vacio-fila">{mensaje}</td></tr></tbody>
    </table>
  </div>
}
