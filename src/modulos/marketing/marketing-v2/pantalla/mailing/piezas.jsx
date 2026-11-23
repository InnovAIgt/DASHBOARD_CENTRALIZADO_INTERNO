// Canales de marketing · Mailing: piezas visuales (forma de tarjetas, títulos y gráficos de la referencia visual de
// Mailing: tema negro y color por significado). Clases y colores en marketing-v2.css con prefijo mkv2-.
// Todo lo que se puede abrir es un botón: lleva a la sub-pestaña que corresponde (ver Mailing.jsx, «abrir»).
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Info, Lock, X } from 'lucide-react'
import { COLORES, Insignia } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { NOMBRE_CARGO, numero, pct, SIN_CLASIFICAR } from '../../datos/calculos.js'

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

/** Envuelve en botón si hay acción; si no, en un div. */
function Caja({ onClick, className, children, title, style }) {
  return onClick
    ? <button type="button" className={`${className} is-clic`} onClick={onClick} title={title} style={style}>{children}</button>
    : <div className={className} title={title} style={style}>{children}</div>
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
export function Kpi({ titulo, icono: Icono, valor, porcentaje, base, medidor = null, nota, enlace, color = COLOR_MAILING.enviados, onClick, title }) {
  const ancho = Number.isFinite(medidor) ? Math.max(0, Math.min(100, medidor)) : null
  return <Caja onClick={onClick} className="mkv2-kpi-t" title={title} style={{ '--mkv2-acento': colorDe(valor, color) }}>
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
export function Mini({ nombre, valor, nota, color = COLORES.texto, onClick, enlace, activo = false, title, extra }) {
  return <Caja onClick={onClick} className={`mkv2-mini ${activo ? 'is-activo' : ''}`} title={title} style={{ '--mkv2-color': colorDe(valor, color) }}>
    <span className="mkv2-mini-nombre">{nombre}</span>
    <span className="mkv2-mini-num">{valor}{extra}</span>
    {nota && <span className="mkv2-mini-nota">{nota}</span>}
    {onClick && enlace && <span className="mkv2-enlace">{enlace}<ArrowUpRight size={12} aria-hidden="true" /></span>}
  </Caja>
}

/** Fila del recorrido o de una comparación: nombre · pista con barra · cifra. Clicable si tiene acción. */
export function FilaBarra({ nombre, valor, max, color, cifra, detalle, title, onClick, activa = false }) {
  const ancho = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0
  return <Caja onClick={onClick} className={`mkv2-erow ${activa ? 'is-activa' : ''}`} title={title}>
    <span className="mkv2-erow-nombre">{nombre}</span>
    <span className="mkv2-epista"><i style={{ width: `${ancho}%`, background: color }} /></span>
    <span className="mkv2-enum">{cifra ?? numero(valor)}{detalle && <small>{detalle}</small>}</span>
  </Caja>
}

/** Dona por partes (gradiente cónico), con texto al centro y leyenda a la derecha; cada parte se puede abrir. */
export function DonaPartes({ partes, centro, etiqueta, total, onCentro }) {
  let inicio = 0
  const tramos = total > 0
    ? partes.map((p) => { const fin = inicio + (p.valor / total) * 100; const t = `${p.color} ${inicio}% ${fin}%`; inicio = fin; return t })
    : ['var(--fv2-borde-fuerte) 0% 100%']
  return <div className="mkv2-dona-area">
    <Caja onClick={onCentro} className="mkv2-dona" style={{ background: `conic-gradient(${tramos.join(', ')})` }}
      title={onCentro ? 'Ver los destinatarios con rebote' : undefined}>
      <span className="mkv2-dona-centro"><strong>{centro}</strong><small>{etiqueta}</small></span>
    </Caja>
    <div className="mkv2-dona-leyenda">
      {partes.map((p) => <Caja key={p.nombre} onClick={p.onClick} className="mkv2-dona-item" title={p.onClick ? `Ver «${p.nombre}»` : undefined}>
        <i style={{ background: p.color }} />
        <span>{p.nombre}</span>
        <b>{numero(p.valor)}<small>{p.detalle}</small></b>
      </Caja>)}
    </div>
  </div>
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
export function Aviso({ titulo, texto, icono = 'alerta' }) {
  const Icono = icono === 'candado' ? Lock : icono === 'info' ? Info : AlertTriangle
  return <div className="mkv2-foco" role="note">
    <Icono size={17} aria-hidden="true" />
    <div><strong>{titulo}</strong>{texto && <span>{texto}</span>}</div>
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
