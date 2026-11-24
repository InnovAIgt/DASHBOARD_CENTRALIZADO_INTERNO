// Canales de marketing · Mailing · Resultados generales (MAILING.md, secciones 6 y 7).
// Dinámico como la referencia: los filtros cambian todo al momento (números y barras se animan hacia el valor nuevo),
// cada tarjeta, etapa, sector y cifra abre la sub-pestaña que corresponde ya enfocada (abrir), y el globo muestra el
// valor exacto. Totales reales de Brevo; lo que necesita detalle por persona viene del webhook. Nunca correos.
import { Fragment, useMemo } from 'react'
import { AlertTriangle, Check, Download, Eye, MousePointerClick, Send, X } from 'lucide-react'
import { columnasCampana, textosCampana } from '../../datos/campana.js'
import { aCsv, descargarCsv } from '../../datos/csv.js'
import { detalleWebhook, diaGuatemala, fechaCorta, fechaHora, NOMBRE_CARGO, numero, pct, porCargo, porCorregirCampana, porcentaje, sumarTotales } from '../../datos/calculos.js'
import {
  Aviso, Bloque, Cifra, COLOR_MAILING, COLOR_SEMAFORO, DonaPartes, FilaBarra, Gris, InsigniaCargo, Kpi, LeyendaSemaforo, MiniBarra,
  Numero, Pct, PildoraEntrega, Tarjeta, TablaOrdenable, TarjetaBajita, TEXTO_WEBHOOK, TituloCampana,
} from './piezas.jsx'

/** Abre «Detalle por correo» enfocado en un estado. */
const verDetalle = (abrir, estado, titulo) => () => abrir({ vista: 'detalle', estado, titulo })

/**
 * Las 6 tarjetas compactas (maqueta de tarjetas), con color por significado. Totales de Brevo.
 * El título va corto en una línea; el nombre completo y la explicación, en el globo del «?».
 */
function Indicadores({ t, abrir }) {
  const kpi = (titulo, completo, icono, valor, tasa, base, ayuda, color, estado) => <Kpi key={titulo} titulo={titulo} icono={icono}
    valor={<Numero n={valor} />} porcentaje={<Pct n={tasa} />} base={base} medidor={tasa ?? null} color={color}
    tip={`${completo}: ${numero(valor)} · ${pct(tasa)} ${base}\n${ayuda}\nClic para ver los destinatarios`} onClick={verDetalle(abrir, estado, completo)} />
  return <div className="mkv2-kpis6">
    {kpi('Enviados', 'Correos enviados', Send, t.enviados, t.enviados ? 100 : null, 'de la selección', `Todos los destinatarios · ${numero(t.campanas)} campañas.`, COLOR_MAILING.enviados, 'todos')}
    {kpi('Entregados', 'Entregados', Check, t.entregados, t.tasas.entrega, 'de los envíos', 'Sin rebote posterior.', COLOR_MAILING.entregados, 'entregado')}
    {kpi('Apertura', 'Apertura registrada', Eye, t.aperturas, t.tasas.apertura, 'de entregados', `Incluye aperturas automáticas (Apple MPP ${numero(t.aperturasApple)}). No confirma lectura humana.`, COLOR_MAILING.apertura, 'apertura')}
    {kpi('Clic', 'Clic registrado', MousePointerClick, t.clics, t.tasas.clic, 'de entregados', 'Origen humano no confirmado.', COLOR_MAILING.clic, 'clic')}
    {kpi('Rebote temporal', 'Rebote temporal', AlertTriangle, t.reboteTemporal, t.tasas.reboteTemporal, 'de los envíos', 'Problema temporal de entrega (buzón lleno, servidor caído…).', COLOR_MAILING.temporal, 'rebote_temporal')}
    {kpi('Rebote duro', 'Rebote duro', X, t.rebotePermanente, t.tasas.rebotePermanente, 'de los envíos', 'Rechazo permanente de la dirección.', COLOR_MAILING.duro, 'rebote_permanente')}
  </div>
}

/** Fila de calidad en tarjetas bajitas: número + título; la explicación va en el «?». */
function Calidad({ t, det, cuentas, abrir }) {
  const sinConf = t.sinConfirmacionAjustado
    ? 'Con los totales de Brevo no se puede calcular exacto (la resta dio negativo y se muestra 0).'
    : 'Enviados sin entrega ni rebote informados.'
  const hayCorregir = cuentas?.corregir != null && det.hayDatos
  return <>
    <Bloque titulo="Lectura, entregas, rebotes y calidad de contactos" />
    <div className="mkv2-bajitas mkv2-bajitas6">
      <TarjetaBajita valor={<Pct n={t.tasaLectura} />} titulo="Lectura estimada" sub={`${numero(t.lecturaEstimada)} personas`} color={COLOR_MAILING.apertura}
        tip={`Lectura estimada: ${numero(t.lecturaEstimada)} de ${numero(t.entregados)} entregados (${pct(t.tasaLectura)})
Aperturas sin las automáticas de Apple: personas que abrieron según Brevo (${numero(t.aperturas)}) menos aperturas Apple MPP (${numero(t.aperturasApple)}), campaña por campaña.
Es estimada: Brevo da Apple MPP como total, no por persona. No confirma lectura humana.`} />
      <TarjetaBajita valor={<Pct n={t.tasas.entrega} />} titulo="Tasa de entrega" sub={t.semaforo ? `semáforo: ${t.semaforo}` : undefined}
        color={COLOR_SEMAFORO[t.semaforo] ?? COLOR_MAILING.gris}
        tip={`Tasa de entrega: ${numero(t.entregados)} de ${numero(t.enviados)} enviados (${pct(t.tasas.entrega)})\nSemáforo: 100 % verde · 90 a 99,9 % amarillo · menos de 90 % rojo.\nClic para comparar campañas.`}
        onClick={() => abrir({ vista: 'comparar', metrica: 'entrega', titulo: 'Tasa de entrega por campaña' })} />
      <TarjetaBajita valor={hayCorregir ? <Numero n={cuentas.corregir} /> : '—'} titulo="Por corregir" sub={hayCorregir ? `${numero(cuentas.casosCorregir)} casos` : undefined} color={COLOR_MAILING.duro}
        tip={hayCorregir ? `Direcciones únicas a corregir (${numero(cuentas.casosCorregir)} casos correo + campaña). Revisar antes del próximo envío.\nClic para ver la lista.` : TEXTO_WEBHOOK}
        onClick={() => abrir({ vista: 'corregir', titulo: 'Correos por corregir' })} />
      <TarjetaBajita valor={<Numero n={t.sinConfirmacion} />} titulo="Sin confirmación" color={COLOR_MAILING.gris}
        tip={`Sin confirmación: ${numero(t.sinConfirmacion)}\n${sinConf}`} onClick={verDetalle(abrir, 'sin_confirmacion', 'Sin confirmación')} />
      <TarjetaBajita valor={<Numero n={t.bajas} />} titulo="Bajas" color={COLOR_MAILING.temporal}
        tip={`Bajas: ${numero(t.bajas)}\nSe dieron de baja de la lista.`} onClick={verDetalle(abrir, 'baja', 'Bajas')} />
      <TarjetaBajita valor={<Numero n={t.quejas} />} titulo="Spam" color={COLOR_MAILING.duro}
        tip={`Marcados como spam: ${numero(t.quejas)}\nQuejas de los destinatarios.`} onClick={verDetalle(abrir, 'spam', 'Marcados como spam')} />
    </div>
  </>
}


/** Recorrido: barras gruesas de color que crecen, y entre etapas el % que pasa de una a la siguiente. */
function Recorrido({ t, abrir }) {
  const etapas = [
    { nombre: 'Enviados', valor: t.enviados, color: COLOR_MAILING.enviados, estado: 'todos' },
    { nombre: 'Entregados', valor: t.entregados, color: COLOR_MAILING.entregados, estado: 'entregado', paso: porcentaje(t.entregados, t.enviados), de: 'de los enviados' },
    { nombre: 'Apertura registrada', valor: t.aperturas, color: COLOR_MAILING.apertura, estado: 'apertura', paso: porcentaje(t.aperturas, t.entregados), de: 'de los entregados' },
    { nombre: 'Clic registrado', valor: t.clics, color: COLOR_MAILING.clic, estado: 'clic', paso: porcentaje(t.clics, t.aperturas), de: 'de las aperturas' },
  ]
  return <Tarjeta titulo="Recorrido del mailing" sub="Cada etapa es clicable · entre etapas, el % que pasa a la siguiente"
    acciones={<PildoraEntrega tasa={t.tasas.entrega} semaforo={t.semaforo} />} className="mkv2-compacta">
    <div className="mkv2-embudo mkv2-embudo-grueso">
      {etapas.map((e, i) => <Fragment key={e.nombre}>
        {i > 0 && <div className="mkv2-paso" data-tip={`${pct(e.paso)} ${e.de} llega a «${e.nombre}» (${numero(e.valor)} de ${numero(etapas[i - 1].valor)})`}>
          <span>↓ <Pct n={e.paso} /></span> {e.de}
        </div>}
        <FilaBarra nombre={e.nombre} valor={e.valor} max={t.enviados} color={e.color}
          detalle={`${pct(porcentaje(e.valor, t.enviados))} de enviados`}
          tip={`${e.nombre}: ${numero(e.valor)} · ${pct(porcentaje(e.valor, t.enviados))} de ${numero(t.enviados)} enviados`}
          onClick={verDetalle(abrir, e.estado, e.nombre)} />
      </Fragment>)}
    </div>
    <p className="mkv2-nota">Un correo puede entregarse, abrirse y registrar clic: estos porcentajes no se suman. Apertura registrada
      incluye las automáticas (Apple MPP {numero(t.aperturasApple)}). Ni una apertura ni un clic prueban actividad humana.</p>
  </Tarjeta>
}

function Incidencias({ t, abrir }) {
  const parte = (nombre, valor, color, estado) => ({ nombre, valor, color, detalle: pct(porcentaje(valor, t.enviados)), onClick: verDetalle(abrir, estado, nombre) })
  const partes = [
    parte('Entregado', t.entregados, COLOR_MAILING.entregados, 'entregado'),
    parte('Rebote temporal', t.reboteTemporal, COLOR_MAILING.temporal, 'rebote_temporal'),
    parte('Rebote duro', t.rebotePermanente, COLOR_MAILING.duro, 'rebote_permanente'),
    parte('Sin confirmación', t.sinConfirmacion, COLOR_MAILING.gris, 'sin_confirmacion'),
  ]
  return <Tarjeta titulo="Incidencias de entrega" sub="Resultado final del envío · cada sector y cada cajita es clicable" className="mkv2-compacta"
    acciones={<button type="button" className="fv2-pildora" onClick={verDetalle(abrir, 'rebotes', 'Con rebote')}>Ver rebotes ↗</button>}>
    <DonaPartes partes={partes} total={t.enviados} centro={t.reboteTemporal + t.rebotePermanente} etiqueta="rebotes"
      onCentro={verDetalle(abrir, 'rebotes', 'Con rebote')} />
    <p className="mkv2-nota">Los 4 estados suman los enviados. Con solo totales de Brevo, «Sin confirmación» = enviados − entregados − rebotes.</p>
  </Tarjeta>
}

/** Columnas de cifras que abren «Detalle por correo» (después de filtrar por el cargo o la campaña de la fila). */
const CIFRAS = [
  { id: 'enviados', label: 'Enviados', estado: 'todos' },
  { id: 'entregados', label: 'Entregados', estado: 'entregado' },
  { id: 'aperturas', label: 'Aperturas', estado: 'apertura' },
  { id: 'clics', label: 'Clics', estado: 'clic' },
  { id: 'reboteTemporal', label: 'Rebote temporal', estado: 'rebote_temporal' },
  { id: 'rebotePermanente', label: 'Rebote duro', estado: 'rebote_permanente' },
]

/**
 * Análisis por cargo como la referencia (renderRolesInGeneral): leyenda arriba, una barra por cargo con solo el % a
 * la derecha (la barra siempre tiene espacio) y la tabla de 8 columnas al lado; cifras que abren sus destinatarios.
 */
function PorCargo({ campanas, abrir, filtrar }) {
  const filas = porCargo(campanas)
  const nombre = (f) => NOMBRE_CARGO[f.cargo] ?? f.cargo
  const abrirCifra = (f, estado, label) => () => { filtrar({ cargo: f.cargo }); abrir({ vista: 'detalle', estado, titulo: `${label} · ${nombre(f)}` }) }
  const cifra = (f, n, estado, label) => <Cifra n={n} onClick={abrirCifra(f, estado, label)} tip={`${label} · ${nombre(f)}: ${numero(n)} — clic para ver los destinatarios`} />
  const columnas = [
    { id: 'cargo', label: 'Cargo', celda: (f) => <strong className="mkv2-texto-fuerte">{nombre(f)}</strong> },
    { id: 'campanas', label: 'Campañas', num: true, celda: (f) => numero(f.campanas) },
    { id: 'enviados', label: 'Enviados', num: true, celda: (f) => cifra(f, f.enviados, 'todos', 'Enviados') },
    { id: 'entregados', label: 'Entregados', num: true, celda: (f) => cifra(f, f.entregados, 'entregado', 'Entregados') },
    { id: 'aperturas', label: 'Aperturas', num: true, celda: (f) => cifra(f, f.aperturas, 'apertura', 'Aperturas') },
    { id: 'clics', label: 'Clics', num: true, celda: (f) => cifra(f, f.clics, 'clic', 'Clics') },
    { id: 'rebotes', label: 'Rebotes', num: true, celda: (f) => cifra(f, f.reboteTemporal + f.rebotePermanente, 'rebotes', 'Rebotes') },
    { id: 'entrega', label: '% Entrega', num: true, celda: (f) => <PildoraEntrega tasa={f.tasas.entrega} semaforo={f.semaforo} /> },
  ]
  return <Tarjeta titulo="Análisis por cargo destinatario" sub="Comparación lista para Gerencia General, Financiera y Operaciones">
    <div className="mkv2-cargos-rejilla">
      <div>
        <LeyendaSemaforo />
        <div className="mkv2-embudo mkv2-embudo-rol">
          {filas.map((f) => <FilaBarra key={f.cargo} nombre={nombre(f)} valor={f.campanas ? f.tasas.entrega ?? 0 : 0} max={100} meta={90}
            color={COLOR_SEMAFORO[f.semaforo] ?? COLOR_MAILING.gris} cifra={f.campanas ? <Pct n={f.tasas.entrega} /> : <span className="fv2-tenue">Sin datos</span>}
            tip={f.campanas ? `${nombre(f)}: ${pct(f.tasas.entrega)} de entrega (${numero(f.entregados)} de ${numero(f.enviados)}) · ${numero(f.campanas)} campañas · meta 90 % — clic para filtrar` : `${nombre(f)}: sin campañas en la selección`}
            onClick={() => filtrar({ cargo: f.cargo })} />)}
        </div>
      </div>
      <TablaOrdenable columnas={columnas} filas={filas.filter((f) => f.campanas)} clave={(f) => f.cargo} vacio="Sin campañas enviadas con los filtros actuales."
        onFila={(f) => filtrar({ cargo: f.cargo })} tituloFila={(f) => `Filtrar por ${nombre(f)}`} />
    </div>
    <p className="mkv2-nota">«Sin campañas cargadas» no equivale a un resultado de cero. Puedes hacer clic en las cifras disponibles para ver los correos.</p>
  </Tarjeta>
}

function PorCampana({ campanas, resumen, abrir, filtrar }) {
  const filas = [...campanas].sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0))
  const enviada = (c) => c.estado === 'enviada'
  const abrirCifra = (c, x) => () => { filtrar({ campana: String(c.id) }); abrir({ vista: 'detalle', estado: x.estado, titulo: `${x.label} · ${textosCampana(c).corto}` }) }
  const cifra = (c, x) => (enviada(c)
    ? <Cifra n={c.totales[x.id]} onClick={abrirCifra(c, x)} tip={`${x.label} · ${textosCampana(c).unaLinea}: ${numero(c.totales[x.id])} — clic para ver los destinatarios`} />
    : <Gris texto="—" />)
  const columnas = [
    { id: 'campana', label: 'Campaña', clase: 'mkv2-celda-campana', celda: (c) => <span className="mkv2-campana-con-marcas">
      <TituloCampana campana={c} />
      {(c.esPrueba || !enviada(c)) && <small className="mkv2-marca-campana">{c.esPrueba ? 'prueba' : ''}{c.esPrueba && !enviada(c) ? ' · ' : ''}{!enviada(c) ? 'programada' : ''}</small>}
    </span> },
    { id: 'cargo', label: 'Cargo', celda: (c) => <InsigniaCargo cargo={c.cargo} title={c.cargoManual ? 'Elegido a mano' : c.cargoSugerido ? 'Sugerido por el nombre' : 'Sin clasificar'} /> },
    ...CIFRAS.filter((x) => x.id !== 'aperturas').slice(0, 2).map((x) => ({ id: x.id, label: x.label, num: true, celda: (c) => cifra(c, x) })),
    { id: 'aperturas', label: 'Aperturas', num: true, celda: (c) => (enviada(c)
      ? <span className="mkv2-celda-apertura">{cifra(c, CIFRAS[2])}<MiniBarra tasa={c.tasas.apertura} color={COLOR_MAILING.apertura} tip={`Apertura: ${pct(c.tasas.apertura)} de los entregados`} /></span>
      : <Gris texto="—" />) },
    ...CIFRAS.slice(3).map((x) => ({ id: x.id, label: x.label, num: true, celda: (c) => cifra(c, x) })),
    { id: 'corregir', label: 'Por corregir', num: true, celda: (c) => <Gris texto={pct(porCorregirCampana(c, resumen))} /> },
    { id: 'entrega', label: '% Entrega', num: true, celda: (c) => (enviada(c) ? <PildoraEntrega tasa={c.tasas.entrega} semaforo={c.semaforo} /> : <Gris texto="—" />) },
  ]
  const csv = () => descargarCsv(`resumen-mailing_${diaGuatemala(new Date().toISOString())}`, aCsv([
    ...columnasCampana((c) => [c]),
    { label: 'Fecha de envío', valor: (c) => fechaCorta(c.fecha) },
    { label: 'Cargo', valor: (c) => c.cargo },
    { label: 'Estado', valor: (c) => (enviada(c) ? 'enviada' : 'programada') },
    ...CIFRAS.map((x) => ({ label: x.label, valor: (c) => (enviada(c) ? c.totales[x.id] : null) })),
    { label: '% Apertura (de entregados)', valor: (c) => (enviada(c) ? c.tasas.apertura : null) },
    { label: '% Clic (de entregados)', valor: (c) => (enviada(c) ? c.tasas.clic : null) },
    { label: '% Por corregir', valor: (c) => porCorregirCampana(c, resumen) },
    { label: '% Entrega', valor: (c) => (enviada(c) ? c.tasas.entrega : null) },
    { label: 'Semáforo', valor: (c) => (enviada(c) ? c.semaforo : null) },
  ], filas))
  return <Tarjeta titulo="Resultado por campaña" sub="Clic en una campaña para ver solo esa en todo el dashboard · clic en una cifra para ver sus destinatarios · «Por corregir» solo con detalle del webhook"
    acciones={<button type="button" className="fv2-pildora" onClick={csv} disabled={!filas.length}><Download size={13} aria-hidden="true" />Descargar resumen CSV</button>}>
    <TablaOrdenable columnas={columnas} filas={filas} clave={(c) => c.id} vacio="Sin campañas con los filtros actuales."
      onFila={(c) => filtrar({ campana: String(c.id) })} tituloFila={(c) => `Ver solo «${textosCampana(c).corto}»`} />
  </Tarjeta>
}

/**
 * Campañas programadas en Brevo (estado «en cola», solo lectura): asunto, nombre, cargo y cuándo salen.
 * Todavía no tienen cifras. Clic en una para filtrar todo el dashboard por esa campaña.
 */
function Programadas({ campanas, filtrar }) {
  const lista = useMemo(() => campanas.filter((c) => c.estado === 'programada')
    .sort((a, b) => String(a.fecha ?? '').localeCompare(String(b.fecha ?? ''))), [campanas])
  const columnas = [
    { id: 'campana', label: 'Campaña', clase: 'mkv2-celda-campana', celda: (c) => <TituloCampana campana={c} fecha={false} /> },
    { id: 'cargo', label: 'Cargo', celda: (c) => <InsigniaCargo cargo={c.cargo} /> },
    { id: 'fecha', label: 'Programada para', celda: (c) => <span className="fv2-sin-salto">{c.fecha ? fechaHora(c.fecha) : 'Sin fecha'}</span> },
  ]
  return <Tarjeta titulo={`Programadas en Brevo · ${numero(lista.length)}`} sub="Campañas en cola de envío · se leen de Brevo (solo lectura) cada 10 minutos · clic para ver solo esa campaña">
    {lista.length
      ? <TablaOrdenable columnas={columnas} filas={lista} clave={(c) => c.id} onFila={(c) => filtrar({ campana: String(c.id) })} tituloFila={() => 'Ver solo esta campaña en todo el dashboard'} vacio="" />
      : <Aviso icono="info" titulo="No hay campañas programadas" texto="Con los filtros actuales no hay campañas en cola en Brevo. Cuando Marketing programe una, aparece aquí con su fecha de envío." />}
  </Tarjeta>
}

export function ResultadosGenerales({ campanas, resumen, errorResumen, cuentas, abrir, filtrar, reintentar }) {
  const t = useMemo(() => sumarTotales(campanas), [campanas])
  const det = useMemo(() => detalleWebhook(campanas, resumen), [campanas, resumen])
  return <>
    {errorResumen
      ? <Aviso titulo="No se pudo leer el detalle del webhook" texto={`${errorResumen} Se muestran solo los totales de Brevo.`} onReintentar={reintentar} />
      : !det.hayDatos && <Aviso icono="info" titulo="Detalle por correo"
        texto={`Motivo del rebote, CORREGIR / MANTENER y apertura sin automáticas: ${TEXTO_WEBHOOK.toLowerCase()} Las campañas anteriores se muestran solo con los totales de Brevo.`} />}
    <Bloque titulo="Resultados" />
    <Indicadores t={t} abrir={abrir} />
    <Calidad t={t} det={det} cuentas={cuentas} abrir={abrir} />
    <Bloque titulo="Recorrido e incidencias" />
    <div className="mkv2-duo">
      <Recorrido t={t} abrir={abrir} />
      <Incidencias t={t} abrir={abrir} />
    </div>
    <Bloque titulo="Cargos y campañas" />
    <PorCargo campanas={campanas} abrir={abrir} filtrar={filtrar} />
    <PorCampana campanas={campanas} resumen={resumen} abrir={abrir} filtrar={filtrar} />
    <Bloque titulo="Campañas programadas" />
    <Programadas campanas={campanas} filtrar={filtrar} />
    <Tarjeta titulo="Leads" sub="Bot de WhatsApp → CRM">
      <Aviso icono="info" titulo="Pendiente: acceso al CRM o al bot de leads" texto="Se mostrarán los leads calificados (75 puntos o más) y no calificados de cada campaña." />
    </Tarjeta>
  </>
}
