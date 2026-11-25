// Canales de marketing · Redes sociales · PUBLICACIONES (mockup v6): calendario del mes (color = marca, borde rojo = no
// salió, tenue = programada; clic marca la fila en la tabla), mejor día para publicar (interacciones promedio) y tabla
// ordenable de 10 filas con «Ver todas». Responde a todos los filtros, incluidos formato y estado (de las donas).
import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from 'lucide-react'
import { numero, pct } from '../../datos/calculos.js'
import { filtrarRedes, FORMATOS, MARCAS } from '../../datos/redes.js'
import { calendarioMes, DIAS, mejorDia, ordenarPublicaciones } from '../../datos/redesVista.js'
import { Tarjeta } from '../mailing/piezas.jsx'

const ESTADO = { publicada: ['is-pub', 'Publicada'], programada: ['is-prog', 'Programada'], no_publicada: ['is-no', 'No salió'] }
const ICONO_ESTADO = { publicada: '✔ Publicada', no_publicada: '✖ No salió', programada: '⏳ Programada' }
const VISIBLES = 10
const COLUMNAS = [
  { id: 'fecha', label: 'Fecha' }, { id: 'marca', label: 'Marca' }, { id: 'red', label: 'Red', fija: true }, { id: 'titulo', label: 'Publicación', fija: true },
  { id: 'estado', label: 'Estado', fija: true }, { id: 'alcance', label: 'Alcance', num: true }, { id: 'vistas', label: 'Vistas', num: true },
  { id: 'clics', label: 'Clics', num: true }, { id: 'interacciones', label: 'Interacciones', num: true }, { id: 'tasa', label: 'Tasa', num: true },
]
const horaTexto = (h) => (h == null ? '' : `${String(h).padStart(2, '0')}:00`)

function Calendario({ items, mes, hoy, marcada, onMarcar }) {
  const c = calendarioMes(items, mes)
  return <div className="mkv2-redes-cal">
    {DIAS.map((d) => <span key={d} className="mkv2-redes-cal-dn">{d.toUpperCase()}</span>)}
    {Array.from({ length: c.vacios }, (_, i) => <span key={`v${i}`} />)}
    {c.dias.map((d) => {
      const esHoy = d.fecha === hoy
      return <div key={d.fecha} className={`mkv2-redes-dia ${esHoy ? 'is-hoy' : ''}`} style={{ animationDelay: `${d.dia * 0.01}s` }}>
        <span className="mkv2-redes-dia-n">{d.dia}{esHoy ? ' · hoy' : ''}</span>
        <span className="mkv2-redes-pills">
          {d.items.map((p) => <button type="button" key={p.id} className={`mkv2-redes-pill is-${p.estado} ${marcada === p.id ? 'is-marcada' : ''}`} style={{ '--c': MARCAS[p.marca]?.color }}
            onClick={() => onMarcar(p.id)} aria-label={`${p.titulo} · ${ICONO_ESTADO[p.estado]}`}
            data-tip={`${p.titulo}\n${MARCAS[p.marca]?.corto} · ${p.red === 'fb' ? 'Facebook' : 'Instagram'} · ${FORMATOS[p.formato] ?? p.formato}\n${ICONO_ESTADO[p.estado]}`} />)}
        </span>
      </div>
    })}
  </div>
}

function MejorDia({ items }) {
  const { dias, mejor } = mejorDia(items)
  const max = Math.max(1, ...dias.map((d) => d.promedio))
  return <div className="mkv2-redes-dias">
    {dias.map((d) => <div key={d.dia} className={`mkv2-redes-dia-col ${d.dia === mejor ? 'is-mejor' : ''}`}
      data-tip={`${d.nombre}\n${numero(d.publicaciones)} publicaciones · ${numero(Math.round(d.promedio))} interacciones promedio`}>
      <span className="mkv2-redes-dia-barra"><i style={{ '--alto': `${(d.promedio / max) * 100}%` }}>{d.dia === mejor && <b>★</b>}</i></span>
      <small>{d.nombre}</small>
    </div>)}
  </div>
}

export function PublicacionesRedes({ datos, items, filtros }) {
  const [orden, setOrden] = useState({ col: 'fecha', dir: 'asc' })
  const [todas, setTodas] = useState(false)
  const [marcada, setMarcada] = useState(null)
  const lista = useMemo(() => ordenarPublicaciones(filtrarRedes(items, filtros), orden.col, orden.dir), [items, filtros, orden])
  // Mejor día: publicadas del mes con marca, país y red (sin formato ni estado), como el Resumen.
  const paraDias = useMemo(() => filtrarRedes(items, { ...filtros, formato: '', estado: '' }), [items, filtros])
  const visibles = todas || marcada ? lista : lista.slice(0, VISIBLES)
  const cambiarOrden = (id) => setOrden((o) => ({ col: id, dir: o.col === id ? (o.dir === 'asc' ? 'desc' : 'asc') : ['fecha', 'marca'].includes(id) ? 'asc' : 'desc' }))
  useEffect(() => { if (marcada) document.getElementById(`mkv2-redes-fila-${marcada}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [marcada])

  return <>
    <div className="mkv2-duo mkv2-redes-duo-cal">
      <Tarjeta titulo="Calendario del mes" sub="Hora de Guatemala/El Salvador · color = marca · borde rojo = no salió · tenue = programada · clic marca la fila">
        <Calendario items={lista} mes={filtros.mes} hoy={datos.hoy} marcada={marcada} onMarcar={(id) => setMarcada((m) => (m === id ? null : id))} />
      </Tarjeta>
      <Tarjeta titulo="Mejor día para publicar" sub="Interacciones promedio de las publicadas, por día en hora de Guatemala/El Salvador · ★ el mejor">
        <MejorDia items={paraDias} />
      </Tarjeta>
    </div>
    <Tarjeta titulo={`Publicaciones · ${numero(lista.length)}`} sub="Clic en un encabezado para ordenar">
      <div className="fv2-tabla-caja">
        <table className="fv2-tabla mkv2-tabla mkv2-redes-tabla">
          <thead><tr>{COLUMNAS.map((c) => {
            const activa = orden.col === c.id
            const Flecha = !activa ? ArrowUpDown : orden.dir === 'asc' ? ArrowUp : ArrowDown
            return <th key={c.id} className={c.num ? 'num' : ''} scope="col" aria-sort={activa ? (orden.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
              {c.fija ? c.label : <button type="button" className={`mkv2-orden ${activa ? 'is-activa' : ''}`} onClick={() => cambiarOrden(c.id)}>{c.label}<Flecha size={12} aria-hidden="true" /></button>}
            </th>
          })}</tr></thead>
          <tbody>
            {visibles.map((p) => <tr key={p.id} id={`mkv2-redes-fila-${p.id}`} className={marcada === p.id ? 'is-marcada' : ''}>
              <td className="fv2-sin-salto" data-tip={p.hora != null ? `Hora de Guatemala/El Salvador: ${horaTexto(p.hora)}` : undefined}>{p.fecha.slice(8, 10)}/{p.fecha.slice(5, 7)}</td>
              <td><span className="mkv2-redes-punto" style={{ background: MARCAS[p.marca]?.color }} />{MARCAS[p.marca]?.corto}</td>
              <td><span className={`mkv2-redes-red is-${p.red}`}>{p.red === 'fb' ? 'FB' : 'IG'}</span></td>
              <td className="mkv2-celda-media"><b>{p.titulo}</b> <small className="fv2-tenue">{FORMATOS[p.formato] ?? p.formato}</small>
                {p.enlace && <a className="mkv2-redes-enlace" href={p.enlace} target="_blank" rel="noopener noreferrer" aria-label="Ver la publicación"><ExternalLink size={12} /></a>}</td>
              <td><span className={`mkv2-redes-est ${ESTADO[p.estado]?.[0] ?? ''}`}>{ESTADO[p.estado]?.[1] ?? p.estado}</span></td>
              <td className="num">{p.alcance ? numero(p.alcance) : '—'}</td>
              <td className="num">{p.vistas ? numero(p.vistas) : '—'}</td>
              <td className="num" data-tip={p.red === 'ig' ? 'Instagram no da clics por publicación' : undefined}>{p.clics ? numero(p.clics) : '—'}</td>
              <td className="num">{p.interacciones ? numero(p.interacciones) : '—'}</td>
              <td className="num">{p.alcance ? pct((p.interacciones / p.alcance) * 100) : '—'}</td>
            </tr>)}
            {!lista.length && <tr><td colSpan={COLUMNAS.length} className="fv2-tabla-vacia">Sin publicaciones con estos filtros</td></tr>}
          </tbody>
        </table>
      </div>
      {lista.length > VISIBLES && !marcada && <button type="button" className="fv2-pildora mkv2-redes-ver" onClick={() => setTodas((t) => !t)}>{todas ? 'Ver menos' : `Ver todas (${numero(lista.length)})`}</button>}
      {marcada && <button type="button" className="fv2-pildora mkv2-redes-ver" onClick={() => setMarcada(null)}>Quitar la marca</button>}
    </Tarjeta>
  </>
}
