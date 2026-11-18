// Redes sociales · barra de filtros (Marca, País, Red, Período). Afectan a las dos pestañas.
import { RotateCcw } from 'lucide-react'
import { FILTROS_VACIOS, MARCAS, PAISES, REDES } from '../logica/calculos.js'
import { entero, mesCorto } from '../logica/formato.js'

function Selector({ etiqueta, valor, opciones, onCambio, todos }) {
  return <label className={`rds-filtro ${valor ? 'is-activo' : ''}`}>
    <span>{etiqueta}</span>
    <select value={valor ?? ''} onChange={(e) => onCambio(e.target.value || null)}>
      <option value="">{todos}</option>
      {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
    </select>
  </label>
}

export function textoFiltros(filtros) {
  const marca = MARCAS.find((m) => m.clave === filtros.marca)?.nombre ?? 'Todas'
  const pais = PAISES.find((p) => p.clave === filtros.pais)?.nombre ?? 'Todos'
  const periodo = filtros.desde || filtros.hasta ? `${filtros.desde ? mesCorto(filtros.desde, true) : 'inicio'} – ${filtros.hasta ? mesCorto(filtros.hasta, true) : 'último mes'}` : 'Todo'
  return `Marca: ${marca} · País: ${pais} · Red: ${filtros.red ?? 'Todas'} · Período: ${periodo}`
}

export function Filtros({ filtros, setFiltros, meses, publicaciones }) {
  const activos = Object.values(filtros).filter(Boolean).length
  const cambiar = (clave) => (valor) => setFiltros((f) => {
    const nuevo = { ...f, [clave]: valor }
    // Marca y país deben ser compatibles (Datared y RED El Salvador son de SV).
    if (clave === 'marca' && valor && f.pais && MARCAS.find((m) => m.clave === valor)?.pais !== f.pais) nuevo.pais = null
    if (clave === 'pais' && valor && f.marca && MARCAS.find((m) => m.clave === f.marca)?.pais !== valor) nuevo.marca = null
    if (clave === 'desde' && valor && f.hasta && valor > f.hasta) nuevo.hasta = valor
    if (clave === 'hasta' && valor && f.desde && valor < f.desde) nuevo.desde = valor
    return nuevo
  })
  const opcionesMes = meses.map((m) => ({ valor: m, texto: mesCorto(m, true) }))
  return <section className="rds-filtros" aria-label="Filtros">
    <span className="rds-filtros-titulo">Filtros</span>
    <Selector etiqueta="Marca" valor={filtros.marca} todos="Todas" onCambio={cambiar('marca')}
      opciones={MARCAS.map((m) => ({ valor: m.clave, texto: `${m.nombre} (${m.pais})` }))} />
    <Selector etiqueta="País" valor={filtros.pais} todos="Todos" onCambio={cambiar('pais')}
      opciones={PAISES.map((p) => ({ valor: p.clave, texto: `${p.nombre} (${p.clave})` }))} />
    <Selector etiqueta="Red" valor={filtros.red} todos="Todas" onCambio={cambiar('red')}
      opciones={REDES.map((r) => ({ valor: r, texto: r }))} />
    <Selector etiqueta="Desde" valor={filtros.desde} todos={meses[0] ? mesCorto(meses[0], true) : 'Inicio'} onCambio={cambiar('desde')} opciones={opcionesMes} />
    <Selector etiqueta="Hasta" valor={filtros.hasta} todos={meses.length ? mesCorto(meses[meses.length - 1], true) : 'Fin'} onCambio={cambiar('hasta')} opciones={opcionesMes} />
    {activos > 0 && <button type="button" className="rds-boton-chico" onClick={() => setFiltros(FILTROS_VACIOS)}><RotateCcw size={13} aria-hidden="true" /> Limpiar ({activos})</button>}
    <span className="rds-filtros-cuenta">Datos de métricas RRSS de Marketing · {entero(publicaciones)} {publicaciones === 1 ? 'publicación' : 'publicaciones'}</span>
  </section>
}
