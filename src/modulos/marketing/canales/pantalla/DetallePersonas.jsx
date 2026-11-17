// Marketing por canales · "Quién abrió y quién hizo clic" dentro de la ventana de detalle (D34).
// ⚠️ Muestra correos de clientes. Se pide aparte (/api/marketing/mailing-detalle), solo al abrir la
// ventana, con clave. Sin descarga ni exportación. La clave vive solo en la memoria de la página:
// al recargar, se vuelve a pedir.
import { useEffect, useId, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { pedirDetallePersonas } from '../servicios/api.js'
import { formatoNumero } from './datos.js'

let claveEnMemoria = null

/** Color de cada resultado: verde clic · azul abrió · gris automático/no abrió/sin estado · amarillo temporal o baja · rojo permanente o queja. */
export const ESTADO_RESULTADO = {
  clic: 'ok', abrio: 'info', automatico: 'na', sinAbrir: 'na', sinEstado: 'na',
  temporal: 'warn', baja: 'warn', permanente: 'bad', queja: 'bad',
}

const NOTA_LECTURA = 'Ningún sistema de correo mide si alguien leyó el contenido. Tomamos como lectura la apertura real (sin las automáticas del iPhone); el clic es la señal más segura de interés.'

const ETIQUETAS_CUADRE = {
  enviados: 'personas', entregados: 'entregados', aperturasReales: 'aperturas reales', personasConClic: 'con clic',
  rebotesPermanentes: 'rebotes permanentes', rebotesTemporales: 'rebotes temporales', sinEstado: 'sin estado', bajas: 'bajas', quejas: 'quejas',
}

/** "2026-11-11T15:37:10" → "11/11/2026 15:37"; "ilegible" → "fecha ilegible". */
function fechaLegible(iso) {
  if (!iso) return '—'
  if (iso === 'ilegible') return 'fecha ilegible'
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : iso
}

/** La lista ya cargada (sin pedidos): se usa también en las pruebas y capturas. */
export function ListaPersonas({ detalle, tarjetaPantalla }) {
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const idBuscar = useId()
  const textos = Object.fromEntries(detalle.resultados.map((r) => [r.clave, r.texto]))
  const { lista, tarjeta, cuadra, campos } = detalle.cuadre
  // ¿Cambiaron los datos entre la página y esta lista? (en Vercel cada función guarda su propia lectura)
  const cambiaron = tarjetaPantalla && campos.some((k) => tarjetaPantalla[k] !== tarjeta[k])
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return detalle.personas.filter((p) => (filtro === 'todos' || p.resultado === filtro) && (!texto || p.correo.includes(texto)))
  }, [detalle, filtro, busqueda])
  // Siempre las 6 cifras principales; sin estado, bajas y quejas solo si hay alguna.
  const SIEMPRE = ['enviados', 'entregados', 'aperturasReales', 'personasConClic', 'rebotesPermanentes', 'rebotesTemporales']
  const resumen = campos.filter((k) => SIEMPRE.includes(k) || lista[k] > 0)
    .map((k) => `${formatoNumero(lista[k])} ${ETIQUETAS_CUADRE[k]}`).join(' · ')

  return <div className="mkt-personas">
    <p className="mkt-personas-nota">{NOTA_LECTURA}</p>

    <div className={`mkt-cuadre ${cuadra ? 'is-ok' : 'is-bad'}`} role="status">
      <div><b>{resumen}</b> · {cuadra ? '✓ cuadra con la tarjeta de la campaña' : '✗ NO cuadra con la tarjeta: revisa los datos'}</div>
      <div className="mkt-cuadre-explica">
        Los botones cuentan el <b>resultado final</b> de cada persona. Quien hizo clic y después rebotó, se dio de baja o se quejó aparece
        en ese grupo (con la marca "había hecho clic"); por eso "Hizo clic" puede ser menor que "personas con clic".
      </div>
      {cambiaron && <div className="mkt-cuadre-cambio">Los datos cambiaron desde la última lectura de la página: presiona "Actualizar".</div>}
    </div>

    <div className="mkt-personas-filtros">
      <div className="mkt-personas-botones" role="group" aria-label="Filtrar por resultado">
        <button type="button" className={`mkt-fxb ${filtro === 'todos' ? 'is-activa' : ''}`} aria-pressed={filtro === 'todos'}
          onClick={() => setFiltro('todos')}>Todos ({formatoNumero(detalle.personas.length)})</button>
        {detalle.resultados.filter((r) => detalle.conteos[r.clave] > 0).map((r) => <button key={r.clave} type="button"
          className={`mkt-fxb mkt-filtro-${ESTADO_RESULTADO[r.clave]} ${filtro === r.clave ? 'is-activa' : ''}`} aria-pressed={filtro === r.clave}
          onClick={() => setFiltro(r.clave)}>{r.texto} ({formatoNumero(detalle.conteos[r.clave])})</button>)}
      </div>
      <label className="mkt-buscador" htmlFor={idBuscar}>
        <Search size={14} aria-hidden="true" />
        <span className="mkt-solo-lector">Buscar por correo</span>
        <input id={idBuscar} type="search" placeholder="Buscar por correo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} autoComplete="off" />
      </label>
    </div>

    <div className="mkt-personas-tabla">
      <table className="mkt-tabla">
        <thead><tr>
          <th scope="col">Correo</th><th scope="col">País</th><th scope="col">Resultado</th>
          <th scope="col" className="mkt-num">Clics</th><th scope="col">Enlace(s) que tocó</th><th scope="col">Fecha del evento final</th>
        </tr></thead>
        <tbody>
          {visibles.length === 0 && <tr><td colSpan={6} className="mkt-tenue">Ninguna persona coincide.</td></tr>}
          {visibles.map((p) => <tr key={p.correo}>
            <td className="mkt-personas-correo">{p.correo}{p.interno && <> <span className="mkt-pill mkt-b-na">Interno</span></>}</td>
            <td>{p.pais ?? '—'}</td>
            <td><span className={`mkt-pill mkt-b-${ESTADO_RESULTADO[p.resultado]}`}>{textos[p.resultado]}{p.antes ? ` · ${p.antes}` : ''}</span></td>
            <td className="mkt-num">{formatoNumero(p.clics)}</td>
            <td className="mkt-personas-enlaces">{p.enlaces.length === 0 ? '—'
              : p.enlaces.map((e, i) => <span key={i} title={e.url}>{e.corto}</span>)}</td>
            <td className="mkt-sin-salto">{fechaLegible(p.fechaFinal)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <p className="mkt-tenue mkt-personas-pie">Mostrando {formatoNumero(visibles.length)} de {formatoNumero(detalle.personas.length)} personas
      {detalle.vista === 'totalBrevo' ? ' (incluye correos internos de RED, marcados "Interno")' : ' (sin correos internos de RED)'}
      {detalle.leidoEn && <> · lista leída {new Intl.DateTimeFormat('es-GT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(detalle.leidoEn))}</>}.
      Sin descarga: los correos solo se ven aquí.</p>
  </div>
}

/** Sección completa: pide la clave (si no está en memoria), carga la lista y la muestra. */
export function DetallePersonas({ campana, vista, tarjetaPantalla }) {
  const [estado, setEstado] = useState(() => (claveEnMemoria ? { fase: 'cargando' } : { fase: 'clave' }))
  const [clave, setClave] = useState('')
  const [intento, setIntento] = useState(0)
  const idClave = useId()

  useEffect(() => {
    if (!claveEnMemoria) { setEstado((e) => (e.fase === 'clave' ? e : { fase: 'clave' })); return undefined }
    const control = new AbortController()
    setEstado({ fase: 'cargando' })
    pedirDetallePersonas({ campana: campana.id, vista, clave: claveEnMemoria, signal: control.signal }).then((r) => {
      if (control.signal.aborted) return
      if (r.ok) return setEstado({ fase: 'lista', detalle: r.datos })
      if (r.status === 401) claveEnMemoria = null
      if (r.status === 401 || r.status === 429) return setEstado({ fase: 'clave', error: r.mensaje })
      setEstado({ fase: 'error', error: r.mensaje, noDisponible: r.status === 503 })
    }).catch(() => { /* cancelado */ })
    return () => control.abort()
  }, [campana.id, vista, intento])

  const enviar = (e) => {
    e.preventDefault()
    if (!clave) return
    claveEnMemoria = clave
    setClave('')
    setIntento((n) => n + 1)
  }

  return <section className="mkt-personas-seccion" aria-labelledby={`${idClave}-titulo`}>
    <h3 id={`${idClave}-titulo`}>Quién abrió y quién hizo clic</h3>
    {estado.fase === 'clave' && <form className="mkt-clave" onSubmit={enviar}>
      <p className="mkt-tenue">Esta lista muestra correos de clientes. Escribe la clave para verla (se recuerda solo mientras no recargues la página).</p>
      <div className="mkt-clave-fila">
        <label htmlFor={idClave} className="mkt-solo-lector">Clave</label>
        <input id={idClave} type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="off" placeholder="Clave" />
        <button type="submit" className="mkt-boton-rojo" disabled={!clave}>Ver lista</button>
      </div>
      {estado.error && <p className="mkt-clave-error" role="alert">{estado.error}</p>}
    </form>}
    {estado.fase === 'cargando' && <p className="mkt-tenue" role="status">Cargando la lista por persona…</p>}
    {estado.fase === 'error' && <div className="mkt-aviso is-atencion" role="alert"><strong>{estado.noDisponible ? 'No disponible' : 'No se pudo cargar la lista'}</strong><div>{estado.error}</div></div>}
    {estado.fase === 'lista' && <ListaPersonas detalle={estado.detalle} tarjetaPantalla={tarjetaPantalla} />}
  </section>
}
