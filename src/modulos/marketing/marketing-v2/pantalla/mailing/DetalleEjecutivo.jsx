// Canales de marketing · Mailing · Campañas: DETALLE DE UN EJECUTIVO (acordeón de «Por comercial»), como la maqueta
// del ejecutivo desplegado (solo se leyó): 4 números, clientes interesados («Llamar»), «No reciben» y «Nunca abren»
// lado a lado, «Sus campañas» (asunto de título) y la fila del aviso (correo del ejecutivo, «Aviso 48 h» con la misma
// vista previa del correo con diseño, y «Ver cartera completa»). Nunca envía nada.
import { useCallback, useMemo, useState } from 'react'
import { Mail } from 'lucide-react'
import { fechaCorta, NOMBRE_CARGO, numero, pct } from '../../datos/calculos.js'
import { textosCampana } from '../../datos/campana.js'
import { correoValido, gruposEjecutivos } from '../../datos/correoEjecutivo.js'
import { detalleCartera } from '../../datos/porEjecutivo.js'
import { abrirCorreoSimple, guardarLibreta, leerLibreta, VistaCorreo } from './Ejecutivos.jsx'

const MAXIMO = 6
const CLASE_SEMAFORO = { verde: 'is-verde', amarillo: 'is-ambar', rojo: 'is-rojo' }

/** Lista corta con «y N más» (despliega el resto). */
function ListaCorta({ items, render, vacio }) {
  const [todas, setTodas] = useState(false)
  if (!items.length) return <p className="mkv2-nota">{vacio}</p>
  return <div className="mkv2-ej-lista">
    {(todas ? items : items.slice(0, MAXIMO)).map(render)}
    {items.length > MAXIMO && <button type="button" className="mkv2-ej-mas" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : `y ${numero(items.length - MAXIMO)} más`}</button>}
  </div>
}

export function DetalleEjecutivo({ e, campanaDe, verCartera }) {
  const d = useMemo(() => detalleCartera(e), [e])
  const asunto = (id) => textosCampana(campanaDe(id), id).titulo
  // Correo del ejecutivo: el guardado en este navegador o el de correos_usuarios (Cumplimiento).
  const correoBase = e.filas.flatMap((f) => f.clientes ?? []).find((x) => x.ejecutivo === e.ejecutivo && x.correoEjecutivo)?.correoEjecutivo ?? ''
  const [para, setPara] = useState(() => leerLibreta()[e.ejecutivo] || correoBase)
  const [vista, setVista] = useState(false)
  const [aviso, setAviso] = useState('')
  const cerrarVista = useCallback(() => setVista(false), [])
  const grupo = useMemo(() => gruposEjecutivos(e.filas.filter((f) => f.status === 'CORREGIR'), campanaDe).exacta.find((g) => g.ejecutivo === e.ejecutivo) ?? null, [e, campanaDe])
  const guardar = () => {
    const v = para.trim()
    if (v && !correoValido(v)) { setAviso('Escribe una dirección de correo válida.'); return false }
    const libreta = leerLibreta()
    if (v) libreta[e.ejecutivo] = v
    else delete libreta[e.ejecutivo]
    guardarLibreta(libreta)
    return true
  }
  const avisar = () => { if (guardar()) { setAviso(''); setVista(true) } }
  const simple = () => {
    setVista(false)
    if (!guardar()) return
    if (!correoValido(para)) { setAviso('Escribe el correo del ejecutivo para preparar el mensaje.'); return }
    const corto = abrirCorreoSimple(grupo, para)
    setAviso(corto ? 'Se abrirá el correo con la lista abreviada. Revisa antes de pulsar Enviar.' : 'Se abrirá el correo con destinatario, asunto y lista ya escritos. Revisa antes de pulsar Enviar.')
  }
  const t = e.totales

  return <div className="mkv2-det">
    <div className="mkv2-ej-numeros">
      <div><b>{numero(t.enviados)}</b><span>enviados a su cartera</span></div>
      <div><b className={CLASE_SEMAFORO[e.semaforo]}>{pct(e.tasas.entrega)}</b><span>entrega</span></div>
      <div><b>{pct(e.tasas.apertura)}</b><span>apertura</span></div>
      <div><b className="is-rojo">{numero(t.corregir)}</b><span>por corregir</span></div>
    </div>

    {!e.sinIdentificar && <section className="mkv2-det-bloque">
      <h4>🔥 Clientes interesados <small>para dar seguimiento</small></h4>
      <ListaCorta items={d.interesados} vacio="Ningún cliente dio clic ni abrió 2 o más campañas."
        render={(x) => <div key={x.nombre} className="mkv2-ej-fila is-fuego">
          <span><b>{x.nombre}</b><small>{x.motivo === 'clic' ? `Dio clic en «${asunto(x.campanaId)}»` : `Abrió ${numero(x.abiertas)} de ${numero(x.de)} campañas`}</small></span>
          <span className="mkv2-ej-pill is-verde">Llamar</span>
        </div>} />
    </section>}

    <div className="mkv2-det-rejilla">
      <section className="mkv2-det-bloque">
        <h4>No reciben <small>rebotaron</small></h4>
        <ListaCorta items={d.noReciben} vacio="Ninguna dirección por corregir."
          render={(x) => <div key={x.nombre} className="mkv2-ej-fila">
            <span><b data-tip={x.nombre}>{x.nombre}</b><small>{x.motivo}{x.correos > 1 ? ` · ${numero(x.correos)} direcciones` : ''}</small></span>
            <span className="mkv2-ej-pill is-rojo">Corregir</span>
          </div>} />
      </section>
      <section className="mkv2-det-bloque">
        <h4>Nunca abren</h4>
        <ListaCorta items={d.nuncaAbren} vacio="Todos abrieron al menos una campaña."
          render={(x) => <div key={x.nombre} className="mkv2-ej-fila">
            <span><b data-tip={x.nombre}>{x.nombre}</b><small>Recibió {numero(x.de)} {x.de === 1 ? 'campaña' : 'campañas'}</small></span>
            <span className="mkv2-ej-pill">0 de {numero(x.de)}</span>
          </div>} />
      </section>
    </div>

    <section className="mkv2-det-bloque">
      <h4>Sus campañas</h4>
      <div className="mkv2-ej-lista">
        {d.campanas.map((x) => {
          const c = campanaDe(x.id)
          const tx = textosCampana(c, x.id, { fecha: false })
          const linea = [`#${x.id}`, tx.conAsunto ? tx.nombre : '', c?.cargo ? (NOMBRE_CARGO[c.cargo] ?? c.cargo) : '', c?.fecha ? fechaCorta(c.fecha) : ''].filter(Boolean)
          return <div key={x.id} className="mkv2-ej-fila is-campana" data-tip={`${tx.titulo}\n${linea.join(' · ')}\n${numero(x.enviados)} enviados a su cartera`}>
            <span className="mkv2-tc"><strong className="mkv2-tc-titulo">{tx.titulo}</strong><small className="mkv2-tc-linea">{linea.join(' · ')}</small></span>
            <span className="mkv2-ej-cifras">
              <span><b className={CLASE_SEMAFORO[x.semaforo]}>{pct(x.entrega)}</b><small>entrega</small></span>
              <span><b>{pct(x.apertura)}</b><small>apertura</small></span>
            </span>
          </div>
        })}
      </div>
    </section>

    {!e.sinIdentificar && <div className="mkv2-ej-aviso">
      <b>{numero(t.corregir)} por corregir</b>
      {grupo && <>
        <input className="mkv2-control" type="email" value={para} onChange={(ev) => { setPara(ev.target.value); setAviso('') }} onBlur={guardar}
          placeholder="correo@empresa.com" autoComplete="email" aria-label={`Correo de ${e.ejecutivo}`} />
        <button type="button" className="fv2-pildora mkv2-boton-rojo" onClick={avisar}><Mail size={13} />Aviso 48 h</button>
      </>}
      <button type="button" className="fv2-pildora mkv2-ej-cartera" onClick={() => verCartera(e)}>Ver cartera completa ›</button>
    </div>}
    {aviso && <p className="mkv2-correo-aviso" role="status">{aviso}</p>}
    {e.sinIdentificar && <p className="mkv2-nota">Estos correos no tienen cliente identificado en Cumplimiento: no se puede avisar a un ejecutivo. Revísalos en Correos por corregir.</p>}
    <p className="mkv2-nota">Leads de su cartera (calificados y no calificados): próximamente.</p>
    {vista && grupo && <VistaCorreo grupo={grupo} para={para} onCerrar={cerrarVista} onSimple={simple} />}
  </div>
}
