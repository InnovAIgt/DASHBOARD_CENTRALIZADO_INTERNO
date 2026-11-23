// Canales de marketing · Mailing · Asignar cargo a campañas (MAILING.md, sección 7.1). Pedida por Eduardo para
// Marketing (Ismael). Lista real de campañas de Brevo con su cargo sugerido; lo elegido a mano gana sobre lo sugerido.
// «Guardar» queda deshabilitado hasta tener el inicio de sesión real (hoy el servidor no puede saber quién guarda).
import { useState } from 'react'
import { COLORES } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { diaGuatemala, fechaCorta, NOMBRE_CARGO, numero, OPCIONES_CARGO, ordenarPor, SIN_CLASIFICAR } from '../../datos/calculos.js'
import { textosCampana } from '../../datos/campana.js'
import { Aviso, InsigniaCargo, Mini, Tarjeta, TablaOrdenable, TituloCampana } from './piezas.jsx'

const ORIGEN = (c) => (c.cargoManual ? 'Elegido a mano' : c.cargoSugerido ? 'Sugerido por el nombre' : 'Sin sugerencia')

export function AsignarCargo({ campanas }) {
  const [orden, setOrden] = useState({ col: 'fecha', dir: 'desc' })
  const sinClasificar = campanas.filter((c) => c.cargo === SIN_CLASIFICAR).length
  const columnas = [
    { id: 'campana', label: 'Campaña', clase: 'mkv2-celda-campana', valor: (c) => textosCampana(c).titulo, celda: (c) => <TituloCampana campana={c} fecha={false} /> },
    { id: 'fecha', label: 'Fecha', valor: (c) => diaGuatemala(c.fecha), celda: (c) => <span className="fv2-sin-salto">{fechaCorta(c.fecha)}</span> },
    { id: 'sugerido', label: 'Cargo sugerido', valor: (c) => c.cargoSugerido ?? '', celda: (c) => (c.cargoSugerido ? <InsigniaCargo cargo={c.cargoSugerido} /> : <span className="fv2-tenue">Sin sugerencia</span>) },
    { id: 'cargo', label: 'Cargo', valor: (c) => c.cargo, celda: (c) => <select className="mkv2-control mkv2-control-chico" disabled value={c.cargo} aria-label={`Cargo de ${textosCampana(c).corto}`} title={ORIGEN(c)}>
      {OPCIONES_CARGO.map((o) => <option key={o} value={o}>{o === SIN_CLASIFICAR ? o : `${o} · ${NOMBRE_CARGO[o]}`}</option>)}
    </select> },
    { id: 'guardar', label: 'Guardar', celda: () => <button type="button" className="fv2-pildora" disabled title="Se habilita con el inicio de sesión real">Guardar</button> },
  ]
  const col = columnas.find((c) => c.id === orden.col)
  const filas = col?.valor ? ordenarPor(campanas, col.valor, orden.dir) : campanas
  const cambiar = (id) => setOrden((o) => ({ col: id, dir: o.col === id && o.dir === 'desc' ? 'asc' : 'desc' }))
  return <>
    <Aviso icono="candado" titulo="Guardar se habilita con el inicio de sesión real"
      texto="Solo las personas autorizadas podrán guardar (por confirmar con Ismael). Lo elegido a mano gana sobre lo sugerido por el nombre; sin ninguno queda «Sin clasificar»." />
    <div className="mkv2-minis">
      <Mini nombre="Campañas" valor={numero(campanas.length)} nota="Con los filtros actuales" />
      <Mini nombre="Con cargo" valor={numero(campanas.length - sinClasificar)} nota="Sugerido por el nombre o elegido a mano" color={COLORES.verdeClaro} />
      <Mini nombre="Sin clasificar" valor={numero(sinClasificar)} nota="Hay que asignarles el cargo a mano" color={COLORES.amarillo} />
      <Mini nombre="Elegidas a mano" valor={numero(campanas.filter((c) => c.cargoManual).length)} nota="Guardadas en el dashboard" color={COLORES.azulClaro} />
    </div>
    <Tarjeta titulo="Asignar cargo a campañas" sub="Si el nombre sigue la regla código-cargo-sector-asunto (o una forma vieja aceptada), el cargo viene sugerido. Lo elegido alimenta el filtro Cargo y el Análisis por cargo.">
      <TablaOrdenable columnas={columnas} filas={filas} clave={(c) => c.id} orden={orden} onOrden={cambiar} vacio="Sin campañas con los filtros actuales." />
    </Tarjeta>
  </>
}
