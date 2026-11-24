// Canales de marketing · Mailing · CARGO Y OBJETIVO de cada campaña (MAILING.md, sección 7.1). Pedida por Eduardo para
// Marketing (Ismael). Lista real de campañas de Brevo con su cargo y su objetivo:
//  - Cargo: sugerido por el nombre; lo elegido a mano gana.
//  - Objetivo: sugerido por el asunto, el nombre o el contenido del correo (datos/objetivo.js); si nada coincide,
//    «Promoción general de RED» con estado «Revisar». Lo elegido a mano gana y queda «Confirmado». El selector muestra
//    los 8 objetivos de Keily + el general y permite escribir uno nuevo (texto libre).
// GUARDAR sin inicio de sesión, con la CLAVE DE MARKETING (decisión de Keily, DECISIONES.md): la primera vez se pide
// la clave y «Tu nombre»; la valida el servidor y la pestaña recuerda solo un permiso firmado (datos/edicion.js).
// Lo guardado se aplica al instante en todo el dashboard (filtro Cargo, Análisis por cargo, acordeón de la campaña).
import { useState } from 'react'
import { KeyRound, RotateCcw, Save, X } from 'lucide-react'
import { diaGuatemala, fechaCorta, fechaHora, NOMBRE_CARGO, numero, OPCIONES_CARGO, ordenarPor, SIN_CLASIFICAR } from '../../datos/calculos.js'
import { textosCampana } from '../../datos/campana.js'
import { entrar, guardarCargoObjetivo, permisoActual, volverASugerido } from '../../datos/edicion.js'
import { objetivoDeCampana, OPCIONES_OBJETIVO } from '../../datos/objetivo.js'
import { CLASE_ESTADO_OBJETIVO } from './DetalleCampana.jsx'
import { Aviso, COLOR_MAILING, InsigniaCargo, Tarjeta, TablaOrdenable, TarjetaBajita, TituloCampana } from './piezas.jsx'

const ESTADO_CARGO = (c) => (c.cargoManual ? 'confirmado' : c.cargoSugerido ? 'sugerido' : 'revisar')
const TEXTO_ESTADO = { sugerido: 'Sugerido', revisar: 'Revisar', confirmado: 'Confirmado' }
const ID_LISTA = 'mkv2-opciones-objetivo'
const SIN_EDICION = 'La edición no está habilitada: falta la clave de Marketing en el servidor (MKT_CLAVE_EDICION).'

/** Estado con «por <nombre> · <fecha>» cuando es Confirmado. */
function Estado({ estado, detalle, por, cuando }) {
  return <span className="mkv2-estado-celda" data-tip={detalle}>
    <span className={`mkv2-estado-objetivo ${CLASE_ESTADO_OBJETIVO[estado]}`}>{TEXTO_ESTADO[estado]}</span>
    {estado === 'confirmado' && (por || cuando) && <small>{por ? `por ${por}` : ''}{por && cuando ? ' · ' : ''}{cuando ? fechaCorta(cuando) : ''}</small>}
  </span>
}

/** Ventana para escribir la clave de Marketing y el nombre (la valida el servidor). */
function VentanaClave({ onListo, onCerrar }) {
  const [clave, setClave] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviar = async (ev) => {
    ev.preventDefault()
    setEnviando(true)
    setError('')
    try { await entrar(clave, nombre); onListo() } catch (err) { setError(err.message || 'No se pudo validar la clave.') } finally { setEnviando(false) }
  }
  return <div className="mkv2-modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
    <form className="mkv2-modal mkv2-ventana-clave" role="dialog" aria-modal="true" aria-labelledby="mkv2-clave-titulo" onSubmit={enviar}
      onKeyDown={(e) => { if (e.key === 'Escape') onCerrar() }}>
      <div className="mkv2-modal-cabeza">
        <div><h3 id="mkv2-clave-titulo"><KeyRound size={16} /> Clave de Marketing</h3><p>Para guardar cargo y objetivo. La valida el servidor; esta pestaña solo la recuerda mientras esté abierta.</p></div>
        <button type="button" className="mkv2-x" onClick={onCerrar} aria-label="Cerrar"><X size={16} /></button>
      </div>
      <label className="mkv2-campo-v"><span>Clave de Marketing</span>
        <input className="mkv2-control" type="password" autoComplete="off" value={clave} onChange={(e) => setClave(e.target.value)} required autoFocus /></label>
      <label className="mkv2-campo-v"><span>Tu nombre</span>
        <input className="mkv2-control" type="text" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Quedará como «por <nombre>»" /></label>
      {error && <p className="mkv2-error-clave" role="alert">{error}</p>}
      <div className="mkv2-acciones">
        <button type="submit" className="fv2-pildora mkv2-boton-rojo" disabled={enviando || !clave || !nombre.trim()}>{enviando ? 'Validando…' : 'Continuar'}</button>
        <button type="button" className="fv2-pildora" onClick={onCerrar}>Cancelar</button>
      </div>
    </form>
  </div>
}

export function AsignarCargo({ campanas, edicionHabilitada = false, actualizarCampana }) {
  const [orden, setOrden] = useState({ col: 'fecha', dir: 'desc' })
  const [borradores, setBorradores] = useState({}) // id → {cargo, objetivo}
  const [ocupada, setOcupada] = useState(null) // id que se está guardando
  const [mensajes, setMensajes] = useState({}) // id → {tipo, texto}
  const [pendiente, setPendiente] = useState(null) // acción que espera la clave
  const sinClasificar = campanas.filter((c) => c.cargo === SIN_CLASIFICAR).length
  const objetivos = new Map(campanas.map((c) => [c.id, objetivoDeCampana(c)]))
  const porEstado = (e) => campanas.filter((c) => objetivos.get(c.id).estado === e).length
  const valorCargo = (c) => borradores[c.id]?.cargo ?? (c.cargoManual ?? c.cargo)
  const valorObjetivo = (c) => borradores[c.id]?.objetivo ?? objetivos.get(c.id).objetivo
  const cambio = (c) => borradores[c.id] && (valorCargo(c) !== (c.cargoManual ?? c.cargo) || valorObjetivo(c).trim() !== objetivos.get(c.id).objetivo)
  // Se puede guardar si algo cambió o si todavía no está confirmado (guardar tal cual confirma lo sugerido).
  const sePuedeGuardar = (c) => cambio(c) || !(c.cargoManual || c.objetivoManual)
  const poner = (c, k) => (ev) => { setBorradores((b) => ({ ...b, [c.id]: { cargo: valorCargo(c), objetivo: valorObjetivo(c), ...b[c.id], [k]: ev.target.value } })); setMensajes((m) => ({ ...m, [c.id]: null })) }
  const avisar = (id, tipo, texto) => setMensajes((m) => ({ ...m, [id]: { tipo, texto } }))

  const ejecutar = async (accion) => {
    if (!permisoActual()) { setPendiente(accion); return }
    const { tipo, c } = accion
    setOcupada(c.id)
    try {
      if (tipo === 'guardar') {
        const cargo = valorCargo(c) === SIN_CLASIFICAR ? '' : valorCargo(c)
        const manual = await guardarCargoObjetivo(c.id, { cargo, objetivo: valorObjetivo(c) })
        actualizarCampana?.(c.id, manual)
        avisar(c.id, 'ok', 'Guardado.')
      } else {
        await volverASugerido(c.id)
        actualizarCampana?.(c.id, null)
        avisar(c.id, 'ok', 'Volvió a lo sugerido.')
      }
      setBorradores((b) => { const n = { ...b }; delete n[c.id]; return n })
    } catch (err) {
      if (err.status === 401) { setPendiente(accion); avisar(c.id, 'error', 'Vuelve a escribir la clave de Marketing.') } else avisar(c.id, 'error', err.message || 'No se pudo guardar.')
    } finally { setOcupada(null) }
  }

  const columnas = [
    { id: 'campana', label: 'Campaña', clase: 'mkv2-celda-campana', valor: (c) => textosCampana(c).titulo, celda: (c) => <TituloCampana campana={c} fecha={false} /> },
    { id: 'fecha', label: 'Fecha', valor: (c) => diaGuatemala(c.fecha), celda: (c) => <span className="fv2-sin-salto">{fechaCorta(c.fecha)}</span> },
    { id: 'cargo', label: 'Cargo', valor: (c) => c.cargo, celda: (c) => <span className="mkv2-cargo-celda">
      <select className="mkv2-control mkv2-control-chico" disabled={!edicionHabilitada || ocupada === c.id} value={valorCargo(c)} onChange={poner(c, 'cargo')}
        aria-label={`Cargo de ${textosCampana(c).corto}`} data-tip={edicionHabilitada ? undefined : SIN_EDICION}>
        {OPCIONES_CARGO.map((o) => <option key={o} value={o}>{o === SIN_CLASIFICAR ? o : `${o} · ${NOMBRE_CARGO[o]}`}</option>)}
      </select>
      <small>{c.cargoSugerido ? <>Sugerido: <InsigniaCargo cargo={c.cargoSugerido} /></> : 'Sin sugerencia por el nombre'}</small>
    </span> },
    { id: 'estadoCargo', label: 'Estado del cargo', valor: (c) => TEXTO_ESTADO[ESTADO_CARGO(c)],
      celda: (c) => <Estado estado={ESTADO_CARGO(c)} por={c.asignadoPor} cuando={c.cargoAsignadoEn}
        detalle={c.cargoManual ? `Elegido a mano${c.asignadoPor ? ` por ${c.asignadoPor}` : ''}${c.cargoAsignadoEn ? ` · ${fechaHora(c.cargoAsignadoEn)}` : ''}` : c.cargoSugerido ? 'Sugerido por el nombre' : 'Hay que asignarle el cargo a mano'} /> },
    { id: 'objetivo', label: 'Objetivo', clase: 'mkv2-celda-objetivo', valor: (c) => objetivos.get(c.id).objetivo, celda: (c) => <span className="mkv2-cargo-celda">
      <input className="mkv2-control" list={ID_LISTA} maxLength={120} disabled={!edicionHabilitada || ocupada === c.id} value={valorObjetivo(c)} onChange={poner(c, 'objetivo')}
        aria-label={`Objetivo de ${textosCampana(c).corto}`} data-tip={edicionHabilitada ? 'Elige de la lista o escribe uno nuevo' : SIN_EDICION} />
      <small>{objetivos.get(c.id).textoFuente}</small>
    </span> },
    { id: 'estadoObjetivo', label: 'Estado del objetivo', valor: (c) => TEXTO_ESTADO[objetivos.get(c.id).estado],
      celda: (c) => <Estado estado={objetivos.get(c.id).estado} por={c.asignadoPor} cuando={c.objetivoAsignadoEn} detalle={objetivos.get(c.id).textoFuente} /> },
    { id: 'guardar', label: 'Guardar', celda: (c) => <span className="mkv2-guardar-celda">
      <button type="button" className="fv2-pildora mkv2-boton-rojo" disabled={!edicionHabilitada || !sePuedeGuardar(c) || ocupada === c.id}
        data-tip={edicionHabilitada ? (cambio(c) ? 'Guardar este cargo y objetivo' : sePuedeGuardar(c) ? 'Guardar tal cual: confirma lo sugerido' : 'Ya está confirmado: cambia el cargo o el objetivo para guardar') : SIN_EDICION}
        onClick={() => ejecutar({ tipo: 'guardar', c })}><Save size={13} />{ocupada === c.id ? 'Guardando…' : 'Guardar'}</button>
      {(c.cargoManual || c.objetivoManual) && <button type="button" className="fv2-pildora" disabled={!edicionHabilitada || ocupada === c.id}
        data-tip="Borra lo elegido a mano para esta campaña y vuelve a lo sugerido" onClick={() => ejecutar({ tipo: 'volver', c })}><RotateCcw size={13} />Volver a lo sugerido</button>}
      {mensajes[c.id] && <small className={mensajes[c.id].tipo === 'ok' ? 'is-ok' : 'is-error'} role="status">{mensajes[c.id].texto}</small>}
    </span> },
  ]
  const col = columnas.find((c) => c.id === orden.col)
  const filas = col?.valor ? ordenarPor(campanas, col.valor, orden.dir) : campanas
  const cambiar = (id) => setOrden((o) => ({ col: id, dir: o.col === id && o.dir === 'desc' ? 'asc' : 'desc' }))
  const p = permisoActual()
  return <>
    {edicionHabilitada
      ? <Aviso icono="candado" titulo={p ? `Editando como ${p.nombre}` : 'Guardar pide la clave de Marketing'}
        texto="La primera vez que guardes se pide la clave de Marketing y tu nombre; los valida el servidor y esta pestaña los recuerda mientras esté abierta. Lo elegido a mano gana sobre lo sugerido, queda «Confirmado» y se ve en todo el dashboard." />
      : <Aviso icono="candado" titulo="Guardar no está habilitado" texto={SIN_EDICION} />}
    <div className="mkv2-bajitas">
      <TarjetaBajita titulo="Campañas" valor={numero(campanas.length)} sub="con los filtros" color={COLOR_MAILING.enviados} tip="Campañas de Brevo con los filtros de arriba" />
      <TarjetaBajita titulo="Cargo sin clasificar" valor={numero(sinClasificar)} sub="asignar a mano" color={COLOR_MAILING.amarillo} tip="Campañas cuyo nombre no dice el cargo: hay que asignárselo a mano" />
      <TarjetaBajita titulo="Objetivo sugerido" valor={numero(porEstado('sugerido'))} sub="por regla" color={COLOR_MAILING.apertura} tip="Objetivo sugerido por el asunto, el nombre o el contenido del correo" />
      <TarjetaBajita titulo="Objetivo por revisar" valor={numero(porEstado('revisar'))} sub="sin regla" color={COLOR_MAILING.amarillo} tip="Ninguna regla coincidió: queda «Promoción general de RED» para revisar" />
      <TarjetaBajita titulo="Objetivo confirmado" valor={numero(porEstado('confirmado'))} sub="por Marketing" color={COLOR_MAILING.entregados} tip="Elegido a mano por Marketing (gana sobre lo sugerido)" />
    </div>
    <datalist id={ID_LISTA}>{OPCIONES_OBJETIVO.map((o) => <option key={o} value={o} />)}</datalist>
    <Tarjeta titulo="Cargo y objetivo de cada campaña" sub="El cargo se sugiere por el nombre (regla código-cargo-sector-asunto); el objetivo, por el asunto, el nombre o el contenido del correo. Lo elegido alimenta el filtro Cargo, el Análisis por cargo y el detalle de cada campaña.">
      <TablaOrdenable columnas={columnas} filas={filas} clave={(c) => c.id} orden={orden} onOrden={cambiar} vacio="Sin campañas con los filtros actuales." />
    </Tarjeta>
    {pendiente && <VentanaClave onCerrar={() => setPendiente(null)} onListo={() => { const a = pendiente; setPendiente(null); ejecutar(a) }} />}
  </>
}
