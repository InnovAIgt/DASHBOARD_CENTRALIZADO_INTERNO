// Canales de marketing · pestaña REDES SOCIALES (docs/marketing/v2/REDES.md).
// Mismo estilo que Mailing (usa la clase mkv2-mailing para el tema negro y las piezas compartidas, sin cambiarlas):
// barra de filtros, sub-pestañas Resumen · Publicaciones · Anuncios y «Filtrado por».
// HOY con DATOS DE EJEMPLO (datos/redesEjemplo.js) y aviso visible; con el token de Meta solo cambia la fuente
// (datos/useRedesDatos.js). Sin leads por ahora.
import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cargarHerramientaPdf } from '../datos/pdfMailing.js'
import { chipsFiltrosRedes, construirReporteRedes, MODULOS_PDF_REDES, nombreArchivoPdfRedes } from '../datos/pdfRedes.js'
import { ESTADOS, FILTROS_REDES, filtrarRedes, FORMATOS, MARCAS, REDES } from '../datos/redes.js'
import { armarProgramado } from '../datos/redesProgramadas.js'
import { useRedesDatos } from '../datos/useRedesDatos.js'
import { Aviso, useGlobo } from './mailing/piezas.jsx'
import { AnunciosRedes } from './redes/Anuncios.jsx'
import { BarraRedes, ID_BOTON_PDF_REDES } from './redes/BarraRedes.jsx'
import { PublicacionesRedes } from './redes/Publicaciones.jsx'
import { ResumenRedes } from './redes/Resumen.jsx'

export const SUBPESTANAS_REDES = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'publicaciones', label: 'Publicaciones' },
  { key: 'anuncios', label: 'Anuncios' },
]

export function Redes() {
  const datos = useRedesDatos()
  const [sub, setSub] = useState(() => { try { return sessionStorage.getItem('mkv2-redes-sub') || 'resumen' } catch { return 'resumen' } })
  const irA = (k) => { setSub(k); try { sessionStorage.setItem('mkv2-redes-sub', k) } catch { /* solo en memoria */ } }
  const [filtros, setFiltros] = useState({ ...FILTROS_REDES, mes: datos.meses[0] ?? '' })
  const filtrar = (cambio) => setFiltros((f) => ({ ...f, ...cambio }))
  const globo = useGlobo()
  // Publicaciones del mes con su estado (publicada / no_publicada / programada) y el caso de programadas (A, B o C).
  const programado = useMemo(() => armarProgramado(datos, datos.hoy), [datos])
  const items = programado.items
  const caso = programado.casos[filtros.mes] ?? 'C'
  const cuenta = useMemo(() => ({
    publicaciones: filtrarRedes(items, filtros).length,
    anuncios: filtrarRedes(datos.anuncios, { ...filtros, red: '', formato: '', estado: '' }).length,
  }), [items, datos.anuncios, filtros])
  const etiquetas = [
    filtros.pais && { quitar: { pais: '' }, texto: `País: ${filtros.pais}` },
    filtros.marca && { quitar: { marca: '' }, texto: MARCAS[filtros.marca]?.corto ?? filtros.marca },
    filtros.red && { quitar: { red: '' }, texto: REDES[filtros.red] ?? filtros.red },
    filtros.formato && { quitar: { formato: '' }, texto: `Formato: ${FORMATOS[filtros.formato] ?? filtros.formato}` },
    filtros.estado && { quitar: { estado: '' }, texto: ESTADOS[filtros.estado] ?? filtros.estado },
  ].filter(Boolean)

  // ---- PDF: la misma herramienta compartida que Mailing (dashboard-pdf.js); siempre lee los datos y filtros actuales ----
  const datosPdf = useRef(null)
  datosPdf.current = { datos, items, caso, filtros }
  const [pdfListo, setPdfListo] = useState(false)
  useEffect(() => {
    if (datos.cargando) return undefined
    let activo = true
    const antes = new Set(document.querySelectorAll('.dashboard-pdf-picker'))
    cargarHerramientaPdf().then((pdf) => {
      if (!activo || !document.getElementById(ID_BOTON_PDF_REDES)) return
      pdf.openModulePicker({
        buttonId: ID_BOTON_PDF_REDES,
        modules: MODULOS_PDF_REDES,
        getFilterChips: () => chipsFiltrosRedes(datosPdf.current.filtros),
        buildReport: async (seleccion) => construirReporteRedes({ seleccion, ...datosPdf.current, origen: window.location.origin }),
        filename: () => nombreArchivoPdfRedes(datosPdf.current.filtros),
      })
      setPdfListo(true)
    }).catch((err) => console.error('PDF de Redes:', err))
    return () => {
      activo = false
      setPdfListo(false)
      document.querySelectorAll('.dashboard-pdf-picker').forEach((el) => { if (!antes.has(el)) el.remove() })
    }
  }, [datos.cargando])

  return <div className="mkv2-mailing mkv2-redes" {...globo.manejadores}>
    {datos.fuente === 'ejemplo' && <div className="mkv2-redes-ejemplo" role="note">
      <strong>Datos de ejemplo</strong> · todavía no está conectado a Meta. Las cifras son inventadas y solo muestran cómo se verá la pantalla.
    </div>}
    <BarraRedes filtros={filtros} cambiar={setFiltros} meses={datos.meses} pdfListo={pdfListo} />
    <nav className="mkv2-subpestanas" role="tablist" aria-label="Secciones de Redes sociales">
      {SUBPESTANAS_REDES.map((p) => <button type="button" key={p.key} role="tab" aria-selected={sub === p.key}
        className={`mkv2-subpestana ${sub === p.key ? 'is-activa' : ''}`} onClick={() => irA(p.key)}>{p.label}
        {cuenta[p.key] != null && !datos.cargando && <span className="mkv2-subpestana-cuenta">{cuenta[p.key]}</span>}</button>)}
    </nav>
    {etiquetas.length > 0 && <div className="mkv2-filtrado" role="status">
      <span>Filtrado por:</span>
      {etiquetas.map((e) => <button type="button" key={e.texto} className="mkv2-filtrado-etiqueta" onClick={() => filtrar(e.quitar)}
        data-tip="Clic para quitar este filtro" aria-label={`Quitar el filtro ${e.texto}`}>{e.texto}<X size={13} aria-hidden="true" /></button>)}
    </div>}
    {datos.cargando && <div className="fv2-vacio"><strong>Cargando datos de Meta…</strong></div>}
    {!datos.cargando && datos.error && <Aviso titulo="No se pudieron leer los datos de Meta" texto={datos.error} onReintentar={datos.reintentar} />}
    {!datos.cargando && !datos.error && <>
      {datos.avisos?.map((a) => <Aviso key={a} titulo="Aviso de Meta" texto={a} />)}
      {sub === 'resumen' && <ResumenRedes datos={datos} items={items} caso={caso} filtros={filtros} filtrar={filtrar} irA={irA} />}
      {sub === 'publicaciones' && <PublicacionesRedes datos={datos} items={items} filtros={filtros} />}
      {sub === 'anuncios' && <AnunciosRedes datos={datos} filtros={filtros} />}
    </>}
    {globo.nodo}
  </div>
}
