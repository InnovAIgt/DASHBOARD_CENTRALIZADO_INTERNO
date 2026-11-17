// Marketing por canales · vista de Mailing (una sola vista, sin pestañas), con el formato del mockup
// aprobado, que sigue al dashboard original "Campañas de correo" (solo referencia; no se modificó).
// Orden (D31): encabezado · barra de filtros · transparencia de datos · filtro de campañas ·
// resumen del mes · métricas de interacción · salud del envío · destacados · gráficas · embudo ·
// ranking de campañas · ¿cómo se calcula?
// Todas las cifras vienen calculadas de /api/marketing/mailing; aquí solo se muestran.
import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Aviso, Explicacion } from './comunes.jsx'
import { DetalleCampana } from './DetalleCampana.jsx'
import { BarraFiltros, FiltroCampanas, LineaResumen, Transparencia } from './Filtros.jsx'
import { AperturasPorCargo, Embudo, EvolucionPorMes } from './Graficas.jsx'
import { MetricasInteraccion } from './Interaccion.jsx'
import {
  ESTADO_NIVEL, ESTADO_RIESGO, ETIQUETAS, MUESTRA, NIVELES, NOTA_REFERENCIA, UMBRALES, VISTAS, asuntoDe, bloque,
  campanasDelMes, campanasIncluidas, evaluar, formatoFechaEnvio, formatoMes, formatoNumero, formatoPct, nivelMuestra, ordenarRanking,
  sobreBase, sobreEnviados, tonoRiesgo, ultimoMes,
} from './datos.js'

function Seccion({ titulo, pista }) {
  return <h2 className="mkt-sgl">{titulo}{pista && <i>{pista}</i>}</h2>
}

function Kpi({ estado = 'na', etiqueta, valor, valorClase = '', explicacion, children }) {
  return <article className={`mkt-kpi mkt-st-${estado}`}>
    <div className="mkt-kpi-label">{etiqueta} <Explicacion texto={explicacion} /></div>
    <div className={`mkt-kpi-value ${valorClase}`}>{valor}</div>
    <div className="mkt-kpi-sub">{children}</div>
  </article>
}

// ------------------------------------------------------------------ 5. resumen del mes
// Solo lo que tiene datos reales (D33): las tarjetas de meta y de leads se quitaron
// (ver "Pendiente por falta de datos" en docs/marketing-canales/REQUISITOS.md).

function ResumenDelMes({ datos, vista, def }) {
  const mes = ultimoMes(datos)
  if (!mes) return null
  const delMes = campanasDelMes(datos, mes.mes)
  return <div className="mkt-grid-kpi">
    <Kpi estado="info" etiqueta="Campañas del mes" valor={formatoNumero(bloque(mes, vista).campanas)}
      explicacion={`Campañas que cuentan en el último mes con envíos (${def.mes}). Las de prueba no cuentan.`}>
      {formatoMes(mes.mes, true)} · {delMes.map((c) => `#${c.id} ${formatoFechaEnvio(c.fechaEnvio).slice(0, 5)}`).join(' · ')}
    </Kpi>
  </div>
}

// ------------------------------------------------------------------ 7. salud del envío

const TEXTO_RIESGO = {
  rebotesPermanentes: { rojo: `Crítico ≥ ${UMBRALES.rebotesPermanentes.rojo * 100} %`, amarillo: `Atención ≥ ${UMBRALES.rebotesPermanentes.amarillo * 100} %`, verde: `Bien < ${UMBRALES.rebotesPermanentes.amarillo * 100} %` },
  rebotesTemporales: { amarillo: `Atención ≥ ${UMBRALES.rebotesTemporales.amarillo * 100} %`, verde: `Bien < ${UMBRALES.rebotesTemporales.amarillo * 100} %` },
  bajas: { amarillo: `Atención ≥ ${UMBRALES.bajas.amarillo * 100} %`, verde: 'Bien' },
  quejas: { rojo: `Crítico ≥ ${UMBRALES.quejas.rojo * 100} %`, amarillo: 'Atención', verde: 'Bien' },
}

function KpiRiesgo({ m, campo, etiqueta, base, explicacion }) {
  const tono = tonoRiesgo(m, campo)
  const estado = ESTADO_RIESGO[tono]
  return <Kpi estado={estado} etiqueta={etiqueta} valor={formatoNumero(m[campo])} valorClase={`mkt-is-${estado}`} explicacion={explicacion}>
    {formatoPct(sobreBase(m, campo))} {base} · {tono === 'pocos' ? 'Pocos datos' : TEXTO_RIESGO[campo][tono]}
  </Kpi>
}

function SaludEnvio({ m, def }) {
  const nivelEntrega = evaluar('pctEntrega', m.pctEntrega)
  const eEntrega = ESTADO_NIVEL[nivelEntrega]
  return <>
    <div className="mkt-grid-salud">
      <Kpi estado={eEntrega} etiqueta="Entregados" valor={formatoNumero(m.entregados)} valorClase={`mkt-is-${eEntrega}`} explicacion={`${def.estadoFinal} ${def.pctEntrega}`}>
        {formatoPct(m.pctEntrega)} del envío · {NIVELES[nivelEntrega].texto}{nivelEntrega === 'critico' ? ' < 90 %' : ''}
      </Kpi>
      <KpiRiesgo m={m} campo="rebotesPermanentes" etiqueta="Rebote permanente" base="del envío" explicacion={def.rebotesPermanentes} />
      <KpiRiesgo m={m} campo="rebotesTemporales" etiqueta="Rebote temporal" base="del envío"
        explicacion={`${def.rebotesTemporales}${m.entregadosLuegoRebotados ? ` ${formatoNumero(m.entregadosLuegoRebotados)} se habían entregado y luego rebotaron.` : ''}`} />
      <Kpi estado="info" etiqueta="Apertura automática" valor={formatoNumero(m.soloAperturaAutomatica)} valorClase="mkt-is-info" explicacion={def.soloAperturaAutomatica}>
        iPhone (Apple MPP) · no cuenta como apertura
      </Kpi>
      <KpiRiesgo m={m} campo="bajas" etiqueta="Bajas" base="de los entregados" explicacion={def.bajas} />
      <KpiRiesgo m={m} campo="quejas" etiqueta="Quejas (spam)" base="de los entregados" explicacion={def.quejas} />
    </div>
    <p className="mkt-aclaracion">Solo <b>Entregados + Rebote permanente + Rebote temporal</b> suman el 100 % del envío
      ({formatoNumero(m.entregados)} + {formatoNumero(m.rebotesPermanentes)} + {formatoNumero(m.rebotesTemporales)}{m.sinEstado ? ` + ${formatoNumero(m.sinEstado)} sin estado` : ''} = {formatoNumero(m.enviados)}).
      Apertura automática, bajas y quejas son de los entregados y <b>no se suman</b>.</p>
  </>
}

// ------------------------------------------------------------------ 8. destacados

function Destacados({ d, def }) {
  if (!d) return null
  const { mejorCampana: mc, mejorCargo: cg, peorEntrega: pe, mejorPais: pa } = d
  const eMc = mc ? ESTADO_NIVEL[evaluar('pctApertura', mc.pctApertura)] : 'na'
  const eCg = cg ? ESTADO_NIVEL[evaluar('pctApertura', cg.pctApertura)] : 'na'
  const nivelPe = pe ? evaluar('pctEntrega', pe.pctEntrega) : 'pocos'
  return <div className="mkt-grid-kpi mkt-destacados">
    <Kpi estado={eMc} etiqueta="Mejor campaña" explicacion={def.destacados}
      valor={mc ? `#${mc.id} · ${mc.cargo === 'Sin cargo' ? mc.nombre : mc.cargo}` : 'Pocos datos'} valorClase={mc ? 'mkt-kpi-texto' : 'mkt-kpi-texto mkt-is-na'}>
      {mc ? `${formatoPct(mc.pctApertura)} de apertura · ${formatoNumero(mc.entregados)} entregados` : 'Ninguna campaña con 5 o más entregados'}
    </Kpi>
    <Kpi estado={eCg} etiqueta="Mejor cargo" explicacion={def.destacados}
      valor={cg ? cg.cargo : 'Pocos datos'} valorClase={cg ? 'mkt-kpi-texto' : 'mkt-kpi-texto mkt-is-na'}>
      {cg ? `${formatoPct(cg.pctApertura)} de apertura` : 'Sin cargo con datos suficientes'}
    </Kpi>
    <Kpi estado={ESTADO_NIVEL[nivelPe]} etiqueta="Peor entrega" explicacion={def.destacados}
      valor={pe ? `#${pe.id} · ${pe.cargo === 'Sin cargo' ? pe.nombre : pe.cargo}` : 'Pocos datos'} valorClase={pe ? 'mkt-kpi-texto' : 'mkt-kpi-texto mkt-is-na'}>
      {pe ? `${formatoPct(pe.pctEntrega)} entregado${['critico', 'bajo'].includes(nivelPe) ? ' · revisar la base' : ''}` : '—'}
    </Kpi>
    <Kpi estado={pa && !pa.pocosDatos ? ESTADO_NIVEL[evaluar('pctApertura', pa.pctApertura)] : 'na'} etiqueta="Mejor país" explicacion={def.destacados}
      valor={pa && !pa.pocosDatos ? pa.pais : 'Pocos datos'} valorClase={pa && !pa.pocosDatos ? 'mkt-kpi-texto' : 'mkt-kpi-texto mkt-is-na'}>
      {pa == null ? '—' : pa.pocosDatos ? `${formatoPct(pa.pctDesconocido, 0)} de los correos no indican país` : `${formatoPct(pa.pctApertura)} de apertura`}
    </Kpi>
  </div>
}

// ------------------------------------------------------------------ 11. ranking de campañas

function Pastilla({ estado, children }) {
  return <span className={`mkt-pill mkt-b-${estado}`}>{children}</span>
}

function PctNivel({ m, campo }) {
  const p = m[campo]
  if (p == null) return <Pastilla estado="na">pocos datos</Pastilla>
  return <Pastilla estado={ESTADO_NIVEL[evaluar(campo, p)]}>{formatoPct(p)}</Pastilla>
}

function Ranking({ campanas, vista, def, alElegir }) {
  const [soloSuficiente, setSoloSuficiente] = useState(false)
  const filas = useMemo(() => ordenarRanking(campanas, vista, 'pctApertura', 'mejores')
    .filter((c) => !soloSuficiente || bloque(c, vista).entregados >= MUESTRA.media), [campanas, vista, soloSuficiente])
  return <div className="mkt-card">
    <div className="mkt-ranking-cabeza">
      <h3 className="mkt-card-title">Ranking de campañas</h3>
      <label className="mkt-casilla"><input type="checkbox" checked={soloSuficiente} onChange={(e) => setSoloSuficiente(e.target.checked)} />
        Solo muestra suficiente (≥{MUESTRA.media} entregados)</label>
    </div>
    <div className="mkt-tabla-envoltura">
      <table className="mkt-rank">
        <thead><tr>
          <th className="mkt-c">#</th><th>Campaña</th><th>Asunto</th><th>Cargo <Explicacion texto={def.cargo} /></th>
          <th className="mkt-c">Envío</th><th className="mkt-c">Envíos</th><th className="mkt-c">Entregados</th><th className="mkt-c">Aperturas</th>
          <th className="mkt-c">Clics</th><th className="mkt-c">% Apertura</th><th className="mkt-c">% Clic</th><th className="mkt-c">CTOR</th>
          <th className="mkt-c">Rebote perm.</th><th className="mkt-c">Muestra</th>
        </tr></thead>
        <tbody>
          {filas.length === 0 && <tr><td colSpan={14} className="mkt-tenue">Ninguna campaña con muestra suficiente.</td></tr>}
          {filas.map((c, i) => {
            const m = bloque(c, vista)
            const muestra = nivelMuestra(m.entregados)
            const tonoRebote = tonoRiesgo(m, 'rebotesPermanentes')
            return <tr key={c.id} className="mkt-fila-clic" onClick={() => alElegir(c)}>
              <td className="mkt-c mkt-tenue">{i + 1}</td>
              <td className="mkt-rank-nombre"><button type="button" className="mkt-enlace-fila" onClick={(e) => { e.stopPropagation(); alElegir(c) }}
                aria-label={`Ver detalle de la campaña ${c.id}`}>#{c.id} · {c.nombre}</button></td>
              <td className={c.asunto ? '' : 'mkt-asunto-pendiente'}>{asuntoDe(c)}</td>
              <td title={c.cargo}>{c.cargo.replace(/^Gerente /, 'G. ')}</td>
              <td className="mkt-c">{formatoFechaEnvio(c.fechaEnvio).slice(0, 5)}</td>
              <td className="mkt-c">{formatoNumero(m.enviados)}</td>
              <td className="mkt-c">{formatoNumero(m.entregados)}</td>
              <td className="mkt-c">{formatoNumero(m.aperturasReales)}</td>
              <td className="mkt-c">{formatoNumero(m.personasConClic)}</td>
              <td className="mkt-c"><PctNivel m={m} campo="pctApertura" /></td>
              <td className="mkt-c"><PctNivel m={m} campo="pctClic" /></td>
              <td className="mkt-c"><PctNivel m={m} campo="pctCtor" /></td>
              <td className="mkt-c">{tonoRebote === 'pocos' ? <Pastilla estado="na">pocos datos</Pastilla>
                : <Pastilla estado={ESTADO_RIESGO[tonoRebote]}>{formatoPct(sobreEnviados(m, 'rebotesPermanentes'))}</Pastilla>}</td>
              <td className="mkt-c"><Pastilla estado={muestra.estado}>{muestra.texto}</Pastilla></td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
    <div className="mkt-note"><strong>Cómo leer esta tabla:</strong> ordenada de mayor a menor % de apertura (las de pocos datos, al final).
      % Apertura, % Clic y CTOR se calculan sobre personas reales (sin aperturas automáticas{vista === 'metricas' ? ' ni correos internos' : ''}).
      Muestra: Alta ≥{MUESTRA.alta} entregados · Media {MUESTRA.media}–{MUESTRA.alta - 1} · Baja &lt;{MUESTRA.media}.
      Colores de %: referencia general B2B (no es la meta de RED); rebote permanente: semáforo de salud. Clic en una fila para ver el detalle de la campaña.</div>
  </div>
}

// ------------------------------------------------------------------ ¿cómo se calcula?

function ComoSeCalcula({ reglas }) {
  const def = reglas.definiciones
  return <details className="mkt-como">
    <summary>¿Cómo se calcula cada número?</summary>
    <dl>
      {Object.entries(def).map(([clave, texto]) => <div key={clave}><dt>{ETIQUETAS[clave] ?? clave}</dt><dd>{texto}</dd></div>)}
      <div><dt>Pocos datos</dt><dd>Con menos de {reglas.minimoEntregados} entregados no se calculan apertura, CTR ni semáforo; el CTOR necesita al menos {reglas.minimoEntregados} aperturas reales.</dd></div>
      <div><dt>Anillos (Excelente / Promedio / Bajo)</dt><dd>{NOTA_REFERENCIA} Excelente en verde, Promedio en azul, Bajo en amarillo. Rojo solo si la entrega es menor a 90 % (crítico).</dd></div>
      <div><dt>Salud del envío</dt><dd>Entregados + rebote permanente + rebote temporal (+ sin estado) = 100 % de lo enviado. Apertura automática, bajas y quejas son de los entregados y no se suman.
        Rojo solo para lo crítico: rebote permanente desde {UMBRALES.rebotesPermanentes.rojo * 100} % o quejas desde {UMBRALES.quejas.rojo * 100} % de los entregados.</dd></div>
      <div><dt>Muestra</dt><dd>Alta: {MUESTRA.alta} o más entregados · Media: {MUESTRA.media} a {MUESTRA.alta - 1} · Baja: menos de {MUESTRA.media}.</dd></div>
      <div><dt>Filtros</dt><dd>Período (por fecha de envío de la campaña), cargo y campañas eligen QUÉ campañas entran; el servidor recalcula todos los totales con esas campañas.</dd></div>
      <div><dt>Campañas de prueba</dt><dd>El nombre contiene {reglas.patronesCampanaPrueba.map((p) => `"${p}"`).join(', ')} como palabra completa (sin importar mayúsculas ni tildes).</dd></div>
      <div><dt>Correos internos</dt><dd>Dominios {reglas.dominiosInternos.join(', ')} y sus subdominios.</dd></div>
      <div><dt>Asunto, territorio y vendedor</dt><dd>El reporte de Brevo no los trae. Se llenarán con el catálogo de campañas (pendiente).</dd></div>
    </dl>
  </details>
}

// ------------------------------------------------------------------ vista

export function Encabezado({ cargando, alActualizar, subtitulo }) {
  return <header className="mkt-encabezado">
    <div>
      <div className="mkt-eyebrow">Marketing · Mailing</div>
      <h1 className="mkt-titulo">Campañas de correo</h1>
      <p className="mkt-subtitulo">{subtitulo}</p>
    </div>
    <button type="button" className="mkt-boton-rojo" onClick={alActualizar} disabled={cargando}>
      <RefreshCw size={16} className={cargando ? 'mkt-girando' : ''} aria-hidden="true" />{cargando ? 'Actualizando…' : 'Actualizar'}
    </button>
  </header>
}

/**
 * La vista completa. Recibe los datos y el estado de los filtros (los maneja MarketingCanales.jsx).
 */
export function PantallaMailing({ datos, disponibles, vista, alCambiarVista, filtros, alCambiarFiltros, cargando, error, sinCampanas, alActualizar }) {
  const [elegida, setElegida] = useState(null)
  const def = datos.reglas.definiciones
  const campanas = campanasIncluidas(datos)
  const total = bloque(datos.totales, vista)
  const cargos = [...new Set((disponibles ?? []).filter((c) => !c.excluida).map((c) => c.cargo))]
  const pctDesconocido = datos.destacados?.metricas?.mejorPais?.pctDesconocido ?? null

  return <>
    <Encabezado cargando={cargando} alActualizar={alActualizar} subtitulo={`RED Intelfon · Campañas de Brevo · fuente: ${datos.fuente.descripcion ?? '—'}`} />
    <BarraFiltros vista={vista} alCambiarVista={alCambiarVista} filtros={filtros} alCambiarFiltros={alCambiarFiltros} cargos={cargos} />
    <LineaResumen datos={datos} vista={vista} filtros={filtros} />
    {error && <Aviso tipo="atencion" titulo="No se pudo actualizar">{error} Se muestran los últimos datos leídos.</Aviso>}

    <Transparencia datos={datos} />
    <FiltroCampanas disponibles={disponibles} filtros={filtros} alCambiarFiltros={alCambiarFiltros} />

    {sinCampanas ? <Aviso tipo="neutro" titulo="Ninguna campaña elegida">Ninguna campaña coincide con los filtros. Usa "Limpiar filtros" o "Seleccionar todas".</Aviso> : <>
      <Seccion titulo="Resumen del mes" pista="último mes con envíos" />
      <ResumenDelMes datos={datos} vista={vista} def={def} />

      <Seccion titulo="Métricas de interacción" pista={`porcentajes sobre el total entregado · ${VISTAS[vista].corto}`} />
      <div className="mkt-card">
        <MetricasInteraccion m={total} definiciones={def} />
        <div className="mkt-note">Rangos de referencia general B2B, <strong>no son la meta de RED</strong>.
          {total.notaPctApertura && <> La apertura: {total.notaPctApertura.charAt(0).toLowerCase() + total.notaPctApertura.slice(1)}.</>}
          {' '}Los clics pueden incluir clics automáticos de antivirus.</div>
      </div>

      <Seccion titulo="Salud del envío" pista={`entregados + rebotes suman el 100 % del envío (${formatoNumero(total.enviados)})`} />
      <SaludEnvio m={total} def={def} />

      <Destacados d={datos.destacados?.[vista]} def={def} />

      <div className="mkt-grid-graficas">
        <AperturasPorCargo porCargo={datos.porCargo ?? []} vista={vista} def={def} />
        <EvolucionPorMes meses={datos.meses} vista={vista} />
      </div>

      <Embudo m={total} />

      <Ranking campanas={campanas} vista={vista} def={def} alElegir={setElegida} />
    </>}

    <ComoSeCalcula reglas={datos.reglas} />

    {elegida && <DetalleCampana campana={elegida} definiciones={def} pctDesconocido={pctDesconocido} alCerrar={() => setElegida(null)} />}
  </>
}

/** Estado cuando todavía no hay fuente configurada o falló la primera lectura. */
export function MailingSinDatos({ mensaje, tipo, cargando, alActualizar }) {
  return <>
    <Encabezado cargando={cargando} alActualizar={alActualizar} subtitulo="RED Intelfon · Campañas de Brevo" />
    <Aviso tipo={tipo} titulo={tipo === 'atencion' ? 'No se pudieron leer los datos de mailing' : 'Fuente de datos no configurada'}>
      <p>{mensaje}</p>
    </Aviso>
  </>
}
