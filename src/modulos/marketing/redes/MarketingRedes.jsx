// Marketing · Redes sociales (docs/marketing-redes/README.md).
// Dashboard aparte dentro del área Marketing (D-C). Sin botón de subir (D-D): los datos llegan ya
// cargados desde /api/marketing/redes. Pestañas: Resumen e Informe detallado.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock3, RefreshCw } from 'lucide-react'
import { FILTROS_VACIOS, filtrarFilas, hoyISO, prepararDatos, totales } from './logica/calculos.js'
import { fechaCorta } from './logica/formato.js'
import { cargarRedes } from './servicios/api.js'
import { Filtros, textoFiltros } from './pantalla/Filtros.jsx'
import { InformeDetallado } from './pantalla/InformeDetallado.jsx'
import { Resumen } from './pantalla/Resumen.jsx'
import { DetalleFilas, FichaPublicacion } from './pantalla/Ventanas.jsx'
import './marketing-redes.css'

const PESTANAS = [
  { clave: 'resumen', etiqueta: 'Resumen' },
  { clave: 'informe', etiqueta: 'Informe detallado' },
]

function SinDatos({ mensaje, onReintentar }) {
  return <div className="rds-sin-datos" role="status">
    <strong>No hay datos de Redes sociales disponibles</strong>
    <span>{mensaje && mensaje !== 'No hay datos de Redes sociales disponibles.' ? mensaje : 'Cuando el archivo de métricas esté disponible, el dashboard se mostrará aquí.'}</span>
    <button type="button" className="rds-boton" onClick={onReintentar}><RefreshCw size={14} aria-hidden="true" /> Reintentar</button>
  </div>
}

export function MarketingRedes({ pestanaInicial = 'resumen' }) {
  const [carga, setCarga] = useState({ cargando: true, error: null, respuesta: null })
  const [intento, setIntento] = useState(0)
  const [pestana, setPestana] = useState(pestanaInicial)
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [lista, setLista] = useState(null)
  const [ficha, setFicha] = useState(null)

  useEffect(() => {
    const control = new AbortController()
    setCarga((c) => ({ ...c, cargando: true, error: null }))
    cargarRedes(control.signal)
      .then((respuesta) => setCarga({ cargando: false, error: null, respuesta }))
      .catch((error) => { if (error?.name !== 'AbortError') setCarga({ cargando: false, error: error.message, respuesta: null }) })
    return () => control.abort()
  }, [intento])

  const datos = useMemo(() => (carga.respuesta ? prepararDatos(carga.respuesta.filas, hoyISO()) : null), [carga.respuesta])
  const filas = useMemo(() => (datos ? filtrarFilas(datos.filas, filtros) : []), [datos, filtros])
  const t = useMemo(() => (datos ? totales(filas, datos.publicaciones) : null), [filas, datos])
  const abrirLista = useCallback((titulo, subtitulo, filasLista) => setLista({ titulo, subtitulo, filas: filasLista }), [])
  const cerrarLista = useCallback(() => setLista(null), [])
  const cerrarFicha = useCallback(() => setFicha(null), [])
  const actualizado = carga.respuesta?.actualizado ?? null

  return <div className="rds">
    <div className="rds-pagina">
      <header className="rds-encabezado">
        <div>
          <div className="rds-eyebrow">Marketing · Redes sociales</div>
          <h1 className="rds-titulo">Redes sociales</h1>
          <p className="rds-subtitulo">Publicaciones hechas o programadas por marca y país, y sus resultados en leads · RED Guatemala, RED El Salvador y Datared.</p>
        </div>
      </header>

      {carga.cargando && !datos && <div className="rds-cargando" role="status">Cargando las métricas de Redes sociales…</div>}
      {!carga.cargando && !datos && <SinDatos mensaje={carga.error} onReintentar={() => setIntento((n) => n + 1)} />}

      {datos && <>
        <div className="rds-barra">
          <nav className="rds-pestanas" role="tablist" aria-label="Secciones de Redes sociales">
            {PESTANAS.map((p) => <button key={p.clave} type="button" role="tab" aria-selected={pestana === p.clave}
              className={`rds-pestana ${pestana === p.clave ? 'is-activa' : ''}`} onClick={() => setPestana(p.clave)}>{p.etiqueta}</button>)}
          </nav>
          <span className="rds-actualizado" title={carga.respuesta.origen}><Clock3 size={15} aria-hidden="true" /> Datos al <b>{actualizado ? fechaCorta(actualizado) : 'sin fecha'}</b></span>
        </div>

        <Filtros filtros={filtros} setFiltros={setFiltros} meses={datos.meses} publicaciones={t.publicaciones} />

        {pestana === 'resumen' && <Resumen datos={datos} filas={filas} filtros={filtros} setFiltros={setFiltros} abrirLista={abrirLista} />}
        {pestana === 'informe' && <InformeDetallado datos={datos} filas={filas} textoFiltros={textoFiltros(filtros)}
          actualizado={actualizado ? fechaCorta(actualizado) : null} onFila={setFicha}
          advertenciasGenerales={[...(carga.respuesta.advertencias?.generales ?? []), ...(carga.respuesta.advertencias?.lectura ?? [])]} />}
      </>}
    </div>

    {lista && <DetalleFilas {...lista} publicaciones={datos.publicaciones} onFila={setFicha} onCerrar={cerrarLista} />}
    {ficha && <FichaPublicacion fila={ficha} filas={datos.filas} onFila={setFicha} onCerrar={cerrarFicha} />}
  </div>
}
