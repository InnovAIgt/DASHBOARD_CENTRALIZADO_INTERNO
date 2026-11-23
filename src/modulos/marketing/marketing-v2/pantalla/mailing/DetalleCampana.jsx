// Canales de marketing · Mailing · Campañas: DETALLE DE UNA CAMPAÑA (se abre en el acordeón, debajo de su tarjeta).
// Objetivo con su estado y de dónde salió (datos/objetivo.js), asunto/fecha/cargo, recorrido (Brevo), dónde dieron
// clic, rebotes y por corregir (detalle por persona), comerciales con clientes en esa campaña y accesos.
// El detalle por persona de la campaña NO se filtra por país: la gráfica «Por campaña» no se separa por país.
import { fechaCorta, NOMBRE_CARGO, numero, pct, porcentaje } from '../../datos/calculos.js'
import { limpiarCampo } from '../../datos/campana.js'
import { objetivoDeCampana } from '../../datos/objetivo.js'
import { metricasPorEjecutivo } from '../../datos/porEjecutivo.js'
import { COLOR_MAILING, COLOR_SEMAFORO, FilaBarra } from './piezas.jsx'

export const CLASE_ESTADO_OBJETIVO = { sugerido: 'is-sugerido', revisar: 'is-revisar', confirmado: 'is-confirmado' }
const TEXTO_ESTADO = { sugerido: 'Sugerido', revisar: 'Revisar', confirmado: 'Confirmado' }

/** Pastilla del objetivo: estado + objetivo + de dónde salió. */
export function ObjetivoCampana({ c }) {
  const o = objetivoDeCampana(c)
  return <div className="mkv2-objetivo" data-tip={`${o.objetivo}\n${o.textoFuente}`}>
    <span className={`mkv2-estado-objetivo ${CLASE_ESTADO_OBJETIVO[o.estado]}`}>{TEXTO_ESTADO[o.estado]}</span>
    <strong>{o.objetivo}</strong>
    <small>{o.textoFuente}{o.estado === 'confirmado' && c.asignadoPor ? ` · por ${c.asignadoPor}` : ''}{o.estado === 'confirmado' && c.objetivoAsignadoEn ? ` · ${fechaCorta(c.objetivoAsignadoEn)}` : ''}</small>
  </div>
}

const destino = (url) => (url === 'ENLACE_DE_BAJA' ? 'Enlace de baja' : url ? url.replace(/^https?:\/\//, '') : 'Clic sin destino registrado')

export function DetalleCampana({ c, filas = [], verCampana, verCorreos }) {
  const t = c.totales
  const conDetalle = filas.length > 0
  // Dónde dieron clic: personas por destino.
  const clics = new Map()
  for (const f of filas.filter((x) => x.clic === 'CLIC REGISTRADO')) {
    const k = destino(f.urlClic)
    clics.set(k, (clics.get(k) ?? new Set()).add(String(f.correo).toLowerCase()))
  }
  const destinos = [...clics].map(([k, s]) => [k, s.size]).sort((a, b) => b[1] - a[1])
  // Por corregir: direcciones únicas y motivos.
  const corregir = filas.filter((f) => f.status === 'CORREGIR')
  const motivos = new Map()
  for (const f of corregir) motivos.set(f.motivoTecnico ?? 'Pendiente de verificar', (motivos.get(f.motivoTecnico ?? 'Pendiente de verificar') ?? 0) + 1)
  const comerciales = metricasPorEjecutivo(filas, null)
  const identificados = comerciales.filter((e) => !e.sinIdentificar).sort((a, b) => b.totales.enviados - a.totales.enviados)
  const sinIdentificar = comerciales.find((e) => e.sinIdentificar)
  const etapa = (nombre, valor, color, base) => <FilaBarra nombre={nombre} valor={valor} max={t.enviados} color={color}
    detalle={base} tip={`${nombre}: ${numero(valor)} de ${numero(t.enviados)} enviados`} />

  return <div className="mkv2-det">
    <ObjetivoCampana c={c} />
    <dl className="mkv2-det-datos">
      <div><dt>Asunto</dt><dd>{limpiarCampo(c.asunto) || '—'}</dd></div>
      <div><dt>Fecha de envío</dt><dd>{fechaCorta(c.fecha)}</dd></div>
      <div><dt>Cargo</dt><dd>{NOMBRE_CARGO[c.cargo] ?? c.cargo}</dd></div>
    </dl>
    <div className="mkv2-det-rejilla">
      <section>
        <h4>Recorrido <small>Totales de Brevo</small></h4>
        <div className="mkv2-embudo mkv2-det-embudo">
          {etapa('Enviados', t.enviados, COLOR_MAILING.enviados, 'base')}
          {etapa('Entregados', t.entregados, COLOR_SEMAFORO[c.semaforo] ?? COLOR_MAILING.entregados, `${pct(c.tasas.entrega)} de enviados`)}
          {etapa('Aperturas', t.aperturas, COLOR_MAILING.apertura, `${pct(c.tasas.apertura)} de entregados`)}
          {etapa('Clics', t.clics, COLOR_MAILING.clic, `${pct(c.tasas.clic)} de entregados`)}
        </div>
      </section>
      <section>
        <h4>Dónde dieron clic <small>personas por destino</small></h4>
        {!conDetalle ? <p className="mkv2-nota">Sin detalle por persona para esta campaña (solo totales de Brevo).</p>
          : destinos.length
            ? <ul className="mkv2-det-lista">{destinos.map(([k, n]) => <li key={k} data-tip={k}><span className="mkv2-recorte">{k}</span><b>{numero(n)}</b></li>)}</ul>
            : <p className="mkv2-nota">Nadie dio clic en esta campaña.</p>}
      </section>
      <section>
        <h4>Rebotes y por corregir</h4>
        <ul className="mkv2-det-lista">
          <li><span>Rebote temporal</span><b>{numero(t.reboteTemporal)} <small>{pct(c.tasas.reboteTemporal)}</small></b></li>
          <li><span>Rebote duro</span><b>{numero(t.rebotePermanente)} <small>{pct(c.tasas.rebotePermanente)}</small></b></li>
          <li className="is-rojo"><span>Por corregir (direcciones)</span><b>{conDetalle ? numero(new Set(corregir.map((f) => String(f.correo).toLowerCase())).size) : '—'}</b></li>
        </ul>
        {[...motivos].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, n]) => <p key={m} className="mkv2-det-motivo">{m} · <b>{numero(n)}</b></p>)}
      </section>
      <section>
        <h4>Comerciales con clientes en esta campaña</h4>
        {!conDetalle ? <p className="mkv2-nota">Sin detalle por persona para esta campaña.</p>
          : <ul className="mkv2-det-lista">
            {identificados.map((e) => <li key={e.ejecutivo} data-tip={`${e.ejecutivo}: ${numero(e.totales.enviados)} enviados a su cartera · entrega ${pct(e.tasas.entrega)}`}>
              <span>{e.ejecutivo}</span><b>{numero(e.totales.enviados)} <small>{pct(e.tasas.entrega)}</small></b>
            </li>)}
            {sinIdentificar && <li className="is-gris"><span>Sin identificar</span><b>{numero(sinIdentificar.totales.enviados)} <small>{pct(porcentaje(sinIdentificar.totales.enviados, filas.length))} del total</small></b></li>}
          </ul>}
      </section>
    </div>
    <div className="mkv2-acordeon-acciones">
      <button type="button" className="fv2-pildora" onClick={() => verCorreos(c)}>Ver correos de esta campaña</button>
      <button type="button" className="fv2-pildora" onClick={() => verCampana(c)}>Ver solo esta en Resumen</button>
      <span className="mkv2-nota mkv2-det-leads">Leads: próximamente.</span>
    </div>
  </div>
}
