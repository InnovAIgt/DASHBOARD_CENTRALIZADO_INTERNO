// Marketing por canales · ventana con el detalle completo de una campaña.
// Muestra las dos cifras lado a lado ("Sin internos" y "Total en Brevo") y el desglose por país en gris.
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Aviso, Explicacion, Porcentaje, Tono } from './comunes.jsx'
import { DetallePersonas } from './DetallePersonas.jsx'
import { ETIQUETAS, VISTAS, asuntoDe, bloque, formatoFechaEnvio, formatoMes, formatoNumero, formatoPct, sobreBase, tonoRiesgo } from './datos.js'

const FILAS = [
  { campo: 'enviados' },
  { campo: 'entregados' },
  { campo: 'pctEntrega', pct: true },
  { campo: 'rebotesTemporales', riesgo: true },
  { campo: 'rebotesPermanentes', riesgo: true },
  { campo: 'entregadosLuegoRebotados', sangria: true },
  { campo: 'sinEstado' },
  { campo: 'aperturasReales' },
  { campo: 'aperturasDeRebotados', sangria: true },
  { campo: 'soloAperturaAutomatica' },
  { campo: 'pctApertura', pct: true },
  { campo: 'personasConClic' },
  { campo: 'pctClic', pct: true },
  { campo: 'pctCtor', pct: true },
  { campo: 'totalAperturasBrevo' },
  { campo: 'totalClicsBrevo' },
  { campo: 'bajas', riesgo: true },
  { campo: 'quejas', riesgo: true },
]

function Celda({ m, fila }) {
  if (fila.pct) {
    // Cada % tiene su propia regla de "pocos datos" (calculada en el servidor): null = pocos datos.
    const valor = m[fila.campo]
    return <td className="mkt-num"><Porcentaje valor={valor} pocos={valor == null} formato={formatoPct} /></td>
  }
  return <td className="mkt-num">
    {formatoNumero(m[fila.campo])}
    {fila.riesgo && !m.pocosDatos && <small className={`mkt-pct-riesgo is-${tonoRiesgo(m, fila.campo)}`}> {formatoPct(sobreBase(m, fila.campo))}</small>}
  </td>
}

export function DetalleCampana({ campana, definiciones, pctDesconocido, alCerrar, vista = 'metricas' }) {
  const cerrar = useRef(null)
  useEffect(() => {
    cerrar.current?.focus()
    const tecla = (e) => { if (e.key === 'Escape') alCerrar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [alCerrar])

  const sin = campana.metricas
  const brevo = campana.totalBrevo
  const internos = campana.destinatariosInternos
  const paises = Object.entries(campana.porPais)

  return createPortal(<div className="mkt-ventana" role="presentation">
    <button type="button" className="mkt-ventana-fondo" aria-label="Cerrar" tabIndex={-1} onClick={alCerrar} />
    <section className="mkt-ventana-caja" role="dialog" aria-modal="true" aria-labelledby="mkt-detalle-titulo">
      <header className="mkt-ventana-encabezado">
        <div>
          <div className="mkt-eyebrow">Campaña #{campana.id} · {formatoMes(campana.mes, true)}</div>
          <h2 id="mkt-detalle-titulo">{campana.nombre}</h2>
          <p className="mkt-tenue">
            Enviada el <b>{formatoFechaEnvio(campana.fechaEnvio, { conHora: true })}</b> (fecha de envío de Brevo) · Cargo: {campana.cargo} · Asunto: {asuntoDe(campana)}
          </p>
        </div>
        <button type="button" ref={cerrar} className="mkt-boton-icono" aria-label="Cerrar" onClick={alCerrar}><X size={18} /></button>
      </header>

      <div className="mkt-ventana-cuerpo">
        <div className="mkt-tabla-envoltura">
          <table className="mkt-tabla mkt-tabla-detalle">
            <thead><tr>
              <th scope="col">Métrica</th>
              <th scope="col" className="mkt-num">{VISTAS.metricas.label}</th>
              <th scope="col" className="mkt-num">{VISTAS.totalBrevo.label}</th>
            </tr></thead>
            <tbody>
              {FILAS.map((fila) => <tr key={fila.campo}>
                <th scope="row" className={fila.sangria ? 'is-sangria' : ''}>
                  {ETIQUETAS[fila.campo]} <Explicacion texto={definiciones?.[fila.campo]} />
                </th>
                <Celda m={sin} fila={fila} />
                <Celda m={brevo} fila={fila} />
              </tr>)}
            </tbody>
          </table>
        </div>
        {sin.notaPctApertura && <p className="mkt-nota">ⓘ % de apertura ({VISTAS.metricas.corto}): {sin.notaPctApertura}.</p>}
        <p className="mkt-nota">ⓘ Las aperturas totales y los clics en enlaces distintos no coinciden con la pantalla de Brevo, que usa otra fórmula.
          Las personas con clic pueden incluir clics automáticos de antivirus.</p>
        <p className="mkt-nota">Los rebotes muestran también su % sobre enviados; las bajas y quejas, sobre entregados.</p>

        <h3>Correos internos de RED</h3>
        <p className="mkt-tenue">{internos.enviados
          ? <>{formatoNumero(internos.enviados)} envío(s) interno(s), con {formatoNumero(internos.aperturasReales)} apertura(s) y {formatoNumero(internos.personasConClic)} persona(s) con clic. Están en "Total en Brevo" y no en "Sin internos".</>
          : 'Esta campaña no tiene correos internos de RED.'}</p>

        <h3>Por país (sin internos)</h3>
        <Aviso tipo="neutro">
          {pctDesconocido != null && <>El {formatoPct(pctDesconocido, 0)} de los envíos tiene país "Desconocido" (.com, .net…). </>}
          No compares países con estos datos.
        </Aviso>
        <div className="mkt-tabla-envoltura">
          <table className="mkt-tabla mkt-tabla-gris">
            <thead><tr><th scope="col">País</th><th scope="col" className="mkt-num">Enviados</th><th scope="col" className="mkt-num">Entregados</th><th scope="col" className="mkt-num">Aperturas reales</th><th scope="col" className="mkt-num">Personas con clic</th></tr></thead>
            <tbody>{paises.map(([pais, m]) => <tr key={pais}>
              <th scope="row">{pais}</th>
              <td className="mkt-num">{formatoNumero(m.enviados)}</td>
              <td className="mkt-num">{formatoNumero(m.entregados)}</td>
              <td className="mkt-num">{formatoNumero(m.aperturasReales)}</td>
              <td className="mkt-num">{formatoNumero(m.personasConClic)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {campana.duplicadosDescartados > 0 && <p className="mkt-nota">Se descartaron {campana.duplicadosDescartados} correo(s) repetido(s) en esta campaña.</p>}
        {sin.pocosDatos && <p className="mkt-nota"><Tono tono="pocos" /> Menos de 5 entregados: no se calculan porcentajes ni semáforo.</p>}

        {/* Lista por persona (D34, D42): se pide aparte; respeta "Sin internos / Total en Brevo". */}
        <DetallePersonas campana={campana} vista={vista} tarjetaPantalla={bloque(campana, vista)} />
        <p className="mkt-nota">Vista de la lista: <b>{VISTAS[vista].label}</b> (la que está elegida en la página).</p>
      </div>
    </section>
  </div>, document.body)
}
