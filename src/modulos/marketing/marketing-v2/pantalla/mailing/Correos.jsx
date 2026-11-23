// Canales de marketing · Mailing · Correos por corregir y Detalle por correo (MAILING.md, secciones 3 a 5 y 8).
// Reciben el clic de Resultados generales (foco: qué estado se pidió) y responden a los filtros de arriba.
// SOLO CONTEOS: los correos de personas no se muestran hasta que exista el inicio de sesión real del portal.
// Para cada estado se muestra el total de Brevo (todas las campañas) y el conteo por persona del webhook (solo
// campañas enviadas después de activarlo). Sin datos, las cifras quedan en «—» gris (nunca inventadas).
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { COLORES } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { ESTADOS_DETALLE, estadoDetalle, numero, pct, porcentaje, sumarResumen, sumarTotales } from '../../datos/calculos.js'
import { Aviso, Enfoque, FilaBarra, Mini, Tarjeta, TablaEstructura, TEXTO_WEBHOOK } from './piezas.jsx'

const SIN_SESION = 'Los correos se mostrarán aquí cuando el portal tenga inicio de sesión real. Por ahora solo hay conteos.'
const v = (s, n) => (s.hayDatos ? numero(n) : '—')

function Buscador({ placeholder }) {
  return <label className="mkv2-buscar-v" title="Se activa con el inicio de sesión real">
    <Search size={14} aria-hidden="true" />
    <input className="mkv2-control" type="search" disabled placeholder={placeholder} />
  </label>
}

function Motivos({ titulo, sub, motivos, color, hayDatos }) {
  const max = motivos[0]?.[1] ?? 0
  return <Tarjeta titulo={titulo} sub={sub}>
    {hayDatos && motivos.length
      ? <div className="mkv2-embudo">{motivos.map(([m, n]) => <FilaBarra key={m} nombre={m} valor={n} max={max} color={color} />)}</div>
      : <Aviso icono="info" titulo={hayDatos ? 'Sin casos en las campañas filtradas' : 'Sin datos del webhook todavía'} texto={hayDatos ? undefined : TEXTO_WEBHOOK} />}
  </Tarjeta>
}

const detalleFiltro = (campanas) => `${numero(campanas.length)} campañas según los filtros de arriba`

export function CorreosPorCorregir({ campanas, resumen, errorResumen, foco, limpiarFoco, volver }) {
  const s = useMemo(() => sumarResumen(campanas, resumen), [campanas, resumen])
  return <>
    {foco && <Enfoque titulo={foco.titulo ?? 'Correos por corregir'} detalle={detalleFiltro(campanas)} onTodos={limpiarFoco} onVolver={volver} />}
    {errorResumen
      ? <Aviso titulo="No se pudo leer el detalle del webhook" texto={errorResumen} />
      : s.hayDatos
        ? <Aviso titulo={`${numero(s.corregir)} direcciones requieren corrección o verificación`} texto="Solo las marcadas «CORREGIR CORREO» según el motivo del rebote final. CORREGIR es una revisión de datos, no prueba que la cuenta no exista." />
        : <Aviso icono="info" titulo="Correos por corregir" texto={`${TEXTO_WEBHOOK} Las campañas anteriores no tienen motivo de rebote por persona.`} />}
    <div className="mkv2-minis">
      <Mini nombre="Correos por corregir" valor={v(s, s.corregir)} nota="Direcciones con CORREGIR CORREO" color={COLORES.rosa} />
      <Mini nombre="% de los enviados" valor={s.hayDatos ? pct(porcentaje(s.corregir, s.enviados)) : '—'} nota="Sobre los enviados con detalle" color={COLORES.amarillo} />
      <Mini nombre="Rebotes que se mantienen" valor={v(s, s.estados.rebote_temporal + s.estados.rebote_permanente - s.corregir)} nota="Rebote sin error de dirección (MANTENER)" color={COLORES.azulClaro} />
      <Mini nombre="Campañas con detalle" valor={numero(s.campanasConDetalle)} nota="Enviadas después de activar el webhook" />
    </div>
    <div className="mkv2-duo">
      <Motivos titulo="Motivos técnicos · CORREGIR" sub="Por qué se pide revisar la dirección" motivos={s.motivosCorregir} color={COLORES.rosa} hayDatos={s.hayDatos} />
      <Motivos titulo="Motivos técnicos · MANTENER" sub="Rebotes que no prueban que la dirección esté mal" motivos={s.motivosMantener} color={COLORES.azulClaro} hayDatos={s.hayDatos} />
    </div>
    <Tarjeta titulo="Correos pendientes por ejecutivo de ventas" sub="Direcciones únicas agrupadas por ejecutivo · aviso con plazo de 48 horas">
      <Aviso icono="candado" titulo="Requiere el cruce con Cumplimiento de Clientes y el inicio de sesión real"
        texto="El ejecutivo sale de la cuenta del cliente (País + Código). El aviso se prepara como borrador: no hay envío automático." />
    </Tarjeta>
    <Tarjeta titulo="Listado de correos por corregir" sub="Detalle completo por campaña" acciones={<Buscador placeholder="Buscar dirección, dominio o ejecutivo" />}>
      <TablaEstructura columnas={['Dirección de correo', 'Cliente', 'Ejecutivo de ventas', 'Status de correo', 'Motivo técnico', 'Resultado final', 'Campaña', 'Asunto', 'Fecha de rebote']}
        mensaje={s.hayDatos ? SIN_SESION : `${TEXTO_WEBHOOK} ${SIN_SESION}`} />
    </Tarjeta>
  </>
}

/** Colores de cada estado en las tarjetas del detalle. */
const COLOR_ESTADO = {
  todos: COLORES.azul, entregado: COLORES.verdeClaro, apertura: COLORES.azulClaro, clic: COLORES.verde, rebotes: COLORES.rosa,
  rebote_temporal: COLORES.amarillo, rebote_permanente: COLORES.rosa, sin_confirmacion: COLORES.tenue, baja: COLORES.amarillo, spam: COLORES.rosa,
}

export function DetallePorCorreo({ campanas, resumen, errorResumen, foco, limpiarFoco, volver }) {
  const [estado, setEstado] = useState(foco?.estado ?? 'todos')
  const t = useMemo(() => sumarTotales(campanas), [campanas])
  const s = useMemo(() => sumarResumen(campanas, resumen), [campanas, resumen])
  const e = estadoDetalle(estado)
  const brevo = e.brevo(t)
  const elegir = (id) => () => setEstado(id)
  return <>
    {foco && <Enfoque titulo={`Detalle del indicador · ${e.label}`} detalle={detalleFiltro(campanas)} onTodos={() => { setEstado('todos'); limpiarFoco() }} onVolver={volver} />}
    {errorResumen && <Aviso titulo="No se pudo leer el detalle del webhook" texto={errorResumen} />}

    <Tarjeta titulo={e.label} sub="Total de Brevo de las campañas filtradas y conteo por persona del webhook">
      <div className="mkv2-minis">
        <Mini nombre="Según los totales de Brevo" valor={numero(brevo)} color={COLOR_ESTADO[e.id]}
          extra={e.id !== 'todos' && t.enviados ? <small>{pct(porcentaje(brevo, ['apertura', 'clic'].includes(e.id) ? t.entregados : t.enviados))}</small> : null}
          nota={`${e.notaBrevo ? `${e.notaBrevo} · ` : ''}todas las campañas filtradas`} />
        <Mini nombre="Con detalle por persona" valor={v(s, e.webhook(s))} color={COLOR_ESTADO[e.id]} nota={s.hayDatos ? `${numero(s.campanasConDetalle)} campañas con webhook` : TEXTO_WEBHOOK} />
        <Mini nombre="Correos visibles" valor="—" nota="Requiere el inicio de sesión real del portal" />
        <Mini nombre="Campañas filtradas" valor={numero(t.campanas)} nota="Cambian con los filtros de arriba" />
      </div>
    </Tarjeta>

    <div className="mkv2-minis mkv2-minis5">
      {ESTADOS_DETALLE.filter((x) => x.id !== 'todos').map((x) => <Mini key={x.id} nombre={x.label} valor={numero(x.brevo(t))} color={COLOR_ESTADO[x.id]}
        nota={s.hayDatos ? `Webhook: ${numero(x.webhook(s))}` : 'Total de Brevo'} activo={estado === x.id} onClick={elegir(x.id)} enlace="Ver" />)}
    </div>

    {s.hayDatos && <Tarjeta titulo="Estado final por destinatario" sub="Gana el último evento con fecha; empate → Sin confirmación">
      <div className="mkv2-embudo">
        {['entregado', 'rebote_temporal', 'rebote_permanente', 'sin_confirmacion'].map((id) => <FilaBarra key={id} nombre={estadoDetalle(id).label}
          valor={estadoDetalle(id).webhook(s)} max={s.destinatarios} color={COLOR_ESTADO[id]} activa={estado === id} onClick={elegir(id)}
          detalle={pct(porcentaje(estadoDetalle(id).webhook(s), s.destinatarios))} />)}
      </div>
      <p className="mkv2-nota">«proxy_open» (posible apertura automática): {numero(s.proxyOpen)} destinatarios · por confirmar con la campaña de prueba.</p>
    </Tarjeta>}

    <Tarjeta titulo="Detalle por destinatario" sub="Una fila por correo y campaña · fechas y señales originales"
      acciones={<>
        <select className="mkv2-control mkv2-control-chico" value={estado} onChange={(ev) => setEstado(ev.target.value)} aria-label="Estado">
          {ESTADOS_DETALLE.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <Buscador placeholder="Buscar correo, cliente o ejecutivo" />
      </>}>
      <TablaEstructura columnas={['Correo', 'Cliente y país', 'Ejecutivo', 'Campaña', 'Cargo', 'Estado final', 'Status', 'Apertura', 'Clic', 'Motivo técnico', 'Fecha de envío']}
        mensaje={`«${e.label}»: ${numero(brevo)} según los totales de Brevo. ${s.hayDatos ? '' : `${TEXTO_WEBHOOK} `}${SIN_SESION}`} />
    </Tarjeta>
  </>
}
