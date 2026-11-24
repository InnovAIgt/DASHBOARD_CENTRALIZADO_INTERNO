// Canales de marketing · Mailing · Leads de Prospekt (calificados) atribuidos a campañas (MAILING.md, sección 11).
//  - TarjetaLeads: el bloque «Leads» de Resultados generales (total, exactos, estimados, sin campaña, cerrados y el
//    espacio de «No calificados», pendiente).
//  - LeadsMailing: la sub-pestaña «Leads», con la tabla (código, fecha, país, asesor, etapa, campaña y tipo).
// Las filas vienen ya filtradas con los filtros de Mailing (datos/leads.js) y NUNCA traen correo ni teléfono.
import { useMemo, useState } from 'react'
import { Bandera, Insignia } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { fechaHora, numero, paginar, pct, porcentaje } from '../../datos/calculos.js'
import { CRUCE_ASESOR, ETAPA_CERRADO, MOTIVO_EXACTA, porEtapa, resumenLeads, STATUS_LEAD, TEXTO_NO_CALIFICADOS, textoCampanaLead, TIPOS_ATRIBUCION } from '../../datos/leads.js'
import { Buscador, Paginacion, Selector } from './Correos.jsx'
import { Aviso, Bloque, COLOR_MAILING, Enfoque, FilaBarra, Numero, Tarjeta, TablaOrdenable, TarjetaBajita } from './piezas.jsx'

const TONO_TIPO = { exacta: 'verde', estimada: 'amarillo', sin_campana: 'neutro' }
const COLOR_TIPO = { exacta: COLOR_MAILING.entregados, estimada: COLOR_MAILING.amarillo, sin_campana: COLOR_MAILING.gris }
const textoEtapa = (etapa) => (etapa == null ? 'Sin etapa' : `Etapa ${etapa}`)

/** Avisos de la fuente: cargando, sin llave, error o copia anterior. Devuelve null si los datos están bien. */
export function EstadoLeads({ leads, reintentar }) {
  if (leads.cargando) return <Aviso icono="info" titulo="Cargando leads de Prospekt…" />
  if (leads.fuente !== 'prospekt') return <Aviso titulo={leads.mensaje ?? 'Leads no disponibles'} texto="El resto de Mailing funciona normal. Los leads salen de Prospekt IA a través de nuestro servidor." onReintentar={reintentar} />
  return null
}

/** Avisos secundarios (copia anterior, Brevo, Supabase o Cumplimiento sin responder). */
const AvisosLeads = ({ leads }) => (leads.avisos ?? []).map((a) => <Aviso key={a} titulo="Aviso de leads" texto={a} />)

/**
 * Bloque «Leads» de Resultados generales. filas = leads ya filtrados; total = todos los leads sin filtros.
 * Cada tarjeta abre la sub-pestaña «Leads» enfocada en ese grupo.
 */
export function TarjetaLeads({ leads, filas, total, abrir, reintentar }) {
  const r = useMemo(() => resumenLeads(filas), [filas])
  const ver = (tipo, titulo, etapa = null) => () => abrir({ vista: 'leads', tipo, etapa, titulo })
  const estado = <EstadoLeads leads={leads} reintentar={reintentar} />
  const listo = leads.fuente === 'prospekt' && !leads.cargando
  return <>
    <Bloque titulo="Leads" />
    <Tarjeta titulo="Leads calificados de Prospekt" sub={`Atribuidos a campañas por correo (exacta) o por origen «PostIAlo Mailing» (estimada) · ${listo && filas.length !== total ? `${numero(filas.length)} de ${numero(total)} con los filtros` : 'clic en una cifra para ver la lista'}`}>
      {!listo ? estado : <>
        <div className="mkv2-bajitas mkv2-bajitas6">
          <TarjetaBajita valor={<Numero n={r.total} />} titulo="Leads" sub="calificados" color={COLOR_MAILING.enviados}
            tip={`Leads calificados de Prospekt: ${numero(r.total)}\nClic para ver la lista`} onClick={ver('', 'Todos los leads')} />
          <TarjetaBajita valor={<Numero n={r.exactas} />} titulo="Exactos" sub={pct(porcentaje(r.exactas, r.total))} color={COLOR_TIPO.exacta}
            tip={`${TIPOS_ATRIBUCION.exacta.tip}\nClic para ver la lista`} onClick={ver('exacta', 'Leads con atribución exacta')} />
          <TarjetaBajita valor={<Numero n={r.estimadas} />} titulo="Estimados" sub={pct(porcentaje(r.estimadas, r.total))} color={COLOR_TIPO.estimada}
            tip={`${TIPOS_ATRIBUCION.estimada.tip}\nClic para ver la lista`} onClick={ver('estimada', 'Leads con atribución estimada')} />
          <TarjetaBajita valor={<Numero n={r.sinCampana} />} titulo="Sin campaña" sub={pct(porcentaje(r.sinCampana, r.total))} color={COLOR_TIPO.sin_campana}
            tip={`${TIPOS_ATRIBUCION.sin_campana.tip}\nClic para ver la lista`} onClick={ver('sin_campana', 'Leads sin campaña')} />
          <TarjetaBajita valor={<Numero n={r.cerrados} />} titulo="Cerrados" sub="etapa 6" color={COLOR_MAILING.clic}
            tip={`Leads en la etapa 6 de Prospekt: ${numero(r.cerrados)}\nPendiente confirmar si la etapa 6 es venta ganada.\nClic para ver la lista`} onClick={ver('', 'Leads cerrados (etapa 6)', ETAPA_CERRADO)} />
          <TarjetaBajita valor="—" titulo="No calificados" sub="pendiente" color={COLOR_MAILING.gris}
            tip={`${TEXTO_NO_CALIFICADOS}.\nSe pidió al administrador de Prospekt agregar el origen y el país a la lista de no calificados.`} />
        </div>
        <p className="mkv2-nota"><b>Solo {numero(r.conCorreo)} de {numero(r.total)} leads traen correo; la mayoría no se puede cruzar con campañas.</b> {TEXTO_NO_CALIFICADOS}.</p>
        <AvisosLeads leads={leads} />
      </>}
    </Tarjeta>
  </>
}

/** Sub-pestaña «Leads»: tabla con los mismos filtros de Mailing, más tipo de atribución, etapa y búsqueda. */
export function LeadsMailing({ campanas, leads, foco, limpiarFoco, volver, reintentar }) {
  const filas = leads.filas ?? []
  const [tipo, setTipo] = useState(foco?.tipo ?? '')
  const [etapa, setEtapa] = useState(foco?.etapa != null ? String(foco.etapa) : '')
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(25)
  const [orden, setOrden] = useState({ col: 'fecha', dir: 'desc' })
  const nombres = useMemo(() => Object.fromEntries(campanas.map((c) => [c.id, c])), [campanas])
  const etapas = useMemo(() => porEtapa(filas), [filas])

  const columnas = useMemo(() => [
    { id: 'codigo', label: 'Código', valor: (x) => x.codigo, celda: (x) => <strong className="mkv2-texto-fuerte fv2-sin-salto">{x.codigo}</strong> },
    { id: 'fecha', label: 'Creado', valor: (x) => x.fecha ?? '', celda: (x) => <span className="fv2-sin-salto" data-tip="Hora de Guatemala (Prospekt la guarda en UTC)">{x.fecha ? fechaHora(x.fecha) : '—'}</span> },
    { id: 'pais', label: 'País', valor: (x) => x.pais ?? '', celda: (x) => (x.pais ? <span className="fv2-sin-salto"><Bandera pais={x.pais} /> {x.pais}</span> : <span className="fv2-tenue">—</span>) },
    { id: 'asesor', label: 'Asesor', clase: 'mkv2-celda-media', valor: (x) => x.asesor ?? '',
      celda: (x) => <span data-tip={`${CRUCE_ASESOR[x.cruceEjecutivo] ?? CRUCE_ASESOR.sin_cruce}${x.ejecutivo ? `: ${x.ejecutivo}` : ''}`}>
        {x.asesor ?? <span className="fv2-tenue">—</span>}
        {x.ejecutivo && x.cruceEjecutivo === 'posible' && <small className="mkv2-posible mkv2-posible-etiqueta"> posible</small>}
      </span> },
    { id: 'etapa', label: 'Etapa', valor: (x) => x.etapa ?? -1,
      celda: (x) => <span className="fv2-sin-salto" data-tip={x.status ? `Status en Prospekt: ${STATUS_LEAD[x.status] ?? x.status}` : undefined}>
        <Insignia tono={x.etapa === ETAPA_CERRADO ? 'verde' : 'neutro'}>{textoEtapa(x.etapa)}</Insignia>
        {x.status && <small className="fv2-tenue"> {STATUS_LEAD[x.status] ?? x.status}</small>}
      </span> },
    { id: 'campana', label: 'Campaña asignada', clase: 'mkv2-celda-campana', valor: (x) => textoCampanaLead(x, nombres),
      celda: (x) => (x.campanas?.length ? <span data-tip={x.campanas.length > 1 ? `Grupo: campañas ${x.campanas.map((id) => `#${id}`).join(', ')} enviadas el mismo día (sin repartir)` : undefined}>{textoCampanaLead(x, nombres)}</span> : <span className="fv2-tenue">—</span>) },
    { id: 'tipo', label: 'Atribución', valor: (x) => TIPOS_ATRIBUCION[x.atribucion]?.label ?? '',
      celda: (x) => <span className="fv2-sin-salto" data-tip={TIPOS_ATRIBUCION[x.atribucion]?.tip}>
        <Insignia tono={TONO_TIPO[x.atribucion] ?? 'neutro'}>{TIPOS_ATRIBUCION[x.atribucion]?.label ?? '—'}</Insignia>
        {x.atribucion === 'exacta' && x.motivo && <small className="fv2-tenue"> {MOTIVO_EXACTA[x.motivo]}</small>}
      </span> },
    { id: 'origen', label: 'Origen', clase: 'mkv2-celda-media', valor: (x) => x.origen ?? '', celda: (x) => x.origen ?? <span className="fv2-tenue">—</span> },
  ], [nombres])

  const lista = useMemo(() => {
    const q = String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    const base = filas.filter((x) => (!tipo || x.atribucion === tipo) && (!etapa || String(x.etapa ?? 'sin') === etapa)
      && (!q || `${x.codigo} ${x.asesor ?? ''} ${x.ejecutivo ?? ''} ${x.origen ?? ''} ${textoCampanaLead(x, nombres)}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(q)))
    const col = columnas.find((c) => c.id === orden.col)
    if (!col) return base
    const signo = orden.dir === 'asc' ? 1 : -1
    return [...base].sort((a, b) => { const va = col.valor(a); const vb = col.valor(b); return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')) * signo })
  }, [filas, tipo, etapa, texto, orden, columnas, nombres])
  const p = paginar(lista, pagina, tamano)
  const r = resumenLeads(filas)
  const cambiarOrden = (id) => setOrden((o) => ({ col: id, dir: o.col === id && o.dir === 'desc' ? 'asc' : 'desc' }))
  const listo = leads.fuente === 'prospekt' && !leads.cargando

  return <>
    {foco && <Enfoque titulo={foco.titulo ?? 'Leads'} detalle={`${numero(lista.length)} leads con los filtros de arriba`} onTodos={() => { setTipo(''); setEtapa(''); limpiarFoco() }} onVolver={volver} />}
    {!listo ? <EstadoLeads leads={leads} reintentar={reintentar} /> : <>
      <AvisosLeads leads={leads} />
      <div className="mkv2-duo">
        <Tarjeta titulo="Atribución a campañas" sub="Clic en un tipo para ver solo esos leads" className="mkv2-compacta">
          <div className="mkv2-embudo">
            {Object.entries(TIPOS_ATRIBUCION).map(([k, t]) => {
              const n = r[k === 'exacta' ? 'exactas' : k === 'estimada' ? 'estimadas' : 'sinCampana']
              return <FilaBarra key={k} nombre={t.label} valor={n} max={r.total || 1} color={COLOR_TIPO[k]} detalle={pct(porcentaje(n, r.total))}
                tip={`${t.label}: ${numero(n)} de ${numero(r.total)}\n${t.tip}`} activa={tipo === k} onClick={() => { setTipo(tipo === k ? '' : k); setPagina(1) }} />
            })}
          </div>
          <p className="mkv2-nota">Solo {numero(r.conCorreo)} de {numero(r.total)} leads traen correo; la mayoría no se puede cruzar con campañas.</p>
        </Tarjeta>
        <Tarjeta titulo="Etapa en Prospekt" sub="opportunity_stage · la 6 es «cerrado» (por confirmar si es venta ganada)" className="mkv2-compacta">
          <div className="mkv2-embudo">
            {etapas.map((e) => <FilaBarra key={String(e.etapa)} nombre={textoEtapa(e.etapa)} valor={e.n} max={r.total || 1}
              color={e.etapa === ETAPA_CERRADO ? COLOR_MAILING.entregados : COLOR_MAILING.enviados} detalle={pct(porcentaje(e.n, r.total))}
              tip={`${textoEtapa(e.etapa)}: ${numero(e.n)} leads`} activa={etapa === String(e.etapa ?? 'sin')}
              onClick={() => { const v = String(e.etapa ?? 'sin'); setEtapa(etapa === v ? '' : v); setPagina(1) }} />)}
          </div>
        </Tarjeta>
      </div>
      <Tarjeta titulo={`Leads calificados · ${numero(lista.length)}`} sub="Con los filtros de Mailing: país del lead, período por fecha de creación, campaña / cargo / asunto por la campaña asignada · sin correo ni teléfono"
        acciones={<>
          <Selector etiqueta="Atribución" valor={tipo} onCambio={(v) => { setTipo(v); setPagina(1) }} opciones={Object.entries(TIPOS_ATRIBUCION).map(([k, t]) => [k, t.label])} todos="Todas" />
          <Selector etiqueta="Etapa" valor={etapa} onCambio={(v) => { setEtapa(v); setPagina(1) }} opciones={etapas.map((e) => [String(e.etapa ?? 'sin'), textoEtapa(e.etapa)])} todos="Todas" />
          <Buscador valor={texto} onCambio={(v) => { setTexto(v); setPagina(1) }} placeholder="Buscar código, asesor, origen o campaña" />
        </>}>
        <TablaOrdenable columnas={columnas} filas={p.filas} clave={(x) => x.codigo} orden={orden} onOrden={cambiarOrden}
          vacio={filas.length ? 'Sin leads con estos filtros.' : 'No hay leads con los filtros de arriba.'} />
        <Paginacion p={p} onPagina={setPagina} tamano={tamano} onTamano={(t) => { setTamano(t); setPagina(1) }} />
        <p className="mkv2-nota">{TEXTO_NO_CALIFICADOS}. Exacta = el correo del lead recibió la campaña (hasta 30 días antes); estimada = origen «PostIAlo Mailing» y una campaña en los 7 días previos; varias campañas el mismo día van juntas como grupo.</p>
      </Tarjeta>
    </>}
  </>
}
