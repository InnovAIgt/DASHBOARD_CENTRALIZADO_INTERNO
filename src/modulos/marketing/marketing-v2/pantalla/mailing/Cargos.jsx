// Canales de marketing · Mailing · CARGO Y OBJETIVO de cada campaña (MAILING.md, sección 7.1). Pedida por Eduardo para
// Marketing (Ismael). Lista real de campañas de Brevo con su cargo y su objetivo:
//  - Cargo: sugerido por el nombre; lo elegido a mano gana.
//  - Objetivo: sugerido por el asunto, el nombre o el contenido del correo (datos/objetivo.js); si nada coincide,
//    «Promoción general de RED» con estado «Revisar». Lo elegido a mano gana y queda «Confirmado». El selector muestra
//    los 8 objetivos de Keily + el general y permite escribir uno nuevo (se guarda como texto libre, SQL 004).
// «Guardar» queda deshabilitado hasta tener el inicio de sesión real (hoy el servidor no puede saber quién guarda).
import { useState } from 'react'
import { diaGuatemala, fechaCorta, NOMBRE_CARGO, numero, OPCIONES_CARGO, ordenarPor, SIN_CLASIFICAR } from '../../datos/calculos.js'
import { textosCampana } from '../../datos/campana.js'
import { objetivoDeCampana, OPCIONES_OBJETIVO } from '../../datos/objetivo.js'
import { CLASE_ESTADO_OBJETIVO } from './DetalleCampana.jsx'
import { Aviso, COLOR_MAILING, InsigniaCargo, Mini, Tarjeta, TablaOrdenable, TituloCampana } from './piezas.jsx'

const ESTADO_CARGO = (c) => (c.cargoManual ? 'confirmado' : c.cargoSugerido ? 'sugerido' : 'revisar')
const TEXTO_ESTADO = { sugerido: 'Sugerido', revisar: 'Revisar', confirmado: 'Confirmado' }
const ID_LISTA = 'mkv2-opciones-objetivo'
const BLOQUEADO = 'Se habilita con el inicio de sesión real'

function Estado({ estado, detalle }) {
  return <span className="mkv2-estado-celda" data-tip={detalle}>
    <span className={`mkv2-estado-objetivo ${CLASE_ESTADO_OBJETIVO[estado]}`}>{TEXTO_ESTADO[estado]}</span>
  </span>
}

export function AsignarCargo({ campanas }) {
  const [orden, setOrden] = useState({ col: 'fecha', dir: 'desc' })
  const sinClasificar = campanas.filter((c) => c.cargo === SIN_CLASIFICAR).length
  const objetivos = new Map(campanas.map((c) => [c.id, objetivoDeCampana(c)]))
  const porEstado = (e) => campanas.filter((c) => objetivos.get(c.id).estado === e).length
  const columnas = [
    { id: 'campana', label: 'Campaña', clase: 'mkv2-celda-campana', valor: (c) => textosCampana(c).titulo, celda: (c) => <TituloCampana campana={c} fecha={false} /> },
    { id: 'fecha', label: 'Fecha', valor: (c) => diaGuatemala(c.fecha), celda: (c) => <span className="fv2-sin-salto">{fechaCorta(c.fecha)}</span> },
    { id: 'cargo', label: 'Cargo', valor: (c) => c.cargo, celda: (c) => <span className="mkv2-cargo-celda">
      <select className="mkv2-control mkv2-control-chico" disabled value={c.cargo} aria-label={`Cargo de ${textosCampana(c).corto}`} data-tip={BLOQUEADO}>
        {OPCIONES_CARGO.map((o) => <option key={o} value={o}>{o === SIN_CLASIFICAR ? o : `${o} · ${NOMBRE_CARGO[o]}`}</option>)}
      </select>
      <small>{c.cargoSugerido ? <>Sugerido: <InsigniaCargo cargo={c.cargoSugerido} /></> : 'Sin sugerencia por el nombre'}</small>
    </span> },
    { id: 'estadoCargo', label: 'Estado del cargo', valor: (c) => TEXTO_ESTADO[ESTADO_CARGO(c)],
      celda: (c) => <Estado estado={ESTADO_CARGO(c)} detalle={c.cargoManual ? 'Elegido a mano' : c.cargoSugerido ? 'Sugerido por el nombre' : 'Hay que asignarle el cargo a mano'} /> },
    { id: 'objetivo', label: 'Objetivo', clase: 'mkv2-celda-objetivo', valor: (c) => objetivos.get(c.id).objetivo, celda: (c) => <span className="mkv2-cargo-celda">
      <input className="mkv2-control" list={ID_LISTA} disabled defaultValue={objetivos.get(c.id).objetivo} aria-label={`Objetivo de ${textosCampana(c).corto}`} data-tip={BLOQUEADO} />
      <small>{objetivos.get(c.id).textoFuente}</small>
    </span> },
    { id: 'estadoObjetivo', label: 'Estado del objetivo', valor: (c) => TEXTO_ESTADO[objetivos.get(c.id).estado],
      celda: (c) => <Estado estado={objetivos.get(c.id).estado} detalle={objetivos.get(c.id).textoFuente} /> },
    { id: 'guardar', label: 'Guardar', celda: () => <button type="button" className="fv2-pildora" disabled data-tip={BLOQUEADO}>Guardar</button> },
  ]
  const col = columnas.find((c) => c.id === orden.col)
  const filas = col?.valor ? ordenarPor(campanas, col.valor, orden.dir) : campanas
  const cambiar = (id) => setOrden((o) => ({ col: id, dir: o.col === id && o.dir === 'desc' ? 'asc' : 'desc' }))
  return <>
    <Aviso icono="candado" titulo="Guardar se habilita con el inicio de sesión real"
      texto="Solo las personas autorizadas podrán guardar (por confirmar con Ismael). Lo elegido a mano gana sobre lo sugerido y queda «Confirmado». El objetivo se puede elegir de la lista o escribir uno nuevo." />
    <div className="mkv2-minis mkv2-minis5">
      <Mini nombre="Campañas" valor={numero(campanas.length)} nota="Con los filtros actuales" />
      <Mini nombre="Cargo sin clasificar" valor={numero(sinClasificar)} nota="Hay que asignarles el cargo a mano" color={COLOR_MAILING.amarillo} />
      <Mini nombre="Objetivo sugerido" valor={numero(porEstado('sugerido'))} nota="Por el asunto, el nombre o el contenido" color={COLOR_MAILING.apertura} />
      <Mini nombre="Objetivo por revisar" valor={numero(porEstado('revisar'))} nota="Ninguna regla coincidió: «Promoción general de RED»" color={COLOR_MAILING.amarillo} />
      <Mini nombre="Objetivo confirmado" valor={numero(porEstado('confirmado'))} nota="Elegido a mano por Marketing" color={COLOR_MAILING.entregados} />
    </div>
    <datalist id={ID_LISTA}>{OPCIONES_OBJETIVO.map((o) => <option key={o} value={o} />)}</datalist>
    <Tarjeta titulo="Cargo y objetivo de cada campaña" sub="El cargo se sugiere por el nombre (regla código-cargo-sector-asunto); el objetivo, por el asunto, el nombre o el contenido del correo. Lo elegido alimenta el filtro Cargo, el Análisis por cargo y el detalle de cada campaña.">
      <TablaOrdenable columnas={columnas} filas={filas} clave={(c) => c.id} orden={orden} onOrden={cambiar} vacio="Sin campañas con los filtros actuales." />
    </Tarjeta>
  </>
}
