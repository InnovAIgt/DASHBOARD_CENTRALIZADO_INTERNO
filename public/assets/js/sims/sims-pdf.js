/* ==========================================================================
   SIMs · Botón "PDF" (a la par de Filtros)
   --------------------------------------------------------------------------
   Igual que en Ingresos: al hacer click abre una ventana de SELECCIÓN
   MÚLTIPLE, marcas los módulos que quieres imprimir y solo esos viajan al
   documento. Genera el reporte con jsPDF + jspdf-autotable (bajo demanda):

     · Portada con logo, alcance y fecha de los datos
     · Chips de alcance (operaciones · filtros SIM · filtros reclamos · datos)
     · Franja con los módulos incluidos en el documento
     · SIM Cards: KPIs, estados, operador, país, clientes, evolución, optimización
     · Reclamos M2M: KPIs/SLA, clientes, seguimiento de casos, responsables

   Los módulos de SIM Cards respetan los filtros de la barra de arriba
   (Operaciones, Operador, Bolsa, Cliente); los de Reclamos respetan los
   filtros de la pestaña Reclamos M2M (Operaciones, Período, Etapa, Responsable).
   Usa las funciones y el estado de sims.js (se carga después de él).
   ========================================================================== */
(function () {
  'use strict';

  const BTN = document.getElementById('simsPdfBtn');
  if (!BTN) return;

  const LOGO_URL = '../../assets/img/logo-intelfon.png';
  const JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
  const AUTOTABLE_URL = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';

  // Más filas vuelven pesado el PDF: el detalle completo está en el Excel del informe.
  const OPT_MAX_ROWS = 2500;

  // ─────────────────────────────────────── catálogo de módulos imprimibles
  // El orden aquí define el orden de las secciones en el PDF y su numeración.
  // group: 'sim' usa los filtros de arriba · 'rec' los de la pestaña Reclamos.
  const MODULES = [
    {
      id: 'kpi', group: 'sim',
      title: 'Resumen ejecutivo · SIM Cards',
      hint: 'SIM consolidadas, stock, mantener, revisión, reemplazos y cambios.',
      icon: '<path d="M3 20h18" /><rect x="5" y="10.5" width="3.6" height="6.5" rx="1" />' +
        '<rect x="10.2" y="6" width="3.6" height="11" rx="1" /><rect x="15.4" y="13" width="3.6" height="4" rx="1" />'
    },
    {
      id: 'estados', group: 'sim',
      title: 'Distribución por estado',
      hint: 'SIM por estado y cambios sugeridos por acción y bolsa.',
      icon: '<path d="M12 3v9l7.5 4.5" /><circle cx="12" cy="12" r="9" />'
    },
    {
      id: 'operadores', group: 'sim',
      title: 'Por operador',
      hint: 'SIM consolidadas, participación, cambios, bajar y subir por operador.',
      icon: '<path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 16a5 5 0 0 1 7 0" /><circle cx="12" cy="19.5" r="1" />'
    },
    {
      id: 'paises', group: 'sim',
      title: 'Cambios por país',
      hint: 'SIM consolidadas y cambios sugeridos en Guatemala y El Salvador.',
      icon: '<circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />'
    },
    {
      id: 'clientes', group: 'sim',
      title: 'Clientes con más cambios',
      hint: 'Ranking de clientes con más SIM en cambios.',
      icon: '<circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14a6.5 6.5 0 0 1 3.5 6" />'
    },
    {
      id: 'evolucion', group: 'sim',
      title: 'Evolución de SIM en cambios',
      hint: 'Fotografía diaria: total de cambios, en bolsa y fuera de bolsa.',
      icon: '<path d="M3 17.5 8.5 12l3.5 3.5L21 6.5" /><path d="M15 6.5h6v6" />'
    },
    {
      id: 'optimizacion', group: 'sim',
      title: 'Optimización · bajar y subir plan',
      hint: 'Detalle de las SIM candidatas a bajar y a subir de plan.',
      icon: '<path d="M7 4v16" /><path d="m3 16 4 4 4-4" /><path d="M17 20V4" /><path d="m13 8 4-4 4 4" />'
    },
    {
      id: 'reclamos', group: 'rec',
      title: 'Reclamos M2M · indicadores',
      hint: 'Candidatas M2M → 1 GB, SLA de reclamos e indicadores post-cierre.',
      icon: '<path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="m9 14 2 2 4-4" />'
    },
    {
      id: 'recClientes', group: 'rec',
      title: 'Reclamos por cliente',
      hint: 'SIM candidatas, excluidas y pendientes de ingreso por cliente.',
      icon: '<rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9.5h18" /><path d="M9.5 9.5V20" />'
    },
    {
      id: 'recCasos', group: 'rec',
      title: 'Seguimiento de reclamos',
      hint: 'Reclamos creados con estado SAC, responsable, SLA y resultados.',
      icon: '<rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h10M7 17h6" />'
    },
    {
      id: 'responsables', group: 'rec',
      title: 'Carga por responsable',
      hint: 'Reclamos abiertos, escalados y finalizados por agente.',
      icon: '<circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />'
    }
  ];

  const MODULE_IDS = MODULES.map(module => module.id);

  // A4 horizontal (mm) · márgenes
  const PAGE = { w: 297, h: 210, ml: 12, mr: 12, mt: 24, mb: 18 };
  const X = PAGE.ml;
  const W = PAGE.w - PAGE.ml - PAGE.mr;   // 273 mm de ancho útil

  const C = {
    navy: [21, 28, 46],
    navy2: [28, 36, 56],
    red: [255, 23, 68],
    text: [23, 32, 51],
    muted: [107, 122, 148],
    line: [216, 222, 232],
    rowAlt: [247, 249, 252],
    chip: [241, 244, 249],
    white: [255, 255, 255],
    green: [8, 116, 67],
    rose: [180, 35, 60],
    cyan: [0, 132, 168],
    amber: [166, 104, 10],
    blue: [47, 95, 216],
    headFoot: [233, 238, 246],
    softText: [169, 185, 207]
  };

  const STATUS_COLOR = {
    CAMBIOS: C.rose, MANTENER: C.cyan, 'REVISION-MANTENER': C.amber, STOCK: C.blue, REEMPLAZOS: C.rose
  };

  // ────────────────────────────────────────────── utilidades de texto / cifras

  // Helvetica (fuente base del PDF) solo cubre Latin-1: se normaliza el texto.
  const txt = value => String(value == null ? '' : value)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/→/g, '->')
    .replace(/↓/g, 'Bajar')
    .replace(/↑/g, 'Subir')
    .replace(/[•·]/g, '·')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\u0000-ÿ]/g, '')
    .trim();

  const n = value => { const v = Number(value); return Number.isFinite(v) ? v : 0; };
  const num0 = value => Math.round(n(value)).toLocaleString('en-US');
  const pctOf = (value, total) => (n(total) > 0 ? `${(n(value) / n(total) * 100).toFixed(1)}%` : '—');
  const pctTxt = value => (value == null ? 'N/A' : `${(Math.round(n(value) * 10) / 10).toFixed(1)}%`);
  const mbTxt = value => { const v = n(value); if (!v) return '—'; return v >= 1024 ? `${num0(v / 1024)} GB` : `${num0(v)} MB`; };

  // ───────────────────────────────────────────────── alcance (filtros activos)

  const PAIS_LABEL = { '': 'Todos (GT · SV)', GT: 'Guatemala', SV: 'El Salvador' };
  const paisLabel = value => PAIS_LABEL[value || ''] || String(value);

  // "Operador: Claro · Bolsa: En bolsa · Cliente: 3 clientes"
  function simFilterText() {
    const f = msoState.filterOptions || {};
    const parts = [];
    const ops = listOf(msoState.operador);
    if (ops.length) parts.push(`Operador: ${ops.length <= 2 ? ops.join(', ') : `${ops.length} operadores`}`);
    const bolsas = listOf(msoState.bolsa);
    if (bolsas.length) parts.push(`Bolsa: ${bolsas.map(b => BOLSA_LABEL[b] || b).join(', ')}`);
    const clis = listOf(msoState.cliente);
    if (clis.length) {
      const name = v => { const c = (f.clientes || []).find(x => clientVal(x) === v); return c ? (clientName(c) || v) : v; };
      parts.push(`Cliente: ${clis.length <= 2 ? clis.map(name).join(', ') : `${clis.length} clientes`}`);
    }
    return parts.join(' · ') || 'Sin filtros';
  }

  function recFilterText() {
    const parts = [`Operaciones: ${paisLabel(msoState.recPais)}`];
    if (msoState.recPeriodo) parts.push(`Período: ${periodoLabel(msoState.recPeriodo)}`);
    if (msoState.recEtapa) parts.push(`Etapa: ${etapaLabel(msoState.recEtapa)}`);
    if (msoState.recResponsable) {
      const r = ((msoState.recFilterOptions || {}).responsables || []).find(x => String(x.id) === msoState.recResponsable);
      parts.push(`Responsable: ${r ? (r.nombre || r.id) : msoState.recResponsable}`);
    }
    return parts.join(' · ');
  }

  // Chips de la ventana de exportación: resumen (value) y detalle (detail).
  // Solo se muestran los grupos de los módulos marcados, igual que en el PDF.
  function modalFilterChips(mods) {
    const groupOf = id => (MODULES.find(m => m.id === id) || {}).group;
    const hasSim = mods.some(id => groupOf(id) === 'sim');
    const hasRec = mods.some(id => groupOf(id) === 'rec');
    const chips = [];
    const multi = (label, values, plural) => ({
      label,
      value: values.length === 0 ? 'Todos' : values.length === 1 ? values[0] : `${values.length} ${plural}`,
      detail: values.length > 1 ? values.join(', ') : ''
    });

    if (hasSim) {
      const f = msoState.filterOptions || {};
      const cliName = v => { const c = (f.clientes || []).find(x => clientVal(x) === v); return c ? (clientName(c) || v) : v; };
      chips.push({ label: 'SIM Cards', group: true });
      chips.push({ label: 'Operaciones', value: paisLabel(msoState.pais) });
      chips.push(multi('Operador', listOf(msoState.operador), 'operadores'));
      chips.push(multi('Bolsa', listOf(msoState.bolsa).map(b => BOLSA_LABEL[b] || b), 'opciones'));
      chips.push(multi('Cliente', listOf(msoState.cliente).map(cliName), 'clientes'));
    }
    if (hasRec) {
      const r = ((msoState.recFilterOptions || {}).responsables || []).find(x => String(x.id) === msoState.recResponsable);
      chips.push({ label: 'Reclamos M2M', group: true });
      chips.push({ label: 'Operaciones', value: paisLabel(msoState.recPais) });
      chips.push({ label: 'Período', value: msoState.recPeriodo ? periodoLabel(msoState.recPeriodo) : 'Todos' });
      chips.push({ label: 'Etapa', value: msoState.recEtapa ? etapaLabel(msoState.recEtapa) : 'Todas' });
      chips.push({ label: 'Responsable', value: msoState.recResponsable ? (r ? (r.nombre || r.id) : msoState.recResponsable) : 'Todos' });
    }
    chips.push({ label: 'Datos al', value: dataDateText() });
    return chips;
  }

  function dataDateText() {
    try { if (fechaDatos) return textoFechaDatos(fechaDatos); } catch (e) { }
    return 'Sin fecha';
  }

  // ───────────────────────────────────────────────────────── carga de librerías

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const found = document.querySelector(`script[src="${url}"]`);
      if (found) {
        if (found.dataset.ready === '1') return resolve();
        found.addEventListener('load', () => resolve());
        found.addEventListener('error', () => reject(new Error('Sin conexión para cargar la librería PDF.')));
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => { script.dataset.ready = '1'; resolve(); };
      script.onerror = () => reject(new Error('Sin conexión para cargar la librería PDF.'));
      document.head.appendChild(script);
    });
  }

  async function loadJsPdf() {
    await loadScript(JSPDF_URL);
    if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') throw new Error('jsPDF no disponible');
    await loadScript(AUTOTABLE_URL);
    return window.jspdf.jsPDF;
  }

  // ───────────────────────────────────────────────────── logo (PNG → dataURL)

  let logoCache;

  // Fuente preferida: el data-URI de Ingresos (assets/js/ingreso/income-pdf-logo.js).
  // Va embebido en JS: sin peticiones ni problemas de CORS, aunque se abra con file://.
  function embeddedLogo() {
    const uri = window.INTELFOON_LOGO_DATAURI;
    return (typeof uri === 'string' && uri.indexOf('data:image/png;base64,') === 0) ? uri : null;
  }

  async function logoDataUrl() {
    if (logoCache !== undefined) return logoCache;
    logoCache = embeddedLogo();
    if (logoCache) return logoCache;
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(() => reject(new Error('timeout logo')), 5000);
        img.src = new URL(LOGO_URL, document.baseURI).href;
      });
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      const ratio = Math.min(size / img.naturalWidth, size / img.naturalHeight);
      const w = img.naturalWidth * ratio, h = img.naturalHeight * ratio;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      logoCache = canvas.toDataURL('image/png');   // puede fallar en file://
    } catch (error) {
      console.warn('[PDF] Logo no embebible, se dibuja la versión vectorial:', error && error.message);
      logoCache = null;
    }
    return logoCache;
  }

  // Respaldo si el PNG no se puede convertir (origen restringido).
  function drawVectorLogo(doc, cx, cy, radius) {
    doc.setFillColor(168, 172, 178);
    doc.circle(cx, cy, radius, 'F');
    doc.setFillColor(232, 234, 237);
    doc.circle(cx, cy, radius * 0.92, 'F');
    doc.setFillColor(214, 216, 220);
    doc.circle(cx, cy, radius * 0.8, 'F');
    doc.setFillColor(226, 24, 44);
    doc.circle(cx, cy, radius * 0.74, 'F');
    doc.setFillColor(196, 12, 38);
    doc.circle(cx, cy + radius * 0.35, radius * 0.4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, radius * 1.6));
    doc.text('RED', cx, cy + radius * 0.16, { align: 'center' });
  }

  function drawLogo(doc, dataUrl, x, y, size) {
    if (dataUrl) {
      try { doc.addImage(dataUrl, 'PNG', x, y, size, size, undefined, 'FAST'); return; }
      catch (e) { /* cae al vectorial */ }
    }
    drawVectorLogo(doc, x + size / 2, y + size / 2, size / 2);
  }

  // ──────────────────────────────────────────────── modelo de datos a reportar
  // Solo se consulta lo que piden los módulos marcados.

  async function buildModel(on) {
    const simP = globalParams();
    const recP = recParams();
    const needSim = ['kpi', 'estados', 'operadores', 'paises', 'clientes'].some(on);
    const needRec = on('reclamos');
    const needRecCli = on('reclamos') || on('recClientes');

    const [resSim, evo, bajar, subir, recRes, recCli, recCas, recResp] = await Promise.all([
      needSim ? msoGet(EP.simRes, simP).then(unwrap) : null,
      on('evolucion') ? msoGet(EP.simEvo).then(mapEvoRows) : null,
      on('optimizacion') ? fetchAllDetail(globalParams({ status: 'CAMBIOS', accion: 'BAJAR_PLAN' })) : null,
      on('optimizacion') ? fetchAllDetail(globalParams({ status: 'CAMBIOS', accion: 'SUBIR_PLAN' })) : null,
      needRec ? msoGet(EP.recRes, recP).then(body => recKpis(unwrap(body))) : null,
      needRecCli ? msoGet(EP.recCli, recP).then(body => unwrap(body).rows) : null,
      on('recCasos') ? msoGet(EP.recCas, recP).then(body => unwrap(body).rows) : null,
      on('responsables') ? msoGet(EP.recResp, recP).then(body => unwrap(body).rows) : null,
    ]);

    return {
      simPais: msoState.pais,
      simFilters: simFilterText(),
      recFilters: recFilterText(),
      dataDate: dataDateText(),
      sim: resSim ? simKpis(resSim) : null,
      resSim,
      evo: evo || [],
      bajar: bajar ? sortRows(bajar, 'client') : [],
      subir: subir ? sortRows(subir, 'client') : [],
      rec: recRes || {},
      recCli: recCli || [],
      recCas: (recCas || []).slice().sort((a, b) => n(a.prioridad) - n(b.prioridad) || n(b.dias_abierto) - n(a.dias_abierto)),
      recResp: recResp || []
    };
  }

  function fileName(model) {
    const pais = model.simPais === 'GT' ? 'GT' : model.simPais === 'SV' ? 'SV' : 'GT-SV';
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    return `Reporte_SIMs_${pais}_${iso}.pdf`;
  }

  // ──────────────────────────────────────────────────────────── piezas gráficas

  function fitFont(doc, text, maxWidth, size, min) {
    let current = size;
    doc.setFontSize(current);
    const value = String(text);
    while (current > (min || 6) && doc.getTextWidth(value) > maxWidth) {
      current -= 0.5;
      doc.setFontSize(current);
    }
    return current;
  }

  function drawCover(doc, logo, model, generado) {
    const h = 26;

    doc.setFillColor(C.navy[0], C.navy[1], C.navy[2]);
    doc.roundedRect(X, 12, W, h, 3, 3, 'F');
    doc.setFillColor(C.red[0], C.red[1], C.red[2]);
    doc.roundedRect(X + 4, 16, 2.4, h - 8, 1.2, 1.2, 'F');

    // Logo real (PNG con fondo transparente) en su pastilla original,
    // separado de la barrita roja del lateral
    drawLogo(doc, logo, X + 10.5, 14.5, 21);

    doc.setTextColor(C.white[0], C.white[1], C.white[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DASHBOARD DE SIMs · MSO · RED INTELFON', X + 37, 21, { charSpace: 0.7 });
    doc.setFontSize(15.5);
    doc.text('Reporte de SIM Cards y Reclamos M2M', X + 37, 31);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(C.softText[0], C.softText[1], C.softText[2]);
    doc.text(txt(`Generado el ${generado}`), X + W - 6, 21, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    const alcance = txt(`Operaciones: ${paisLabel(model.simPais)} · Datos al ${model.dataDate}`);
    fitFont(doc, alcance, W / 2 - 10, 9, 6.5);
    doc.setTextColor(C.white[0], C.white[1], C.white[2]);
    doc.text(alcance, X + W - 6, 31, { align: 'right' });
  }

  function drawChips(doc, model, mods) {
    const y = 43;
    const gap = 4;
    const hasSim = mods.some(id => MODULES.find(m => m.id === id).group === 'sim');
    const hasRec = mods.some(id => MODULES.find(m => m.id === id).group === 'rec');
    const chips = [
      { label: 'OPERACIONES', value: paisLabel(model.simPais) },
      hasSim && { label: 'FILTROS SIM CARDS', value: model.simFilters },
      hasRec && { label: 'FILTROS RECLAMOS M2M', value: model.recFilters },
      { label: 'FECHA DE LOS DATOS', value: model.dataDate }
    ].filter(Boolean);
    const width = (W - gap * (chips.length - 1)) / chips.length;

    chips.forEach((chip, index) => {
      const x = X + index * (width + gap);
      doc.setFillColor(C.chip[0], C.chip[1], C.chip[2]);
      doc.roundedRect(x, y, width, 12.5, 2, 2, 'F');
      doc.setFillColor(C.red[0], C.red[1], C.red[2]);
      doc.roundedRect(x, y, 1.6, 12.5, 0.8, 0.8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(C.red[0], C.red[1], C.red[2]);
      doc.text(chip.label, x + 5, y + 5, { charSpace: 0.4 });

      doc.setFontSize(9);
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      const value = txt(chip.value);
      fitFont(doc, value, width - 8, 9, 5.5);
      doc.text(value, x + 5, y + 10);
      doc.setFontSize(9);
    });

    return y + 12.5;
  }

  // Franja bajo los chips: lista los módulos que viajan al documento.
  function drawScopeStrip(doc, mods) {
    const y = 58.5;
    const h = 9;

    doc.setFillColor(C.chip[0], C.chip[1], C.chip[2]);
    doc.roundedRect(X, y, W, h, 2, 2, 'F');
    doc.setFillColor(C.red[0], C.red[1], C.red[2]);
    doc.roundedRect(X, y, 1.6, h, 0.8, 0.8, 'F');

    const label = 'MÓDULOS INCLUIDOS';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(C.red[0], C.red[1], C.red[2]);
    // Se acota a una caja fija: getTextWidth ignora el charSpace del rótulo
    // y la lista se acababa pegando al texto.
    fitFont(doc, label, 30, 6.2, 5);
    doc.text(label, X + 5, y + 5.9, { charSpace: 0.4 });
    const labelWidth = 40;

    const names = mods
      .map(id => (MODULES.find(module => module.id === id) || {}).title)
      .filter(Boolean)
      .map((title, index) => `${index + 1}. ${title}`)
      .join('  ·  ');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    fitFont(doc, txt(names), W - labelWidth - 6, 7.6, 4.2);
    doc.text(txt(names), X + labelWidth, y + 5.9);

    return y + h;
  }

  // Título de sección: barrita roja + "N. Título" + nota a la derecha.
  // Si el bloque no cabe en la página actual, se salta a una nueva.
  function startSection(doc, y, index, title, note, available) {
    if (y + (available || 22) > PAGE.h - PAGE.mb) {
      doc.addPage();
      y = PAGE.mt;
    }
    doc.setFillColor(C.red[0], C.red[1], C.red[2]);
    doc.roundedRect(X, y, 2.2, 6, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    const heading = `${index}. ${txt(title)}`;
    doc.text(heading, X + 5, y + 4.8);

    if (note) {
      const headingWidth = doc.getTextWidth(heading);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      const noteX = X + 5 + headingWidth + 5;
      if (noteX < X + W - 34) doc.text(txt(note), noteX, y + 4.8);
    }
    return y + 9;
  }

  function subTitle(doc, y, text) {
    if (y + 20 > PAGE.h - PAGE.mb) { doc.addPage(); y = PAGE.mt; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(txt(text).toUpperCase(), X, y + 3.5, { charSpace: 0.3 });
    return y + 6;
  }

  // Fila de tarjetas KPI: { label, value, foot, color }
  function drawCards(doc, items, y) {
    const gap = 4;
    const width = (W - gap * (items.length - 1)) / items.length;
    const height = 23;
    if (y + height > PAGE.h - PAGE.mb) { doc.addPage(); y = PAGE.mt; }

    items.forEach((item, index) => {
      const x = X + index * (width + gap);
      const color = item.color || C.navy;

      doc.setFillColor(C.white[0], C.white[1], C.white[2]);
      doc.setDrawColor(C.line[0], C.line[1], C.line[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, width, height, 2, 2, 'FD');

      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(x, y, width, 1.8, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      const label = txt(item.label).toUpperCase();
      fitFont(doc, label, width - 7, 6.2, 4.8);
      doc.text(label, x + 3.5, y + 6.6, { charSpace: 0.3 });

      doc.setTextColor(color[0], color[1], color[2]);
      fitFont(doc, item.value, width - 7, 13, 7);
      doc.text(txt(item.value), x + 3.5, y + 14);

      doc.setFont('helvetica', 'normal');
      const foot = txt(item.foot || '');
      fitFont(doc, foot, width - 7, 6.4, 4.8);
      doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      doc.text(foot, x + 3.5, y + 19.5);
    });

    return y + height;
  }

  // Tabla genérica con la estética del reporte
  function drawTable(doc, options) {
    const numeric = options.numeric || [];
    const colorByColumn = options.colors || {};
    const margin = options.margin || { left: X, right: X };

    doc.autoTable({
      head: [options.head.map(txt)],
      body: options.body.map(row => row.map(cell => (typeof cell === 'string' ? txt(cell) : cell))),
      foot: options.foot ? [options.foot.map(cell => (typeof cell === 'string' ? txt(cell) : cell))] : undefined,
      startY: options.startY,
      margin: { left: margin.left, right: margin.right, top: PAGE.mt, bottom: PAGE.mb },
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: options.fontSize || 7.4,
        cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
        textColor: C.text,
        lineColor: C.line,
        lineWidth: 0.1,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: C.navy2,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 7.2,
        lineWidth: 0
      },
      footStyles: {
        fillColor: C.headFoot,
        textColor: C.text,
        fontStyle: 'bold',
        fontSize: 7.8,
        lineWidth: 0.1
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: options.columnStyles || {},
      didParseCell: data => {
        const style = (options.columnStyles || {})[data.column.index] || {};
        const align = style.halign || (numeric.indexOf(data.column.index) !== -1 ? 'right' : 'left');
        data.cell.styles.halign = align;
        if (data.section !== 'body') return;

        const raw = String(data.cell.raw == null ? '' : data.cell.raw).trim();
        if (!raw || raw === '—' || raw === '-') return;
        const color = colorByColumn[data.column.index];
        if (typeof color === 'function') { const c = color(raw, data.row.index); if (c) data.cell.styles.textColor = c; }
        else if (color) data.cell.styles.textColor = color;
      }
    });

    return doc.lastAutoTable.finalY;
  }

  const emptyRow = (cols, text) => [[{ content: text, colSpan: cols, styles: { halign: 'center', textColor: C.muted } }]];

  // Encabezado compacto para las páginas 2 en adelante
  function drawMiniHeader(doc, model, logo) {
    drawLogo(doc, logo, X, 11.4, 6.6);
    doc.setFillColor(C.red[0], C.red[1], C.red[2]);
    doc.roundedRect(X + 9, 10.5, 2.2, 6, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.text('REPORTE DE SIMs · MSO', X + 13.4, 15.2, { charSpace: 0.5 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(txt(`Operaciones: ${paisLabel(model.simPais)} · Datos al ${model.dataDate}`), X + W, 15.2, { align: 'right' });
  }

  function drawFooters(doc, model, generado, logo) {
    const total = doc.internal.getNumberOfPages();
    for (let page = 1; page <= total; page++) {
      doc.setPage(page);

      doc.setDrawColor(C.line[0], C.line[1], C.line[2]);
      doc.setLineWidth(0.2);
      doc.line(X, PAGE.h - 13.5, X + W, PAGE.h - 13.5);
      // Acento de marca sobre el filete del pie
      doc.setFillColor(C.red[0], C.red[1], C.red[2]);
      doc.roundedRect(X, PAGE.h - 14.2, 18, 1.4, 0.7, 0.7, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      doc.text('RED Intelfon · Dashboard de SIMs (MSO)', X + 21, PAGE.h - 9.5);
      doc.text(txt(`Generado ${generado}`), X + W / 2, PAGE.h - 9.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      doc.text(`Página ${page} de ${total}`, X + W, PAGE.h - 9.5, { align: 'right' });

      if (page > 1) drawMiniHeader(doc, model, logo);
    }
  }

  // ─────────────────────────────────────────────────────────── secciones

  function sectionKpi(doc, model, y, sec) {
    const s = model.sim;
    y = startSection(doc, y, sec, 'Resumen ejecutivo · SIM Cards', `Base filtrada · ${model.simFilters}`, 34);
    return drawCards(doc, [
      { label: 'SIM consolidadas', value: num0(s.total), foot: 'Base filtrada' },
      { label: 'Stock', value: num0(s.stock), foot: `Disponible · ${pctOf(s.stock, s.total)}`, color: C.blue },
      { label: 'Mantener', value: num0(s.mantener), foot: `Sin modificación · ${pctOf(s.mantener, s.total)}`, color: C.cyan },
      { label: 'Revisión', value: num0(s.revision), foot: `En bolsa ${num0(s.k.revision_bolsa)} · fuera ${num0(s.k.revision_fuera_bolsa)}`, color: C.amber },
      { label: 'Reemplazos', value: num0(s.reemp), foot: `Atención operativa · ${pctOf(s.reemp, s.total)}`, color: C.rose },
      { label: 'Cambios', value: num0(s.cambios), foot: `Bajar ${num0(s.bajar)} · Subir ${num0(s.subir)}`, color: C.green }
    ], y);
  }

  function sectionEstados(doc, model, y, sec) {
    const s = model.sim;
    const k = s.k;
    y = startSection(doc, y, sec, 'Distribución por estado y cambios sugeridos', 'Clasificación oficial de los reportes MSO', 40);
    const half = (W - 6) / 2;
    const estados = [['CAMBIOS', s.cambios], ['MANTENER', s.mantener], ['REVISION-MANTENER', s.revision], ['STOCK', s.stock], ['REEMPLAZOS', s.reemp]]
      .sort((a, b) => b[1] - a[1]);
    const page = doc.internal.getCurrentPageInfo().pageNumber;
    const yLeft = drawTable(doc, {
      startY: y,
      margin: { left: X, right: X + half + 6 },
      head: ['Estado', 'SIM', '% del total'],
      numeric: [1, 2],
      colors: { 0: raw => { const e = estados.find(([st]) => STATUS_META[st].label === raw); return e ? STATUS_COLOR[e[0]] : null; } },
      columnStyles: { 0: { fontStyle: 'bold' } },
      body: estados.map(([st, v]) => [STATUS_META[st].label, num0(v), pctOf(v, s.total)]),
      foot: ['TOTAL', num0(s.total), s.total ? '100%' : '—']
    });
    const accion = [
      ['Bajar · en bolsa (M2M)', k.bajar_bolsa], ['Bajar · fuera de bolsa', k.bajar_fuera_bolsa],
      ['Subir · en bolsa (M2M)', k.subir_bolsa], ['Subir · fuera de bolsa', k.subir_fuera_bolsa]
    ];
    doc.setPage(page);   // la segunda tabla va a la par de la primera
    const yRight = drawTable(doc, {
      startY: y,
      margin: { left: X + half + 6, right: X },
      head: ['Cambios por acción y bolsa', 'SIM', '% de cambios'],
      numeric: [1, 2],
      colors: { 0: raw => (raw.indexOf('Bajar') === 0 ? C.amber : C.green) },
      columnStyles: { 0: { fontStyle: 'bold' } },
      body: accion.map(([label, v]) => [label, num0(v), pctOf(v, s.cambios)]),
      foot: ['TOTAL CAMBIOS', num0(s.cambios), s.cambios ? '100%' : '—']
    });
    return Math.max(yLeft, yRight);
  }

  function sectionOperadores(doc, model, y, sec) {
    const ops = [...model.resSim.por_op].sort((a, b) => n(b.total ?? b.simcards_consolidadas) - n(a.total ?? a.simcards_consolidadas));
    const tot = o => n(o.total ?? o.simcards_consolidadas);
    const sum = f => ops.reduce((acc, o) => acc + n(f(o)), 0);
    const opSum = sum(tot) || model.sim.total || 0;
    y = startSection(doc, y, sec, 'Por operador', `${ops.length} operador(es) · volumen total y acciones sugeridas`, 26);
    return drawTable(doc, {
      startY: y,
      head: ['#', 'Operador', 'SIM consolidadas', '% del total', 'Cambios', 'Bajar plan', 'Subir plan'],
      numeric: [2, 3, 4, 5, 6],
      colors: { 4: C.rose, 5: C.amber, 6: C.green },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 73, fontStyle: 'bold' } },
      body: ops.length ? ops.map((o, i) => [
        i + 1, o.operador || o.nombre || 'Operadora', num0(tot(o)), pctOf(tot(o), opSum),
        num0(o.cambios), num0(o.bajar ?? o.bajar_plan), num0(o.subir ?? o.subir_plan)
      ]) : emptyRow(7, 'Sin información de operadores.'),
      foot: ops.length ? ['', 'TOTAL', num0(opSum), '100%', num0(sum(o => o.cambios)),
        num0(sum(o => o.bajar ?? o.bajar_plan)), num0(sum(o => o.subir ?? o.subir_plan))] : null
    });
  }

  function sectionPaises(doc, model, y, sec) {
    const rows = model.resSim.por_pais;
    const sum = f => rows.reduce((acc, p) => acc + n(f(p)), 0);
    y = startSection(doc, y, sec, 'Cambios por país', 'Separación SV / GT según información del cliente y operador', 26);
    return drawTable(doc, {
      startY: y,
      head: ['País', 'SIM consolidadas', 'Cambios', '% cambios', 'Bajar plan', 'Subir plan'],
      numeric: [1, 2, 3, 4, 5],
      colors: { 2: C.rose, 4: C.amber, 5: C.green },
      columnStyles: { 0: { cellWidth: 73, fontStyle: 'bold' } },
      body: rows.length ? rows.map(p => {
        const t = n(p.total ?? p.simcards_consolidadas);
        return [p.pais || p.pais_nombre || '—', num0(t), num0(p.cambios), pctOf(p.cambios, t),
          num0(p.bajar ?? p.bajar_plan), num0(p.subir ?? p.subir_plan)];
      }) : emptyRow(6, 'Sin información por país.'),
      foot: rows.length ? ['TOTAL', num0(sum(p => p.total ?? p.simcards_consolidadas)), num0(sum(p => p.cambios)),
        pctOf(sum(p => p.cambios), sum(p => p.total ?? p.simcards_consolidadas)),
        num0(sum(p => p.bajar ?? p.bajar_plan)), num0(sum(p => p.subir ?? p.subir_plan))] : null
    });
  }

  function sectionClientes(doc, model, y, sec) {
    const rows = model.resSim.clientes;
    y = startSection(doc, y, sec, 'Clientes con más cambios', `${rows.length} cliente(s) en el ranking`, 26);
    return drawTable(doc, {
      startY: y,
      head: ['#', 'Cliente', 'Código', 'País', 'Cambios', '% de cambios'],
      numeric: [4, 5],
      colors: { 4: C.rose },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 110, fontStyle: 'bold' }, 3: { halign: 'center' } },
      body: rows.length ? rows.map((c, i) => [
        i + 1, c.cliente_nombre || c.cliente || 'SIN CLIENTE', c.cod_cliente || '—', c.pais || '—',
        num0(c.cambios), pctOf(c.cambios, model.sim.cambios)
      ]) : emptyRow(6, 'Sin cambios para los filtros actuales.')
    });
  }

  function sectionEvolucion(doc, model, y, sec) {
    const rows = model.evo;
    y = startSection(doc, y, sec, 'Evolución de SIM Cards en cambios',
      'Fotografía diaria del total pendiente · histórico general (no depende de los filtros)', 26);
    if (rows.length) {
      const first = rows[0].cambios, last = rows[rows.length - 1].cambios, diff = first - last;
      const variation = diff > 0 ? `Baja ${num0(diff)} (${pctOf(diff, first)})` : diff < 0 ? `Sube ${num0(-diff)} (${pctOf(-diff, first)})` : 'Sin variación';
      y = drawCards(doc, [
        { label: `Primer registro · ${rows[0].fullLabel}`, value: num0(first), foot: 'SIM en cambios' },
        { label: `Actual · ${rows[rows.length - 1].fullLabel}`, value: num0(last), foot: 'SIM en cambios' },
        { label: 'Variación', value: variation, foot: 'Primer registro vs. actual', color: diff > 0 ? C.green : diff < 0 ? C.rose : C.navy }
      ], y) + 4;
    }
    return drawTable(doc, {
      startY: y,
      head: ['Fecha', 'Total cambios', 'En bolsa · M2M', 'Fuera de bolsa'],
      numeric: [1, 2, 3],
      colors: { 1: C.rose, 2: C.cyan, 3: C.blue },
      columnStyles: { 0: { fontStyle: 'bold' } },
      body: rows.length ? rows.slice().reverse().map(r => [r.fullLabel, num0(r.cambios), num0(r.bolsa), num0(r.fuera)])
        : emptyRow(4, 'El histórico aún no tiene registros.')
    });
  }

  function optTable(doc, rows, y) {
    const shown = rows.slice(0, OPT_MAX_ROWS);
    y = drawTable(doc, {
      startY: y,
      fontSize: 6.8,
      head: ['Operador', 'País', 'Cliente', 'Línea', 'SIM', 'Plan actual', 'Prom. M2+M3', 'Sub-status', 'Destino', 'Anexo'],
      numeric: [6],
      columnStyles: {
        0: { cellWidth: 24 }, 1: { cellWidth: 12, halign: 'center' }, 2: { cellWidth: 52, fontStyle: 'bold' },
        3: { cellWidth: 24 }, 4: { cellWidth: 34 }, 5: { cellWidth: 30 }, 6: { cellWidth: 20 },
        7: { cellWidth: 27 }, 8: { cellWidth: 18, halign: 'center' }, 9: { cellWidth: 32 }
      },
      body: shown.length ? shown.map(r => [
        r.operador || '—', r.pais || r.pais_codigo || '—', r.cliente || 'SIN CLIENTE',
        String(r.linea || '—'), String(r.sim || r.sim_15 || '—'),
        `${r.plan_actual || r.plan_jasper || '—'} (${mbTxt(r.plan_actual_mb)})`,
        `${num0(r.promedio_mes2y3)} MB`, r.sub_status || '—', mbTxt(r.capacidad_destino_mb), r.anexo || '—'
      ]) : emptyRow(10, 'Sin SIM candidatas para los filtros actuales.')
    });
    if (rows.length > shown.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      doc.text(txt(`Se muestran las primeras ${num0(shown.length)} de ${num0(rows.length)} SIM. El detalle completo está en el Excel del Informe detallado.`), X, y + 4);
      y += 5;
    }
    return y;
  }

  function sectionOptimizacion(doc, model, y, sec) {
    const destino = (rows, mb) => rows.filter(r => n(r.capacidad_destino_mb) === mb).length;
    const clientes = rows => new Set(rows.map(r => clientVal(r))).size;
    y = startSection(doc, y, sec, 'Optimización · bajar y subir plan', `Status CAMBIOS · ${model.simFilters}`, 34);
    y = drawCards(doc, [
      { label: 'Candidatas a bajar', value: num0(model.bajar.length), foot: `${num0(clientes(model.bajar))} cliente(s)`, color: C.amber },
      { label: 'Candidatas a subir', value: num0(model.subir.length), foot: `${num0(clientes(model.subir))} cliente(s)`, color: C.green },
      { label: 'Destino 100 MB', value: num0(destino(model.bajar, 100) + destino(model.subir, 100)), foot: 'Capacidad objetivo', color: C.cyan },
      { label: 'Destino 1 GB', value: num0(destino(model.bajar, 1024) + destino(model.subir, 1024)), foot: 'Capacidad objetivo', color: C.blue }
    ], y);
    y = subTitle(doc, y + 5, `Bajar plan · ${num0(model.bajar.length)} SIM`);
    y = optTable(doc, model.bajar, y);
    y = subTitle(doc, y + 6, `Subir plan · ${num0(model.subir.length)} SIM`);
    return optTable(doc, model.subir, y);
  }

  function sectionReclamos(doc, model, y, sec) {
    const r = model.rec;
    y = startSection(doc, y, sec, 'Reclamos M2M -> 1 GB', model.recFilters, 34);
    y = drawCards(doc, [
      { label: 'Candidatas M2M -> 1 GB', value: num0(r.sims_total), foot: 'Fuente: reporte_m2m' },
      { label: 'Excluidas', value: num0(r.sims_excluidas), foot: 'No entran en reclamos futuros', color: C.amber },
      { label: 'Pendientes', value: num0(r.sims_pendientes), foot: 'Listas para ingreso', color: C.green },
      { label: 'Reingresos', value: num0(r.reingresos), foot: 'Máxima prioridad operativa', color: C.rose },
      { label: 'Clientes', value: num0(model.recCli.length), foot: '1 reclamo por cliente' }
    ], y);
    y = subTitle(doc, y + 5, 'SLA de reclamos · día 0 al 15 en plazo · día 16 escalamiento 1 · día 21 escalamiento 2');
    y = drawCards(doc, [
      { label: 'Total reclamos', value: num0(r.reclamos_total), foot: 'Productivos' },
      { label: 'Abiertos', value: num0(r.reclamos_abiertos), foot: 'Estado SAC distinto de Finalizado' },
      { label: 'En plazo', value: num0(r.en_plazo), foot: 'Día 0 al 15', color: C.green },
      { label: 'Escalamiento 1', value: num0(r.escalamiento_1), foot: 'Día 16 al 20', color: C.amber },
      { label: 'Escalamiento 2', value: num0(r.escalamiento_2), foot: 'Día 21 en adelante', color: C.rose },
      { label: 'Finalizados', value: num0(r.finalizados), foot: 'Cerrados en SAC' }
    ], y);
    y = subTitle(doc, y + 5, 'Indicadores');
    return drawCards(doc, [
      { label: 'Cambios realizados', value: num0(r.cambios_realizados), foot: 'Validación post-cierre', color: C.green },
      { label: 'Cambios no realizados', value: num0(r.cambios_no_realizados), foot: 'Requieren reingreso', color: C.rose },
      { label: 'Cumplimiento SLA', value: pctTxt(r.cumplimiento_sla_pct), foot: 'Reclamos evaluados' },
      { label: 'Efectividad post-cierre', value: pctTxt(r.efectividad_postcierre_pct), foot: 'Realizadas / validadas' }
    ], y);
  }

  function recClienteEstado(c) {
    const pend = n(c.sims_pendientes), tot = n(c.sims_total);
    return pend > 0 ? 'PENDIENTE DE INGRESO' : !c.cliente_id ? 'SIN CÓDIGO' : tot > 0 ? 'YA INGRESADO' : 'SIN SIM';
  }

  function sectionRecClientes(doc, model, y, sec) {
    const rows = model.recCli;
    const sum = f => rows.reduce((acc, c) => acc + n(c[f]), 0);
    y = startSection(doc, y, sec, 'Reclamos por cliente', `${rows.length} cliente(s) · ${model.recFilters}`, 26);
    return drawTable(doc, {
      startY: y,
      head: ['Cliente', 'Código', 'País', 'Candidatas', 'Excluidas', 'Pendientes', 'Estado'],
      numeric: [3, 4, 5],
      colors: {
        4: C.amber, 5: C.green,
        6: raw => (raw === 'PENDIENTE DE INGRESO' ? C.green : raw === 'SIN CÓDIGO' ? C.rose : raw === 'SIN SIM' ? C.amber : C.muted)
      },
      columnStyles: { 0: { cellWidth: 88, fontStyle: 'bold' }, 6: { fontStyle: 'bold' } },
      body: rows.length ? rows.map(c => [
        c.cliente_nombre || 'SIN CLIENTE', c.cliente_id || 'SIN CÓDIGO', c.pais_nombre || c.pais || '—',
        num0(c.sims_total), num0(c.sims_excluidas), num0(c.sims_pendientes), recClienteEstado(c)
      ]) : emptyRow(7, 'Sin clientes para los filtros seleccionados.'),
      foot: rows.length ? ['TOTAL', '', '', num0(sum('sims_total')), num0(sum('sims_excluidas')), num0(sum('sims_pendientes')), ''] : null
    });
  }

  function sectionRecCasos(doc, model, y, sec) {
    const rows = model.recCas;
    y = startSection(doc, y, sec, 'Seguimiento de reclamos creados',
      `${rows.length} reclamo(s) · los que requieren mayor atención aparecen primero`, 26);
    const slaColor = raw => (/Escalamiento 2|Reingreso/.test(raw) ? C.rose : /Escalamiento 1/.test(raw) ? C.amber : /En plazo/.test(raw) ? C.green : C.muted);
    return drawTable(doc, {
      startY: y,
      fontSize: 7,
      head: ['Reclamo', 'Cliente', 'País', 'Estado SAC', 'Responsable', 'SLA', 'Días', 'SIM', 'Realiz.', 'No realiz.'],
      numeric: [6, 7, 8, 9],
      colors: { 5: slaColor, 8: C.green, 9: C.rose },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' }, 1: { cellWidth: 62 }, 2: { cellWidth: 22 }, 3: { cellWidth: 26 },
        4: { cellWidth: 40 }, 5: { cellWidth: 27, fontStyle: 'bold' }
      },
      body: rows.length ? rows.map(c => [
        `${c.case_id || '—'}${c.es_reingreso ? ` (reingreso ${num0(c.intento)})` : ''}`,
        c.cliente_nombre || 'Cliente no disponible', c.pais_nombre || c.pais || '—', c.estado || '—',
        c.agente_nombre || 'Sin agente', etapaLabel(String(c.etapa_sla || '').toUpperCase()),
        num0(c.dias_abierto), num0(c.total_sims), num0(c.cambios_realizados), num0(c.cambios_no_realizados)
      ]) : emptyRow(10, 'Sin reclamos para los filtros seleccionados.')
    });
  }

  function sectionResponsables(doc, model, y, sec) {
    const rows = model.recResp;
    y = startSection(doc, y, sec, 'Carga por responsable', 'Estado actual de los reclamos según el agente asignado en SAC', 26);
    return drawTable(doc, {
      startY: y,
      head: ['Responsable', 'Correo', 'Reclamos', 'Abiertos', 'Esc. 1', 'Esc. 2', 'Finalizados', 'SIM'],
      numeric: [2, 3, 4, 5, 6, 7],
      colors: { 4: C.amber, 5: C.rose },
      columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 65 } },
      body: rows.length ? rows.map(r => [
        r.agente_nombre || r.agente || 'Sin agente', r.agente_email || '—',
        num0(r.reclamos_total ?? r.reclamos), num0(r.reclamos_abiertos ?? r.abiertos),
        num0(r.escalamiento_1), num0(r.escalamiento_2),
        num0(r.reclamos_finalizados ?? r.finalizados), num0(r.sims_total ?? r.sims)
      ]) : emptyRow(8, 'Sin responsables para los filtros seleccionados.')
    });
  }

  const SECTIONS = {
    kpi: sectionKpi,
    estados: sectionEstados,
    operadores: sectionOperadores,
    paises: sectionPaises,
    clientes: sectionClientes,
    evolucion: sectionEvolucion,
    optimizacion: sectionOptimizacion,
    reclamos: sectionReclamos,
    recClientes: sectionRecClientes,
    recCasos: sectionRecCasos,
    responsables: sectionResponsables
  };

  // ───────────────────────────────────────────────────────────── generación

  async function generatePdf(selected) {
    // Módulos marcados en la ventana de selección múltiple (por defecto: todos)
    const mods = Array.isArray(selected) && selected.length
      ? MODULE_IDS.filter(id => selected.indexOf(id) !== -1)
      : MODULE_IDS.slice();
    const on = id => mods.indexOf(id) !== -1;

    const [jsPDF, logo, model] = await Promise.all([loadJsPdf(), logoDataUrl(), buildModel(on)]);
    const ahora = new Date();
    const generado = `${ahora.toLocaleDateString('es-GT')} · ${ahora.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({
      title: `Reporte de SIMs · ${paisLabel(model.simPais)} · ${model.dataDate}`,
      subject: 'SIM Cards, optimización y reclamos M2M',
      author: 'RED Intelfon · Dashboard de SIMs',
      creator: 'Dashboard de SIMs · Intelfon'
    });

    // ── Portada: encabezado, chips, alcance y módulos incluidos
    drawCover(doc, logo, model, generado);
    drawChips(doc, model, mods);
    drawScopeStrip(doc, mods);

    let y = 71;
    mods.forEach((id, index) => {
      y = SECTIONS[id](doc, model, index ? y + 7 : y, index + 1);
    });

    drawFooters(doc, model, generado, logo);

    doc.save(fileName(model));
    toast('ok', 'PDF descargado', `${mods.length} módulo(s) · ${paisLabel(model.simPais)}`);
  }

  // ─────────────────────────────────────────────────────── estados y avisos

  function toast(kind, title, detail) {
    const old = document.querySelector('.pdf-report-toast');
    if (old) old.remove();

    const el = document.createElement('div');
    el.className = `pdf-report-toast${kind === 'error' ? ' is-error' : ''}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<i></i><span><b></b><small></small></span>`;
    el.querySelector('b').textContent = title;
    el.querySelector('small').textContent = detail || '';
    document.body.appendChild(el);

    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 260);
    }, 4200);
  }

  let busy = false;

  // Copia original del botón, para restaurarla al terminar
  const BTN_STRONG = BTN.querySelector('.pdf-report-copy strong');
  const BTN_IDLE = BTN_STRONG ? BTN_STRONG.textContent : '';

  async function runGeneration(mods) {
    if (busy) return;
    busy = true;

    BTN.classList.add('is-loading');
    BTN.disabled = true;
    if (BTN_STRONG) BTN_STRONG.textContent = 'Generando PDF…';

    try {
      await generatePdf(mods);
    } catch (error) {
      console.error('[PDF] No se pudo generar el reporte:', error);
      toast('error', 'No se pudo generar el PDF', error && error.message ? error.message : 'Error desconocido');
    } finally {
      BTN.classList.remove('is-loading');
      BTN.disabled = false;
      if (BTN_STRONG) BTN_STRONG.textContent = BTN_IDLE;
      busy = false;
    }
  }

  // ───────────────────────────────── ventana de selección múltiple de módulos

  const MODAL = document.getElementById('pdfModuleModal');
  const OPTIONS = document.getElementById('pdfModuleOptions');
  const COUNT = document.getElementById('pdfModuleCount');
  const GENERATE_BTN = document.getElementById('generatePdfModules');
  const GENERATE_COUNT = document.getElementById('pdfModuleGenerateCount');
  const FILTERS = document.getElementById('pdfModuleFilters');

  let closeTimer = null;
  let lastFocused = null;

  const selectedIds = () => (OPTIONS
    ? Array.from(OPTIONS.querySelectorAll('input:checked')).map(input => input.value)
    : MODULE_IDS.slice());

  // Por defecto van marcados los módulos de resumen; los de detalle largo
  // (optimización y seguimiento de reclamos) se marcan si el usuario los quiere.
  const DEFAULT_OFF = ['optimizacion', 'recCasos'];

  function renderOptions() {
    if (!OPTIONS) return;
    OPTIONS.innerHTML = MODULES.map((module, index) => `
      <label class="pdf-module-option" data-module="${module.id}">
        <input type="checkbox" value="${module.id}"${DEFAULT_OFF.indexOf(module.id) === -1 ? ' checked' : ''}>
        <span class="pdf-module-box" aria-hidden="true"></span>
        <span class="pdf-module-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
            stroke-linecap="round" stroke-linejoin="round">${module.icon}</svg>
        </span>
        <span class="pdf-module-copy">
          <strong>${module.title}</strong>
          <span>${module.hint}</span>
        </span>
        <span class="pdf-module-order" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
      </label>`).join('');

    OPTIONS.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', refreshCount);
    });
  }

  function renderFilters(ids) {
    if (!FILTERS) return;
    const chips = modalFilterChips(ids);
    FILTERS.innerHTML = chips.map(chip => {
      if (chip.group) return `<span class="pdf-filter-chip is-group"><strong>${esc(chip.label)}</strong></span>`;
      const detail = chip.detail
        ? `<span class="pdf-filter-detail" role="tooltip"><span class="pdf-filter-detail-title">${esc(chip.label)} · opciones aplicadas</span>` +
          `<span class="pdf-filter-detail-text">${esc(chip.detail)}</span></span>`
        : '';
      const aria = chip.detail ? `${chip.label}: ${chip.detail}` : `${chip.label}: ${chip.value}`;
      return `<span class="pdf-filter-chip${chip.detail ? ' has-detail' : ''}"${chip.detail ? ' tabindex="0"' : ''} aria-label="${esc(aria)}">` +
        `<span class="pdf-filter-chip-label">${esc(chip.label)}</span><strong>${esc(chip.value)}</strong>${detail}</span>`;
    }).join('');
    FILTERS.hidden = chips.length === 0;
  }

  function refreshCount() {
    if (!OPTIONS) return;
    const ids = selectedIds();
    renderFilters(ids);

    OPTIONS.querySelectorAll('.pdf-module-option').forEach(option => {
      const input = option.querySelector('input');
      option.classList.toggle('is-checked', !!(input && input.checked));
    });

    if (COUNT) {
      COUNT.textContent = `${ids.length} de ${MODULES.length} módulos seleccionados`;
      COUNT.classList.toggle('is-empty', ids.length === 0);
    }
    if (GENERATE_COUNT) GENERATE_COUNT.textContent = String(ids.length);
    if (GENERATE_BTN) GENERATE_BTN.disabled = ids.length === 0;
  }

  function trapFocus(event) {
    const focusables = Array.from(MODAL.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.disabled && el.getClientRects().length);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openSelection() {
    // Sin ventana se genera el reporte completo
    if (!MODAL || !OPTIONS) return runGeneration(MODULE_IDS.slice());
    if (busy) return;

    lastFocused = document.activeElement;
    clearTimeout(closeTimer);
    MODAL.classList.remove('is-closing');
    MODAL.hidden = false;
    document.body.style.overflow = 'hidden';
    refreshCount();

    const first = OPTIONS.querySelector('input');
    if (first) first.focus();
  }

  function closeSelection() {
    if (!MODAL || MODAL.hidden) return;

    MODAL.classList.add('is-closing');
    document.body.style.overflow = '';
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      MODAL.hidden = true;
      MODAL.classList.remove('is-closing');
    }, 170);

    if (lastFocused && typeof lastFocused.focus === 'function' && lastFocused.isConnected) {
      lastFocused.focus();
    }
  }

  if (MODAL && OPTIONS) {
    renderOptions();

    document.getElementById('closePdfModules')?.addEventListener('click', closeSelection);
    document.getElementById('cancelPdfModules')?.addEventListener('click', closeSelection);

    // Click fuera del panel (sobre el fondo) cierra la ventana
    MODAL.addEventListener('click', event => {
      if (event.target === MODAL) closeSelection();
    });

    MODAL.querySelectorAll('[data-pdf-quick]').forEach(button => {
      button.addEventListener('click', () => {
        const checkAll = button.dataset.pdfQuick === 'all';
        OPTIONS.querySelectorAll('input[type="checkbox"]').forEach(input => {
          input.checked = checkAll;
        });
        refreshCount();
      });
    });

    GENERATE_BTN?.addEventListener('click', () => {
      const ids = selectedIds();
      if (!ids.length) return;
      closeSelection();
      runGeneration(ids);
    });

    document.addEventListener('keydown', event => {
      if (MODAL.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSelection();
        return;
      }
      if (event.key === 'Tab') trapFocus(event);
    });
  }

  BTN.addEventListener('click', openSelection);
})();
