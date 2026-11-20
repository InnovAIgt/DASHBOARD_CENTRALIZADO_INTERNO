/**
 * Reglas de negocio del reporte de SLA.
 *
 * Universo: STR (solicitudes de traslado) y facturas desde octubre de 2026 cuyo
 * tipoFactura es "Pendiente de entrega", sin importar su estatus. Ambas se
 * evaluan con el mismo SLA, medido en dias habiles desde la fecha del documento.
 */

export const FECHA_INICIO_REPORTE = '2026-10-01';

/** Cortes de SLA, en dias habiles desde la fecha del documento. */
export const SLA_MAX_EN_TIEMPO = 1;   // hasta 1 dia habil
export const SLA_MAX_POR_VENCER = 3;  // 2 a 3 dias habiles

export const ESTADO = {
  EN_TIEMPO: 'En tiempo',
  POR_VENCER: 'Por vencer',
  VENCIDO: 'Vencido',
};

export const TIPO = {
  STR: 'STR',
  RESERVA: 'Reserva',
  EXCLUIDA: 'Excluida',
};

const MS_POR_DIA = 86400000;

const normalizar = (v) => String(v ?? '').trim().toLowerCase();
const sinAcentos = (v) => normalizar(v).normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Acepta "2026-07-31T00:00:00" y "13/10/2026 12:00:00 a.m." -> "YYYY-MM-DD". */
export function soloFecha(valor) {
  const str = String(valor ?? '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const latino = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(str);
  if (latino) return `${latino[3]}-${latino[2]}-${latino[1]}`;

  return null;
}

/** Fecha de hoy en la zona horaria del pais, como "YYYY-MM-DD". */
export function hoyEnPais(zonaHoraria) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** Dias habiles (lunes a viernes) entre dos fechas "YYYY-MM-DD", sin contar la inicial. */
export function diasHabilesEntre(desde, hasta) {
  const inicio = Date.parse(`${desde}T00:00:00Z`);
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin < inicio) return 0;

  let dias = 0;
  for (let t = inicio + MS_POR_DIA; t <= fin; t += MS_POR_DIA) {
    const diaSemana = new Date(t).getUTCDay();
    if (diaSemana >= 1 && diaSemana <= 5) dias++;
  }
  return dias;
}

export function clasificarSla(diasHabiles) {
  if (diasHabiles <= SLA_MAX_EN_TIEMPO) return ESTADO.EN_TIEMPO;
  if (diasHabiles <= SLA_MAX_POR_VENCER) return ESTADO.POR_VENCER;
  return ESTADO.VENCIDO;
}

/** Solo las facturas pendientes de entrega entran al reporte de reservas. */
export function clasificarTipoFactura(tipoFactura) {
  const t = sinAcentos(tipoFactura);
  if (/\bstr\b/.test(t) || t.includes('traslado') || t.includes('solicitud')) return TIPO.STR;
  if (t === 'pendiente de entrega') return TIPO.RESERVA;
  return TIPO.EXCLUIDA;
}

export function etiquetaPeriodo(periodo) {
  const [year, month] = periodo.fechaInicio.split('-').map(Number);
  const nombreMes = new Intl.DateTimeFormat('es', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
  return `desde ${nombreMes} de ${year}`;
}

const estaEnRango = (fecha, periodo, hoy) =>
  fecha !== null && fecha >= periodo.fechaInicio && fecha <= hoy;

/**
 * Arma el universo evaluable: facturas pendientes de entrega y STR desde la
 * fecha inicial configurada hasta hoy, acumulando documentos de meses previos.
 * Devuelve los documentos ordenados del mas vencido al mas reciente.
 */
export function construirUniverso({
  facturas, solicitudes, periodo, hoy,
  excluirDocumentos = [], excluirClientes = [],
}) {
  const descartes = { excluidas: 0, tipoFactura: 0, fueraDePeriodo: 0 };
  const documentoExcluido = (f) => excluirDocumentos.includes(String(f.NumeroFactura))
    || excluirClientes.includes(String(f.CodigoCliente));

  // El tipo de factura define si sigue pendiente; Estatus puede estar desfasado.
  const reservas = [];
  for (const f of facturas) {
    const fecha = soloFecha(f.FechaEmision);
    if (!estaEnRango(fecha, periodo, hoy)) { descartes.fueraDePeriodo++; continue; }
    if (documentoExcluido(f)) { descartes.excluidas++; continue; }
    if (clasificarTipoFactura(f.tipoFactura) !== TIPO.RESERVA) {
      descartes.tipoFactura++;
      continue;
    }

    reservas.push(desdeFactura(f, fecha, hoy));
  }

  const strs = agruparSolicitudes(solicitudes, periodo, hoy, descartes);

  const documentos = [...reservas, ...strs].sort((a, b) => b.diasActivos - a.diasActivos
    || String(a.documento).localeCompare(String(b.documento)));

  return { documentos, descartes };
}

function desdeFactura(f, fecha, hoy) {
  const articulos = Array.isArray(f.Articulos) ? f.Articulos : [];
  const diasActivos = diasHabilesEntre(fecha, hoy);

  return {
    tipo: TIPO.RESERVA,
    documento: String(f.NumeroFactura ?? f.DocEntry ?? ''),
    docEntry: String(f.DocEntry ?? ''),
    codigoCliente: f.CodigoCliente ?? '',
    cliente: f.NombreCliente || 'CF - Consumidor Final',
    fecha,
    estatus: f.Estatus ?? '',
    bodegas: '',
    articulos: articulos.map((a) => ({
      codigo: a.CodigoArticulo, descripcion: a.Descripcion,
      cantidad: Number(a.Cantidad ?? 0), total: Number(a.TotalLinea ?? 0),
    })),
    unidades: articulos.reduce((s, a) => s + Number(a.Cantidad ?? 0), 0),
    total: articulos.reduce((s, a) => s + Number(a.TotalLinea ?? 0), 0),
    diasActivos,
    estado: clasificarSla(diasActivos),
  };
}

/** Las STR vienen una fila por articulo: se agrupan por numero de documento. */
function agruparSolicitudes(solicitudes, periodo, hoy, descartes) {
  const porDocumento = new Map();

  for (const s of solicitudes) {
    const fecha = soloFecha(s.fecha);
    if (!estaEnRango(fecha, periodo, hoy)) { descartes.fueraDePeriodo++; continue; }

    const clave = String(s.documento ?? '');
    if (!porDocumento.has(clave)) {
      const diasActivos = diasHabilesEntre(fecha, hoy);
      porDocumento.set(clave, {
        tipo: TIPO.STR,
        documento: clave,
        docEntry: clave,
        codigoCliente: s.cliente ?? '',
        cliente: s.nombre || 'CF - Consumidor Final',
        fecha,
        estatus: 'Abierta',
        bodegas: `${s.bodegaorigen ?? ''} -> ${s.bodegadestino ?? ''}`,
        tipoSolicitud: s.tiposolicitud || '-',
        articulos: [],
        unidades: 0,
        total: 0,
        diasActivos,
        estado: clasificarSla(diasActivos),
      });
    }

    const doc = porDocumento.get(clave);
    const cantidad = Number(s.cantidad ?? 0);
    doc.articulos.push({ codigo: s.modelo, descripcion: s.descripcion, cantidad, total: 0 });
    doc.unidades += cantidad;
  }

  return [...porDocumento.values()];
}

/** KPI de SLA: (en tiempo + por vencer) / total evaluado * 100. */
export function calcularSla(documentos) {
  const cuenta = (estado) => documentos.filter((d) => d.estado === estado).length;

  const total = documentos.length;
  const enTiempo = cuenta(ESTADO.EN_TIEMPO);
  const porVencer = cuenta(ESTADO.POR_VENCER);
  const vencidas = cuenta(ESTADO.VENCIDO);
  const dentroDeSla = enTiempo + porVencer;

  return {
    total,
    enTiempo,
    porVencer,
    vencidas,
    dentroDeSla,
    str: documentos.filter((d) => d.tipo === TIPO.STR).length,
    reservas: documentos.filter((d) => d.tipo === TIPO.RESERVA).length,
    monto: documentos.reduce((s, d) => s + d.total, 0),
    unidades: documentos.reduce((s, d) => s + d.unidades, 0),
    porcentaje: total ? (dentroDeSla / total) * 100 : 100,
  };
}
