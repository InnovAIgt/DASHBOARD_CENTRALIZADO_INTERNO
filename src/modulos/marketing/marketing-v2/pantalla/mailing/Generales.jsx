// Canales de marketing · Mailing · Resultados generales (MAILING.md, secciones 6 y 7).
// Dinámico como la plantilla: los filtros cambian todo al momento y cada tarjeta, etapa del recorrido y estado de
// incidencias abre la sub-pestaña que corresponde ya enfocada (abrir). Totales reales de Brevo; lo que necesita
// detalle por persona viene del webhook. Nunca correos.
import { useMemo } from 'react'
import { COLORES } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { detalleWebhook, fechaCorta, NOMBRE_CARGO, numero, pct, porCargo, porCorregirCampana, porcentaje, sumarTotales } from '../../datos/calculos.js'
import { Aviso, Bloque, COLOR_SEMAFORO, DonaPartes, FilaBarra, Gris, InsigniaCargo, Intro, Kpi, Mini, PildoraEntrega, Tarjeta, TablaOrdenable, TEXTO_WEBHOOK } from './piezas.jsx'

/** Abre «Detalle por correo» enfocado en un estado. */
const verDetalle = (abrir, estado, titulo) => () => abrir({ vista: 'detalle', estado, titulo })

function Indicadores({ t, abrir }) {
  return <div className="mkv2-kpis6">
    <Kpi titulo="Enviados" valor={numero(t.enviados)} porcentaje={t.enviados ? pct(100) : '—'} base="de la selección" nota={`Todos los destinatarios · ${numero(t.campanas)} campañas`}
      enlace="Ver destinatarios" color={COLORES.azul} onClick={verDetalle(abrir, 'todos', 'Enviados')} />
    <Kpi titulo="Entregados" valor={numero(t.entregados)} porcentaje={pct(t.tasas.entrega)} base="de los envíos" nota="Sin rebote posterior"
      enlace="Ver destinatarios" color={COLORES.verdeClaro} onClick={verDetalle(abrir, 'entregado', 'Entregados')} />
    <Kpi titulo="Aperturas" valor={numero(t.aperturas)} porcentaje={pct(t.tasas.apertura)} base="de entregados" nota={`Incluye automáticas · Apple MPP ${numero(t.aperturasApple)}`}
      enlace="Ver destinatarios" color={COLORES.azulClaro} onClick={verDetalle(abrir, 'apertura', 'Aperturas')}
      title="Aperturas de Brevo con las automáticas incluidas. Apple MPP se muestra aparte: no se resta." />
    <Kpi titulo="Clics" valor={numero(t.clics)} porcentaje={pct(t.tasas.clic)} base="de entregados" nota="Origen humano no confirmado"
      enlace="Ver destinatarios" color={COLORES.verde} onClick={verDetalle(abrir, 'clic', 'Clics')} />
    <Kpi titulo="Rebote temporal" valor={numero(t.reboteTemporal)} porcentaje={pct(t.tasas.reboteTemporal)} base="de los envíos" nota="Problema temporal de entrega"
      enlace="Ver rebotes" color={COLORES.amarillo} onClick={verDetalle(abrir, 'rebote_temporal', 'Rebote temporal')} />
    <Kpi titulo="Rebote permanente" valor={numero(t.rebotePermanente)} porcentaje={pct(t.tasas.rebotePermanente)} base="de los envíos" nota="Rechazo permanente"
      enlace="Ver rebotes" color={COLORES.rosa} onClick={verDetalle(abrir, 'rebote_permanente', 'Rebote permanente')} />
  </div>
}

function Calidad({ t, det, abrir }) {
  const sinConf = t.sinConfirmacionAjustado
    ? 'Con los totales de Brevo no se puede calcular exacto (la resta dio negativo y se muestra 0)'
    : 'Enviados sin entrega ni rebote informados'
  return <>
    <Bloque titulo="Entregas, rebotes y calidad de contactos" />
    <div className="mkv2-minis mkv2-minis5">
      <Mini nombre="Tasa de entrega" valor={<PildoraEntrega tasa={t.tasas.entrega} semaforo={t.semaforo} />}
        nota="Semáforo: 100 % verde · 90 % a menos de 100 % amarillo · menos de 90 % rojo" enlace="Comparar campañas"
        onClick={() => abrir({ vista: 'comparar', metrica: 'entrega', titulo: 'Tasa de entrega por campaña' })} />
      <Mini nombre="Correos por corregir" valor={det.hayDatos ? numero(det.corregir) : '—'} color={COLORES.rosa}
        extra={det.hayDatos ? <small>{pct(det.porcentajeCorregir)}</small> : null}
        nota={det.hayDatos ? 'De los enviados con detalle del webhook' : TEXTO_WEBHOOK} enlace="Ver lista"
        onClick={() => abrir({ vista: 'corregir', titulo: 'Correos por corregir' })} />
      <Mini nombre="Sin confirmación" valor={numero(t.sinConfirmacion)} color={COLORES.tenue} nota={sinConf} enlace="Ver destinatarios"
        onClick={verDetalle(abrir, 'sin_confirmacion', 'Sin confirmación')} />
      <Mini nombre="Bajas" valor={numero(t.bajas)} color={COLORES.amarillo} nota="Se dieron de baja de la lista" enlace="Ver destinatarios"
        onClick={verDetalle(abrir, 'baja', 'Bajas')} />
      <Mini nombre="Marcados como spam" valor={numero(t.quejas)} color={COLORES.rosa} nota="Quejas de los destinatarios" enlace="Ver destinatarios"
        onClick={verDetalle(abrir, 'spam', 'Marcados como spam')} />
    </div>
  </>
}

function Recorrido({ t, abrir }) {
  return <Tarjeta titulo="Recorrido del mailing" sub="Cada etapa es clicable · las tasas indican su base"
    acciones={<PildoraEntrega tasa={t.tasas.entrega} semaforo={t.semaforo} />} className="mkv2-compacta">
    <div className="mkv2-embudo">
      <FilaBarra nombre="Enviados" valor={t.enviados} max={t.enviados} color={COLORES.azul} detalle="Base de entrega" onClick={verDetalle(abrir, 'todos', 'Enviados')} />
      <FilaBarra nombre="Entregados" valor={t.entregados} max={t.enviados} color={COLORES.verdeClaro} detalle={`${pct(t.tasas.entrega)} de enviados`} onClick={verDetalle(abrir, 'entregado', 'Entregados')} />
      <FilaBarra nombre="Aperturas" valor={t.aperturas} max={t.enviados} color={COLORES.azulClaro} detalle={`${pct(t.tasas.apertura)} de entregados`} onClick={verDetalle(abrir, 'apertura', 'Aperturas')} />
      <FilaBarra nombre="Clics" valor={t.clics} max={t.enviados} color={COLORES.verde} detalle={`${pct(t.tasas.clic)} de entregados`} onClick={verDetalle(abrir, 'clic', 'Clics')} />
    </div>
    <p className="mkv2-nota">Un correo puede entregarse, abrirse y registrar clic: estos porcentajes no se suman. Aperturas incluye
      las automáticas (Apple MPP {numero(t.aperturasApple)}). Ni una apertura ni un clic prueban actividad humana.</p>
  </Tarjeta>
}

function Incidencias({ t, abrir }) {
  const parte = (nombre, valor, color, estado) => ({ nombre, valor, color, detalle: pct(porcentaje(valor, t.enviados)), onClick: verDetalle(abrir, estado, nombre) })
  const partes = [
    parte('Entregado', t.entregados, COLORES.verdeClaro, 'entregado'),
    parte('Rebote temporal', t.reboteTemporal, COLORES.amarillo, 'rebote_temporal'),
    parte('Rebote permanente', t.rebotePermanente, COLORES.rosa, 'rebote_permanente'),
    parte('Sin confirmación', t.sinConfirmacion, COLORES.tenue, 'sin_confirmacion'),
  ]
  return <Tarjeta titulo="Incidencias de entrega" sub="Resultado final del envío · cada estado es clicable" className="mkv2-compacta"
    acciones={<button type="button" className="fv2-pildora" onClick={verDetalle(abrir, 'rebotes', 'Con rebote')}>Ver rebotes ↗</button>}>
    <DonaPartes partes={partes} total={t.enviados} centro={numero(t.reboteTemporal + t.rebotePermanente)} etiqueta="rebotes"
      onCentro={verDetalle(abrir, 'rebotes', 'Con rebote')} />
    <p className="mkv2-nota">Los 4 estados suman los enviados. Con solo totales de Brevo, «Sin confirmación» = enviados − entregados − rebotes.</p>
  </Tarjeta>
}

function PorCargo({ campanas, filtrar }) {
  const filas = porCargo(campanas)
  const columnas = [
    { id: 'cargo', label: 'Cargo', celda: (f) => <InsigniaCargo cargo={f.cargo} /> },
    { id: 'campanas', label: 'Campañas', num: true, celda: (f) => numero(f.campanas) },
    { id: 'enviados', label: 'Enviados', num: true, celda: (f) => numero(f.enviados) },
    { id: 'entregados', label: 'Entregados', num: true, celda: (f) => numero(f.entregados) },
    { id: 'aperturas', label: 'Aperturas', num: true, celda: (f) => numero(f.aperturas) },
    { id: 'clics', label: 'Clics', num: true, celda: (f) => numero(f.clics) },
    { id: 'rebotes', label: 'Rebotes', num: true, celda: (f) => numero(f.reboteTemporal + f.rebotePermanente) },
    { id: 'entrega', label: '% Entrega', num: true, celda: (f) => <PildoraEntrega tasa={f.tasas.entrega} semaforo={f.semaforo} /> },
  ]
  const porEste = (f) => () => filtrar({ cargo: f.cargo })
  return <Tarjeta titulo="Análisis por cargo destinatario" sub="Clic en un cargo para filtrar todo el dashboard por ese cargo">
    <div className="mkv2-cargos-rejilla">
      <div className="mkv2-embudo">
        {filas.map((f) => <FilaBarra key={f.cargo} nombre={f.cargo === 'Sin clasificar' ? f.cargo : `${f.cargo} · ${NOMBRE_CARGO[f.cargo]}`}
          valor={f.tasas.entrega ?? 0} max={100} color={COLOR_SEMAFORO[f.semaforo] ?? COLORES.tenue} cifra={pct(f.tasas.entrega)}
          detalle={`entrega · ${numero(f.campanas)} campañas`} onClick={porEste(f)} title={`Filtrar por ${f.cargo}`} />)}
      </div>
      <TablaOrdenable columnas={columnas} filas={filas} clave={(f) => f.cargo} vacio="Sin campañas enviadas con los filtros actuales."
        onFila={(f) => filtrar({ cargo: f.cargo })} tituloFila={(f) => `Filtrar por ${f.cargo}`} />
    </div>
  </Tarjeta>
}

function PorCampana({ campanas, resumen, filtrar }) {
  const filas = [...campanas].sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0))
  const enviada = (c) => c.estado === 'enviada'
  const n = (c, k) => (enviada(c) ? numero(c.totales[k]) : <Gris texto="—" />)
  const columnas = [
    { id: 'campana', label: 'Campaña', clase: 'mkv2-celda-larga', celda: (c) => <span className="mkv2-campana-celda"><strong>{c.nombre}</strong><small>{fechaCorta(c.fecha)}{c.esPrueba ? ' · prueba' : ''}{!enviada(c) ? ' · programada' : ''}</small></span> },
    { id: 'asunto', label: 'Asunto', clase: 'mkv2-celda-larga', celda: (c) => c.asunto || '—' },
    { id: 'cargo', label: 'Cargo', celda: (c) => <InsigniaCargo cargo={c.cargo} title={c.cargoManual ? 'Elegido a mano' : c.cargoSugerido ? 'Sugerido por el nombre' : 'Sin clasificar'} /> },
    { id: 'enviados', label: 'Enviados', num: true, celda: (c) => n(c, 'enviados') },
    { id: 'entregados', label: 'Entregados', num: true, celda: (c) => n(c, 'entregados') },
    { id: 'aperturas', label: 'Aperturas', num: true, celda: (c) => n(c, 'aperturas') },
    { id: 'clics', label: 'Clics', num: true, celda: (c) => n(c, 'clics') },
    { id: 'rt', label: 'Rebote temporal', num: true, celda: (c) => n(c, 'reboteTemporal') },
    { id: 'rp', label: 'Rebote permanente', num: true, celda: (c) => n(c, 'rebotePermanente') },
    { id: 'corregir', label: 'Por corregir', num: true, celda: (c) => <Gris texto={pct(porCorregirCampana(c, resumen))} /> },
    { id: 'entrega', label: '% Entrega', num: true, celda: (c) => (enviada(c) ? <PildoraEntrega tasa={c.tasas.entrega} semaforo={c.semaforo} /> : <Gris texto="—" />) },
  ]
  return <Tarjeta titulo="Resultado por campaña" sub="Clic en una campaña para ver solo esa en todo el dashboard · «Por corregir» solo con detalle del webhook">
    <TablaOrdenable columnas={columnas} filas={filas} clave={(c) => c.id} vacio="Sin campañas con los filtros actuales."
      onFila={(c) => filtrar({ campana: String(c.id) })} tituloFila={(c) => `Ver solo «${c.nombre}»`} />
  </Tarjeta>
}

export function ResultadosGenerales({ campanas, resumen, errorResumen, abrir, filtrar }) {
  const t = useMemo(() => sumarTotales(campanas), [campanas])
  const det = useMemo(() => detalleWebhook(campanas, resumen), [campanas, resumen])
  return <>
    <Intro titulo="Resumen de resultados"
      texto="Totales de Brevo de las campañas filtradas: cambian al momento con los filtros. Haz clic en cualquier tarjeta, etapa o estado para ver su detalle."
      etiqueta="Datos de Brevo" />
    {errorResumen
      ? <Aviso titulo="No se pudo leer el detalle del webhook" texto={`${errorResumen} Se muestran solo los totales de Brevo.`} />
      : !det.hayDatos && <Aviso icono="info" titulo="Detalle por correo"
        texto={`Motivo del rebote, CORREGIR / MANTENER y apertura sin automáticas: ${TEXTO_WEBHOOK.toLowerCase()} Las campañas anteriores se muestran solo con los totales de Brevo.`} />}
    <Indicadores t={t} abrir={abrir} />
    <Calidad t={t} det={det} abrir={abrir} />
    <Bloque titulo="Recorrido e incidencias" />
    <div className="mkv2-duo">
      <Recorrido t={t} abrir={abrir} />
      <Incidencias t={t} abrir={abrir} />
    </div>
    <Bloque titulo="Cargos y campañas" />
    <PorCargo campanas={campanas} filtrar={filtrar} />
    <PorCampana campanas={campanas} resumen={resumen} filtrar={filtrar} />
    <Tarjeta titulo="Leads" sub="Bot de WhatsApp → CRM">
      <Aviso icono="info" titulo="Pendiente: acceso al CRM o al bot de leads" texto="Se mostrarán los leads calificados (75 puntos o más) y no calificados de cada campaña." />
    </Tarjeta>
  </>
}
