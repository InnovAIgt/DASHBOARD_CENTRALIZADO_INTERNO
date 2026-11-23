// Canales de marketing · Mailing · Relación con clientes (MAILING.md, sección 8).
// Cada correo de las campañas (fila correo + campaña) con su clasificación del cruce con Cumplimiento de Clientes
// (SOLO LECTURA): varias empresas › cargo objetivo › otro cargo › POSIBLE por dominio › sin coincidencia.
// Las tarjetas filtran la tabla. Muestra correos sin inicio de sesión (decisión de Keily, DECISIONES.md).
import { useCallback, useMemo, useState } from 'react'
import { COLORES, Insignia } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { CLASIFICACIONES, conteoClasificaciones, filtrarDetalle, FILTROS_DETALLE, numero, paginar, relacionClientes } from '../../datos/calculos.js'
import { exportarExcel } from '../../datos/excel.js'
import { AvisoDetalle, BotonExcel, Buscador, filasDelCorreo, nombreCampana, Paginacion, Tabla, TONO_ESTADO } from './Correos.jsx'
import { Ficha } from './Ficha.jsx'
import { CeldaEmpresas, textoEmpresas } from './empresas.jsx'
import { Aviso, Enfoque, InsigniaCargo, Mini, Tarjeta } from './piezas.jsx'

const TARJETAS = [
  { id: 'varias', sub: 'El correo aparece en más de un código de cliente', color: COLORES.amarillo, tono: 'amarillo' },
  { id: 'objetivo', sub: 'Aparece en el cargo al que iba la campaña', color: COLORES.verdeClaro, tono: 'verde' },
  { id: 'otro', sub: 'Aparece, pero en otra gerencia', color: COLORES.azulClaro, tono: 'azul' },
  { id: 'posible', sub: 'No está el correo, pero sí su dominio (no es coincidencia exacta)', color: COLORES.amarillo, tono: 'amarillo' },
  { id: 'sin', sub: 'No está en GG, GF ni GO, ni por dominio', color: COLORES.tenue, tono: 'neutro' },
]

export function RelacionConClientes({ campanas, detalle, errorDetalle, foco, limpiarFoco, volver, reintentar }) {
  const [categoria, setCategoria] = useState('')
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(25)
  const [ficha, setFicha] = useState(null)
  const cerrarFicha = useCallback(() => setFicha(null), [])
  const nombres = useMemo(() => Object.fromEntries(campanas.map((c) => [c.id, c])), [campanas])
  const cargoDe = useMemo(() => Object.fromEntries(campanas.map((c) => [c.id, c.cargo])), [campanas])
  const filas = useMemo(() => {
    const ids = new Set(campanas.map((c) => c.id))
    return relacionClientes((detalle?.mostrarCorreos ? detalle.filas : []).filter((x) => ids.has(x.campana_id)), cargoDe)
  }, [campanas, detalle, cargoDe])
  const conteo = useMemo(() => conteoClasificaciones(filas), [filas])
  const lista = useMemo(() => filtrarDetalle(filas, { ...FILTROS_DETALLE, texto }, { nombres }).filter((f) => !categoria || f.clasificacion === categoria), [filas, texto, nombres, categoria])
  const p = paginar(lista, pagina, tamano)
  const elegir = (id) => () => { setCategoria((c) => (c === id ? '' : id)); setPagina(1) }
  const sinCruce = detalle?.mostrarCorreos && detalle.cruce !== 'ok'

  const columnas = [
    { label: 'Correo', clase: 'mkv2-celda-correo', celda: (x) => <strong className="mkv2-texto-fuerte">{x.correo}</strong>, valor: (x) => x.correo, ancho: 34 },
    { label: 'Campaña y cargo objetivo', clase: 'mkv2-celda-larga', celda: (x) => <span className="mkv2-campana-celda"><strong>{nombreCampana(nombres, x.campana_id)}</strong><small><InsigniaCargo cargo={cargoDe[x.campana_id] ?? 'Sin clasificar'} /></small></span>,
      valor: (x) => `${nombreCampana(nombres, x.campana_id)} · ${cargoDe[x.campana_id] ?? 'Sin clasificar'}`, ancho: 40 },
    { label: 'Clasificación', clase: 'mkv2-celda-media', celda: (x) => (x.clasificacion ? <Insignia tono={TARJETAS.find((t) => t.id === x.clasificacion)?.tono}>{CLASIFICACIONES[x.clasificacion]}</Insignia> : <span className="fv2-tenue">Pendiente del cruce</span>),
      valor: (x) => (x.clasificacion ? CLASIFICACIONES[x.clasificacion] : 'Pendiente del cruce'), ancho: 32 },
    { label: 'Cliente(s)', clase: 'mkv2-celda-media', celda: (x) => <CeldaEmpresas fila={x} campo="cliente" />, valor: (x) => textoEmpresas(x, 'cliente'), ancho: 34 },
    { label: 'País', celda: (x) => <CeldaEmpresas fila={x} campo="pais" />, valor: (x) => textoEmpresas(x, 'pais'), ancho: 16 },
    { label: 'Ejecutivo(s)', clase: 'mkv2-celda-media', celda: (x) => <CeldaEmpresas fila={x} campo="ejecutivo" />, valor: (x) => textoEmpresas(x, 'ejecutivo'), ancho: 26 },
    { label: 'Cargo(s) en la base', celda: (x) => [...new Set((x.clientes?.length ? x.clientes : x.posibles ?? []).flatMap((e) => e.cargos ?? []))].join(' / ') || <span className="fv2-tenue">—</span>,
      valor: (x) => [...new Set((x.clientes?.length ? x.clientes : x.posibles ?? []).flatMap((e) => e.cargos ?? []))].join(' / '), ancho: 16 },
    { label: 'Estado del mailing', celda: (x) => <Insignia tono={TONO_ESTADO[x.estado]}>{x.estadoTexto}</Insignia>, valor: (x) => `${x.estadoTexto} · ${x.status}`, ancho: 22 },
  ]
  const exportar = () => exportarExcel({
    nombreBase: `relacion-con-clientes_${new Date().toISOString().slice(0, 10)}`,
    titulo: 'RELACIÓN CON CLIENTES · MAILING', subtitulo: `${numero(lista.length)} filas (correo y campaña)${categoria ? ` · ${CLASIFICACIONES[categoria]}` : ''}`,
    columnas, filas: lista,
    filtros: [['Campañas (filtros de arriba)', `${campanas.length}`], ['Clasificación', categoria ? CLASIFICACIONES[categoria] : 'Todas'], ['Búsqueda', texto || 'Ninguna']],
  })

  return <>
    {foco && <Enfoque titulo={foco.titulo ?? 'Relación con clientes'} detalle={`${numero(campanas.length)} campañas según los filtros de arriba`} onTodos={limpiarFoco} onVolver={volver} />}
    <AvisoDetalle detalle={detalle} errorDetalle={errorDetalle} onReintentar={reintentar} />
    {sinCruce && <Aviso titulo="No se pudo leer Cumplimiento de Clientes" texto={detalle.avisoCruce} />}
    <div className="mkv2-minis mkv2-minis5">
      {TARJETAS.map((t) => <Mini key={t.id} nombre={CLASIFICACIONES[t.id]} valor={sinCruce ? '—' : numero(conteo[t.id])} color={t.color} nota={t.sub}
        activo={categoria === t.id} onClick={sinCruce ? undefined : elegir(t.id)} enlace={categoria === t.id ? 'Quitar filtro' : 'Ver'} />)}
    </div>
    <div className="mkv2-logica">
      <strong>Cómo leer las categorías:</strong> cada correo tiene una sola, la de mayor prioridad (en el orden de las
      tarjetas, salvo «posible», que solo aplica si no hubo coincidencia exacta). La comparación es exacta, en minúsculas
      y sin espacios. «Posible (por dominio)» no es una identificación: hay que confirmarla. Los dominios de correo
      personal (gmail, hotmail, outlook, yahoo…) nunca dan posibles. «Sin coincidencia» <strong>no</strong> significa
      correo inválido: solo que no está en la base.
    </div>
    <Tarjeta titulo="Directorio y coincidencias" sub="Una fila por correo y campaña · clic en una tarjeta para filtrar · exporta lo que se ve"
      acciones={<BotonExcel onClick={exportar} total={lista.length} />}>
      <div className="mkv2-barra-tabla">
        <Buscador valor={texto} onCambio={(v) => { setTexto(v); setPagina(1) }} placeholder="Buscar correo, cliente, código, ejecutivo o campaña" />
        {categoria && <button type="button" className="fv2-pildora" onClick={() => setCategoria('')}>Quitar «{CLASIFICACIONES[categoria]}»</button>}
      </div>
      <Tabla columnas={columnas} filas={p.filas} clave={(x) => `${x.campana_id}|${x.correo}`} onFila={(x) => setFicha({ correo: x.correo, campana: x.campana_id })}
        vacio={detalle?.mostrarCorreos === false ? 'Los correos están ocultos.' : filas.length ? 'Sin resultados con esta búsqueda o filtros.' : 'Sin detalle por correo para estas campañas.'} />
      <Paginacion p={p} onPagina={setPagina} tamano={tamano} onTamano={(n) => { setTamano(n); setPagina(1) }} />
    </Tarjeta>
    {ficha && <Ficha filas={filasDelCorreo(filas, ficha.correo, ficha.campana)} nombres={nombres} onCerrar={cerrarFicha} />}
  </>
}
