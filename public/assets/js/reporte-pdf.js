/* ============================================================
   REPORTE PDF · FORMATO ESTÁNDAR RED INTELFON
   Misma técnica y mismo CSS que exportToPDF() de Facturación por Línea
   (dashboards/facturacion_linea/facturacion-linea.html): abre una ventana y
   escribe el reporte como HTML. Después lo convierte en PDF y lo descarga
   (ver «Descarga directa del PDF»): area-subarea-AAAA-MM-DD.pdf. Si la
   conversión falla, se llama a print() como antes.

   generarReportePDF({
     area:      'MARKETING',                 // cejilla: RED INTELFON · area · subarea
     subarea:   'FLUJO DE VENTAS',
     titulo:    'Reporte de Flujo de Ventas',
     archivo:   'Reporte de Flujo de Ventas - RED Intelfon',   // <title>
     logo:      url o data: URI (opcional; por defecto assets/img/logo-intelfon.png),
     onBloqueado: msg => …,                  // opcional: si el navegador bloquea la ventana
                                             // (sin él, alert). Devuelve true si abrió el reporte.
     filtros:   [{etiqueta, valor}],         // línea gris, valores en negrita
     pill:      {etiqueta, valor},           // pastilla roja arriba a la derecha (opcional)
     tarjetas:  [{lbl, num, sub, color}],    // exactamente 4 → «1. Resumen ejecutivo»
     secciones: [ … ]                        // una de las tres formas de abajo
   })

   Sección tabla (tipo 'tabla', o sin tipo) y sección 'resumen' (la misma
   tabla, como «Resumen por línea de negocio»: fila TOTAL oscura y mini barra):
     { tipo: 'resumen',
       titulo:   'Resumen por …',
       columnas: [{titulo, align:'l'|'c'|'r', clase}],
       filas:    [[celda, …]],
       total:    [celda, …],     // opcional: fila oscura al final, sin colores en línea
       nota:     'texto gris bajo el título' }   // opcional
     celda: texto, o {texto | html, align, color, bold}, o {mini: 0-100, texto}
            (mini barra de progreso verde con el % al lado)
     En la tabla de detalle (no en 'resumen'), cada vez que se genera:
     · columna vacía en todas las filas → no se pinta;
     · columna con el mismo valor en todas las filas → no se pinta y va a la
       línea de filtros del encabezado.
     Las dos se anotan bajo el título. ocultarColumnas: false lo desactiva.
     Lo corto (≤ 12 caracteres) no se parte; la clase 'com' marca texto libre:
     ancho fijo y salto de renglón, sin puntos suspensivos.

   Sección 'graficas' (dos cajas lado a lado, como «Estado de cobro y
   facturación mensual»):
     { tipo: 'graficas',
       titulo: 'Estado de leads y evolución mensual',
       dona:   { titulo, centro:{valor, etiqueta},
                 partes:[{etiqueta, valor, monto, color}],   // valor: número; monto: texto (opcional)
                 pie: 'texto gris al final' o ['renglón', …] },  // opcional
       barras: { titulo, items:[{etiqueta, valor, texto, sub}] } }

   Una sección sin datos (tabla sin filas, o gráficas con la dona y las
   barras vacías) no se pinta, y las demás se numeran corridas: 1., 2., 3.…
   Un tipo de sección desconocido avisa en la consola (ver TIPOS).

   Todo el texto se escapa. Solo {html} entra sin escapar: quien lo arma
   tiene que escapar lo que venga de la base (generarReportePDF.esc).
   Para las pastillas de estado: <span class="badge b-ok|b-near|b-venc">.
   ============================================================ */
(function(){
  // Ruta del logo relativa a este script: funciona desde cualquier carpeta.
  const scriptSrc = document.currentScript && document.currentScript.src;

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const ALIGN = { l: '', c: 'c', r: 'r' };

  // En la fila TOTAL no se emite ningún color en línea: todo hereda el
  // blanco de tr.tot td (un style="color:…" le ganaría y quedaría ilegible).
  function celda(c, col, isTotal) {
    const o = (c !== null && typeof c === 'object') ? c : { texto: c };
    let contenido = o.html != null ? String(o.html) : esc(o.texto);
    if (o.mini != null) {
      const p = Math.max(0, Math.min(Number(o.mini) || 0, 100));
      contenido = `<span class="mini"><span style="width:${p}%;"></span></span>${o.texto != null ? esc(o.texto) : `${Math.round(p)}%`}`;
    }
    if (o.bold && !isTotal) contenido = `<b>${contenido}</b>`;
    const clases = [ALIGN[o.align || col.align || 'l'], col.clase].filter(Boolean).join(' ');
    const color = (!isTotal && o.color) ? ` style="color:${esc(o.color)};"` : '';
    return `<td${clases ? ` class="${esc(clases)}"` : ''}${color}>${contenido}</td>`;
  }

  const PALETA = (window.GuiaGraficas && window.GuiaGraficas.SERIES) || ['#c43c50','#4f8fd8','#2f8f76','#c59600','#d95f6e','#7fb0f0','#8b909e'];
  const dato = (v) => Number(v) || 0;

  const graficasVacia = (s) =>
    !((s.dona && (s.dona.partes || []).some(p => dato(p.valor) > 0)) ||
      (s.barras && (s.barras.items || []).length));
  /* Tipos de sección que la librería conoce, cada uno con su regla de
     «vacía». Una sección vacía no se pinta, a propósito. Un tipo que no
     está aquí es otra cosa (una errata, o un tipo que se perdió en un
     merge): se avisa en la consola, pero se dibuja igual que siempre, como
     tabla si trae filas. Mejor una sección que se ve rara que una que
     desaparece sin que nadie se entere. Tipo nuevo → agregarlo aquí. */
  const TIPOS = {
    tabla:    (s) => !(s.filas || []).length,
    resumen:  (s) => !(s.filas || []).length,
    graficas: graficasVacia,
    paneles:  (s) => !(s.items || []).length
  };
  const tipoDe = (s) => s.tipo == null ? 'tabla' : s.tipo;
  const conocido = (s) => Object.prototype.hasOwnProperty.call(TIPOS, tipoDe(s));
  const vacia = (s) => (conocido(s) ? TIPOS[tipoDe(s)] : TIPOS.tabla)(s);

  // Banderas dibujadas en SVG: Windows no pinta los emojis de bandera.
  const BANDERA = {
    GT: '<svg width="22" height="15" viewBox="0 0 22 15"><rect width="22" height="15" fill="#fff"/><rect width="7.33" height="15" fill="#4997d0"/><rect x="14.67" width="7.33" height="15" fill="#4997d0"/></svg>',
    SV: '<svg width="22" height="15" viewBox="0 0 22 15"><rect width="22" height="15" fill="#fff"/><rect width="22" height="5" fill="#0f47af"/><rect y="10" width="22" height="5" fill="#0f47af"/></svg>'
  };

  /* Seccion 'paneles': una caja por operacion, lado a lado. Informa, no
     juzga: sin meta ni semaforo, porque no todo tablero tiene una meta.
       { tipo:'paneles', titulo:'...', items:[{
           bandera:'GT'|'SV', nombre, sub, pct:0-100, pctTexto, pctSub,
           pieIzq, pieDer }] } */
  function panelesHTML(s, n) {
    const cajas = (s.items || []).map(it => {
      const pct = Math.max(0, Math.min(Number(it.pct) || 0, 100));
      return `
      <div class="op">
        <div class="op-top">
          <div>
            <div class="op-nom">${BANDERA[it.bandera] || ''}${esc(it.nombre)}</div>
            <div class="op-sub">${esc(it.sub)}</div>
          </div>
          <div>
            <div class="op-pct">${esc(it.pctTexto != null ? it.pctTexto : pct.toFixed(1) + ' %')}</div>
            <div class="op-pct-sub">${esc(it.pctSub || '')}</div>
          </div>
        </div>
        <div class="op-barra"><i style="width:${pct}%;"></i></div>
        <div class="op-pie"><span>${esc(it.pieIzq || '')}</span><span>${esc(it.pieDer || '')}</span></div>
      </div>`;
    }).join('');
    return `
    <h2>${n}. ${esc(s.titulo)}</h2>
    <div class="ops">${cajas}
    </div>`;
  }

  // Dona y barras: mismo HTML y mismo cálculo que «Fondos facturados vs.
  // cobrados» y «Facturación por mes» de Facturación por Línea.
  function graficasHTML(s, n) {
    const d = s.dona || {}, b = s.barras || {};
    const partes = d.partes || [];
    const total = partes.reduce((a, p) => a + Math.max(dato(p.valor), 0), 0);
    const pctOf = (v) => total > 0 ? Math.round((v / total) * 100) : 0;

    const circ = 2 * Math.PI * 38;
    let off = 0;
    let donut = '';
    partes.forEach(p => {
      const val = Math.max(dato(p.valor), 0);
      if (val > 0 && total > 0) {
        const dash = Math.min(val / total, 1) * circ;
        donut += `<circle cx="50" cy="50" r="38" fill="none" stroke="${esc(p.color)}" stroke-width="13" stroke-dasharray="${dash} ${circ}" stroke-dashoffset="-${off}" />`;
        off += dash;
      }
    });
    if (!donut) donut = '<circle cx="50" cy="50" r="38" fill="none" stroke="#e8eaf0" stroke-width="13" />';
    const centro = d.centro || {};
    const leyenda = partes.map(p => `
            <li><span class="dot" style="background:${esc(p.color)};"></span>${esc(p.etiqueta)}: <b>${esc(p.monto != null ? p.monto : p.valor)}</b> (${pctOf(Math.max(dato(p.valor), 0))}%)</li>`).join('')
      + [].concat(d.pie || []).map(t => `
            <li style="color:#8b909e;">${esc(t)}</li>`).join('');

    const items = b.items || [];
    const maxItem = Math.max(...items.map(x => dato(x.valor)), 1);
    const barras = items.length
      ? items.map((it, i) => `
          <div class="bar">
            <label>${esc(it.etiqueta)}</label>
            <div class="track"><div class="fill" style="width:${dato(it.valor) > 0 ? Math.max((dato(it.valor) / maxItem) * 100, 3) : 0}%;background:${PALETA[i % PALETA.length]};"></div></div>
            <b>${esc(it.texto != null ? it.texto : it.valor)}</b>
          </div>${it.sub ? `
          <div class="bar-sub">${esc(it.sub)}</div>` : ''}`).join('')
      : '<div class="bar-sub" style="margin-left:0;">Sin datos en el período</div>';

    const soloDona = !items.length;
    return `
    <h2>${n}. ${esc(s.titulo)}</h2>
    <div class="${soloDona ? 'solo' : 'grid2'}">
      <div class="box">
        <h3>${esc(d.titulo)}</h3>${d.hint ? `
        <p class="hint">${esc(d.hint)}</p>` : ''}
        <div class="sit">
          <svg width="130" height="130" viewBox="0 0 100 100">
            <g transform="rotate(-90 50 50)">${donut}</g>
            <text x="50" y="52" text-anchor="middle" font-size="15" font-weight="800" fill="#151821">${esc(centro.valor)}</text>
            <text x="50" y="62" text-anchor="middle" font-size="6" fill="#8b909e">${esc(centro.etiqueta)}</text>
          </svg>
          <ul>${leyenda}
          </ul>
        </div>
      </div>
      ${soloDona ? '' : `<div class="box">
        <h3>${esc(b.titulo)}</h3>
        ${barras}
      </div>`}
    </div>`;
  }

  // Texto visible de una celda (para revisar columnas vacías o repetidas).
  const textoCelda = (c) => {
    if (c == null) return '';
    if (typeof c !== 'object') return String(c).trim();
    if (c.texto != null) return String(c.texto).trim();
    if (c.html != null) return String(c.html).replace(/<[^>]*>/g, '').trim();
    return '';
  };
  const esDetalle = (s) => s.tipo !== 'graficas' && s.tipo !== 'resumen' && s.tipo !== 'paneles';
  const NOWRAP_MAX = 12;   // columnas de texto corto: no se parten en dos renglones

  /* Tabla de detalle: se revisa cada columna contra las filas que se van a
     exportar, cada vez que se genera el reporte (con otros filtros vuelven):
     · vacía en todas las filas → no se pinta;
     · mismo valor en todas las filas → no se pinta y pasa a los filtros del
       encabezado.
     Las dos cosas se anotan bajo el título, para que nada se esconda callado.
     ocultarColumnas: false en la sección lo desactiva. */
  function prepararDetalle(s) {
    const cols = s.columnas || [], filas = s.filas || [];
    const vals = cols.map((c, i) => filas.map(f => textoCelda(f[i])));
    const vacias = [], constantes = [];
    let quedan = cols.map((c, i) => i);
    if (s.ocultarColumnas !== false && filas.length) {
      quedan = quedan.filter(i => {
        const v = vals[i];
        if (v.every(x => x === '')) { vacias.push(cols[i].titulo); return false; }
        if (filas.length > 1 && v.every(x => x === v[0])) { constantes.push({ etiqueta: cols[i].titulo, valor: v[0] }); return false; }
        return true;
      });
      if (!quedan.length) { quedan = cols.map((c, i) => i); vacias.length = 0; constantes.length = 0; }
    }
    const notas = [
      s.nota,
      vacias.length && `Sin datos en esta selección: ${vacias.join(', ')}`,
      constantes.length && `Igual en todas las filas (va en los filtros del encabezado): ${constantes.map(c => c.etiqueta).join(', ')}`
    ].filter(Boolean);
    const columnas = quedan.map(i => {
      const c = cols[i];
      const libre = /(^|\s)com(\s|$)/.test(c.clase || '');
      const corta = !libre && Math.max(0, ...vals[i].map(x => x.length)) <= NOWRAP_MAX;
      return { ...c, clase: [c.clase, corta && 'nw'].filter(Boolean).join(' ') };
    });
    const elegir = (f) => quedan.map(i => f[i]);
    return {
      seccion: { ...s, columnas, filas: filas.map(elegir), total: s.total && elegir(s.total), notas, detalle: true },
      constantes
    };
  }

  function seccionHTML(s, n) {
    if (s.tipo === 'graficas') return graficasHTML(s, n);
    if (s.tipo === 'paneles') return panelesHTML(s, n);
    const cols = s.columnas || [];
    const th = cols.map(c => {
      const a = ALIGN[c.align || 'l'];
      return `<th${a ? ` class="${a}"` : ''}>${esc(c.titulo)}</th>`;
    }).join('');
    const filas = (s.filas || []).map(f => `
          <tr>${f.map((c, i) => celda(c, cols[i] || {}, false)).join('')}</tr>`).join('');
    const total = s.total ? `
          <tr class="tot">${s.total.map((c, i) => celda(c, cols[i] || {}, true)).join('')}</tr>` : '';
    const notas = (s.notas || []).length ? `
    <div class="filtro nota">${s.notas.map(esc).join(' · ')}</div>` : '';
    return `
    <h2>${n}. ${esc(s.titulo)}</h2>${notas}
    <table${s.detalle ? ' class="det"' : ''}>
      <thead>
        <tr>${th}</tr>
      </thead>
      <tbody>${filas}${total}</tbody>
    </table>`;
  }

  /* ---- Descarga directa del PDF ----
     Misma técnica y mismas librerías (mismas versiones) que
     assets/js/dashboard-pdf.js: html2canvas fotografía cada página y jsPDF
     las junta en un A4 horizontal. El reporte se escribe en un iframe
     invisible de la página del tablero, igual que downloadReport() de
     dashboard-pdf.js; las páginas se arman con copias de sus bloques y, si
     algo falla, vuelve el reporte tal cual y el iframe imprime como antes. */
  const VERSION = '2026-10-26 · iframe en la página';
  const HTML2CANVAS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const PDF_CAPTURE_SCALE = 3;
  const PDF_IMAGE_QUALITY = 0.97;
  // A4 horizontal menos el margen de 10 mm de @page, en px CSS (96 por pulgada).
  const PDF_MARGEN_MM = 10;
  const PX_POR_MM = 96 / 25.4;
  const PAG_W = Math.floor((297 - 2 * PDF_MARGEN_MM) * PX_POR_MM);   // 1046
  const PAG_H = Math.floor((210 - 2 * PDF_MARGEN_MM) * PX_POR_MM);   // 718
  const FILAS_JUNTAS = 2;   // al partir una tabla: filas mínimas con el título y al final
  let enCurso = false;      // hay un PDF generándose (evita el doble clic)

  // canvasToBlob, blobToDataUrl, renderPdfPage, loadScript y waitForImages: copiados de dashboard-pdf.js.
  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo codificar una página del PDF.'));
      }, 'image/jpeg', PDF_IMAGE_QUALITY);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('No se pudo preparar la imagen de una página del PDF.'));
      };
      reader.onerror = () => reject(new Error('No se pudo leer la imagen de una página del PDF.'));
      reader.readAsDataURL(blob);
    });
  }

  async function renderPdfPage(win, page, pageNumber) {
    let lastError;
    for (const scale of [PDF_CAPTURE_SCALE, 2]) {
      let canvas;
      try {
        canvas = await win.html2canvas(page, {
          scale,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          width: PAG_W,
          windowWidth: PAG_W,
          scrollX: 0,
          scrollY: 0
        });
        const imageBlob = await canvasToBlob(canvas);
        return { canvas, imageData: await blobToDataUrl(imageBlob) };
      } catch (error) {
        lastError = error;
        if (canvas) {
          canvas.width = 1;
          canvas.height = 1;
        }
        if (scale !== 2) {
          console.warn(`Se reintentará la página ${pageNumber} del PDF con una escala más ligera.`, error);
        }
      }
    }
    throw new Error(`No se pudo renderizar la página ${pageNumber} del PDF: ${lastError.message}`);
  }

  function loadScript(doc, src, isAvailable) {
    if (isAvailable()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = doc.createElement('script');
      script.src = src;
      script.onload = () => {
        if (isAvailable()) resolve();
        else reject(new Error(`La biblioteca no quedó disponible después de cargar: ${src}`));
      };
      script.onerror = () => reject(new Error(`No se pudo cargar la biblioteca para generar el PDF: ${src}`));
      doc.head.appendChild(script);
    });
  }

  function loadPdfLibraries(doc) {
    return Promise.all([
      loadScript(doc, HTML2CANVAS_URL, () => typeof doc.defaultView.html2canvas === 'function'),
      loadScript(doc, JSPDF_URL, () => Boolean(doc.defaultView.jspdf && doc.defaultView.jspdf.jsPDF))
    ]);
  }

  // El logo que no cargó por ninguna ruta queda escondido: no se espera.
  function waitForImages(doc) {
    return Promise.all(Array.from(doc.images).map(image => {
      if (!image.src || image.src === 'about:blank' || image.style.display === 'none') return Promise.resolve();
      if (image.complete) {
        return image.naturalWidth > 0
          ? Promise.resolve()
          : Promise.reject(new Error(`No se pudo cargar una imagen del reporte: ${image.src}`));
      }
      return new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', () => reject(new Error(`No se pudo cargar una imagen del reporte: ${image.src}`)), { once: true });
      });
    }));
  }

  // «RRHH» + «ACCIONES DE PERSONAL» → rrhh-acciones-de-personal-2026-10-23.pdf
  const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  function nombreArchivo(cfg, fecha) {
    const base = slug([cfg.area, cfg.subarea].filter(Boolean).join(' ')) || slug(cfg.titulo) || 'reporte-red-intelfon';
    const dia = [fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()].map(n => String(n).padStart(2, '0')).join('-');
    return `${base}-${dia}.pdf`;
  }

  /* Reparte copias de los bloques del reporte en páginas de PAG_W × PAG_H,
     como lo haría la impresión: tarjetas, cajas y gráficas no se parten; un
     título (y su nota gris) no se queda solo al pie; una tabla larga se parte
     entre filas, con su encabezado en cada página y las mismas columnas, y
     sin dejar menos de FILAS_JUNTAS filas arriba o abajo (la fila TOTAL no
     queda sola). */
  function paginar(doc, cont) {
    const body = doc.body;
    const bloques = Array.from(body.children).filter(el => el !== cont && !/^(SCRIPT|STYLE)$/.test(el.tagName));
    const tablasDe = (el) => el.tagName === 'TABLE' ? [el] : Array.from(el.querySelectorAll('table'));
    // Anchos medidos con el reporte ya a ancho de página: un trozo de tabla
    // conserva las columnas de la tabla entera.
    const copias = bloques.map(b => {
      const c = b.cloneNode(true);
      const copiasT = tablasDe(c);
      tablasDe(b).forEach((t, i) => {
        if (!t.tHead || !t.tHead.rows.length) return;
        const anchos = Array.from(t.tHead.rows[0].cells).map(th => th.getBoundingClientRect().width);
        copiasT[i].style.tableLayout = 'fixed';
        Array.from(copiasT[i].tHead.rows[0].cells).forEach((th, j) => { th.style.width = anchos[j] + 'px'; });
      });
      return c;
    });

    /* Páginas 2 en adelante, como en Facturación (paginateReport() de
       dashboard-pdf.js): arriba un encabezado chico con el logo, el título y
       el rótulo de área; abajo un pie con la fecha de emisión y «Página X de
       Y». Los textos salen del encabezado grande del reporte. El encabezado
       chico entra en la medida de cada página y el pie tiene su espacio
       reservado (padding), así no tapan contenido. */
    const cabeza = body.querySelector('.header');
    const textoDe = (sel) => {
      const el = cabeza && cabeza.querySelector(sel);
      return el ? el.textContent.trim() : '';
    };
    const emision = textoDe('.head-right b');
    const cabecera = doc.createElement('div');
    cabecera.className = 'pdf-cabecera';
    const barra = doc.createElement('span');
    barra.className = 'pdf-cabecera-barra';
    cabecera.appendChild(barra);
    const logo = cabeza && cabeza.querySelector('.logo');
    if (logo && logo.style.display !== 'none') {
      const logoChico = logo.cloneNode(true);
      logoChico.removeAttribute('id');
      logoChico.className = 'pdf-cabecera-logo';
      cabecera.appendChild(logoChico);
    }
    const textos = doc.createElement('div');
    textos.className = 'pdf-cabecera-textos';
    [['pdf-cabecera-titulo', textoDe('.title')], ['pdf-cabecera-rotulo', textoDe('.eyebrow')]].forEach(([clase, texto]) => {
      if (!texto) return;
      const span = doc.createElement('span');
      span.className = clase;
      span.textContent = texto;
      textos.appendChild(span);
    });
    cabecera.appendChild(textos);
    const esCabecera = (el) => el.classList.contains('pdf-cabecera');
    const contenido = (p) => Array.from(p.children).filter(el => !esCabecera(el));

    const paginas = [];
    let pag;
    const nueva = () => {
      pag = doc.createElement('div');
      pag.className = 'pdf-pag';
      if (paginas.length) {
        pag.classList.add('pdf-pag-sig');
        pag.appendChild(cabecera.cloneNode(true));
      }
      cont.appendChild(pag);
      paginas.push(pag);
    };
    const cabe = () => pag.offsetHeight <= PAG_H;
    const esTitulo = (el) => el.tagName === 'H2' || el.classList.contains('nota');
    // Página nueva; se lleva los títulos que quedaron colgando al pie.
    const saltar = () => {
      const sueltos = [];
      for (let el = pag.lastElementChild; el && esTitulo(el); el = el.previousElementSibling) sueltos.unshift(el);
      if (sueltos.length === contenido(pag).length) sueltos.length = 0;
      nueva();
      sueltos.forEach(el => pag.appendChild(el));
    };
    const soloTitulos = (salvo) => contenido(pag).every(el => el === salvo || esTitulo(el));

    function partirTabla(t) {
      const filas = Array.from(t.tBodies).flatMap(tb => Array.from(tb.rows));
      // Posición en su tbody: cada trozo sigue el cebreado tr:nth-child(even) de la tabla entera.
      const posicion = new Map(filas.map(f => [f, f.sectionRowIndex]));
      const molde = t.cloneNode(true);
      Array.from(molde.tBodies).forEach(tb => tb.remove());
      t.remove();
      let i = 0;
      while (i < filas.length) {
        const trozo = molde.cloneNode(true);
        const tb = doc.createElement('tbody');
        if (posicion.get(filas[i]) % 2) {
          const relleno = doc.createElement('tr');
          relleno.style.display = 'none';
          tb.appendChild(relleno);
        }
        trozo.appendChild(tb);
        pag.appendChild(trozo);
        let n = 0;
        while (i + n < filas.length) {
          tb.appendChild(filas[i + n]);
          if (!cabe()) { filas[i + n].remove(); break; }
          n++;
        }
        // No entran ni las primeras filas: la tabla (con su título) empieza en la página siguiente.
        if (n < Math.min(FILAS_JUNTAS, filas.length - i) && !soloTitulos(trozo)) {
          trozo.remove();
          saltar();
          continue;
        }
        if (n === 0) { tb.appendChild(filas[i]); n = 1; }   // fila más alta que una página
        const quedan = filas.length - i - n;
        if (quedan > 0 && quedan < FILAS_JUNTAS) {
          const k = Math.min(FILAS_JUNTAS - quedan, n - 1);
          for (let j = 0; j < k; j++) tb.lastElementChild.remove();
          n -= k;
        }
        i += n;
        if (i < filas.length) nueva();
      }
    }

    nueva();
    copias.forEach(b => {
      pag.appendChild(b);
      if (cabe()) return;
      if (b.tagName === 'TABLE' && b.tBodies.length) return partirTabla(b);
      // Si ni sola en su página entra, va igual y se achica al pasarla al PDF.
      if (!soloTitulos(b)) { b.remove(); saltar(); pag.appendChild(b); }
    });
    const hechas = paginas.filter(p => contenido(p).length);
    hechas.forEach((p, i) => {
      if (!i) return;
      const pie = doc.createElement('div');
      pie.className = 'pdf-pie-pag';
      pie.innerHTML = `<span class="pdf-pie-emision">Fecha de Emisión: ${esc(emision)}</span><span class="pdf-pie-numero">Página ${i + 1} de ${hechas.length}</span>`;
      p.appendChild(pie);
    });
    return hechas;
  }

  // Captura vacía: sin tamaño, o una muestra reducida de píxeles toda del mismo color.
  function capturaVacia(canvas) {
    if (!canvas || !canvas.width || !canvas.height) return true;
    const muestra = canvas.ownerDocument.createElement('canvas');
    muestra.width = 200;
    muestra.height = 140;
    const ctx = muestra.getContext('2d');
    ctx.drawImage(canvas, 0, 0, muestra.width, muestra.height);
    const px = ctx.getImageData(0, 0, muestra.width, muestra.height).data;
    for (let i = 4; i < px.length; i += 4) {
      if (Math.abs(px[i] - px[0]) > 8 || Math.abs(px[i + 1] - px[1]) > 8 || Math.abs(px[i + 2] - px[2]) > 8) return false;
    }
    return true;
  }

  /* Avance en la ventana de exportar del tablero (#pdfModalBg, la misma en
     SAC, RRHH, Marketing y Flash), al pie, debajo de los botones:
     «Descargando PDF...» en rojo; cada paso va a la consola. El tablero cierra esa ventana al volver de
     generarReportePDF(); se vuelve a abrir mientras dura, con el botón de
     descargar deshabilitado. Si falla, el error queda escrito en rojo y la
     ventana no se cierra. Cada línea va también a la consola. */
  function panelAvance() {
    const modal = document.getElementById('pdfModalBg');
    const pie = modal && modal.querySelector('.pdfx-pie');
    const boton = document.getElementById('pdfxGenerar');
    const anterior = document.getElementById('reportePdfAvance');
    if (anterior) anterior.remove();
    let panel = null, titulo = null, lista = null;
    if (pie) {
      if (!document.getElementById('reportePdfAvanceCss')) {
        const css = document.createElement('style');
        css.id = 'reportePdfAvanceCss';
        // Renglón propio al final del pie (es flex con wrap): no mueve lo que ya está.
        css.textContent = `
          .pdfx-pie > .reporte-pdf-avance { flex: 1 0 100%; font-size: 11px; line-height: 1.55; color: var(--pdfx-tinta-2); }
          .reporte-pdf-avance p { margin: 0 0 2px; }
          .reporte-pdf-avance ol { margin: 0; padding: 0; list-style: none; font-family: Consolas, ui-monospace, monospace; }
          .reporte-pdf-avance .rp-rojo { color: var(--pdfx-rojo); font-weight: 700; }`;
        document.head.appendChild(css);
      }
      panel = document.createElement('div');
      panel.id = 'reportePdfAvance';
      panel.className = 'reporte-pdf-avance';
      panel.setAttribute('role', 'status');
      titulo = document.createElement('p');
      titulo.className = 'rp-rojo';
      titulo.textContent = 'Descargando PDF...';
      lista = document.createElement('ol');
      panel.append(titulo, lista);
      pie.appendChild(panel);
      modal.classList.add('open');
      if (boton) boton.disabled = true;
    }
    const agregar = (texto, rojo) => {
      if (!lista) return;
      const li = document.createElement('li');
      li.textContent = texto;
      if (rojo) li.className = 'rp-rojo';
      lista.appendChild(li);
    };
    return {
      // El avance va solo a la consola; a la vista queda «Descargando PDF...» (y el error, si falla).
      linea(texto) {
        console.log(`[reporte-pdf] ${texto}`);
      },
      error(err) {
        console.error('[reporte-pdf] No se pudo descargar el PDF; se abre la ventana de imprimir como antes.', err);
        if (titulo) titulo.textContent = 'No se pudo descargar el PDF';
        agregar(`Error: ${(err && err.message) || err}`, true);
        agregar('Se abre la ventana de imprimir como respaldo.');
        if (boton) boton.disabled = false;
      },
      cerrar() {
        if (panel) panel.remove();
        if (boton) boton.disabled = false;
        if (modal) modal.classList.remove('open');
      }
    };
  }

  /* Nombres de los módulos tildados en la ventana de exportar del tablero
     (#pdfModalBg, la misma en los cuatro): cada .pdfx-op visible con su
     casilla marcada, el nombre en su <strong>. Si no hay ventana o no se
     puede leer, devuelve [] y la franja «Módulos incluidos» no se pinta. */
  function modulosMarcados() {
    try {
      return Array.from(document.querySelectorAll('#pdfModalBg #pdfxModulos .pdfx-op'))
        .filter(op => !op.hidden && op.querySelector('input[type="checkbox"]:checked'))
        .map(op => {
          const nombre = op.querySelector('.pdfx-texto strong');
          return nombre ? nombre.textContent.trim() : '';
        })
        .filter(Boolean);
    } catch (error) {
      console.warn('[reporte-pdf] No se pudieron leer los módulos marcados; el PDF va sin la franja «Módulos incluidos».', error);
      return [];
    }
  }

  // El iframe de downloadReport() de dashboard-pdf.js, con nombre para pedirlo con window.open.
  function crearMarco() {
    const frame = document.createElement('iframe');
    frame.name = 'reportePdfMarco' + Date.now();
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = `position:fixed;left:0;top:0;width:${PAG_W}px;height:800px;border:0;opacity:0;z-index:-1;pointer-events:none;`;
    document.body.appendChild(frame);
    return frame;
  }

  /* downloadReport() de dashboard-pdf.js, paso por paso, sobre el iframe donde
     ya está escrito (y retocado) el reporte. Lo propio: paginar() en lugar de
     paginateReport(), el control de captura vacía y las líneas de avance.
     Si falla, el reporte vuelve tal cual al iframe (para imprimirlo). */
  async function descargarPDF(frame, filename, waitLogo, avance) {
    const doc = frame.contentDocument;
    if (!doc) throw new Error('No se pudo preparar el documento del PDF.');
    await new Promise(resolve => {
      if (doc.readyState === 'complete') resolve();
      else frame.addEventListener('load', resolve, { once: true });
    });
    await waitLogo(doc);
    avance.linea(`Reporte armado: ${doc.body.children.length} bloques`);

    const originales = Array.from(doc.body.childNodes);
    const estilo = doc.createElement('style');
    estilo.textContent = `
      body.pdf-gen { margin: 0; width: ${PAG_W}px; background: #fff; }
      .pdf-pag { position: relative; display: flow-root; width: ${PAG_W}px; background: #fff; overflow: hidden; }
      .pdf-pag > :first-child, .pdf-cabecera + * { margin-top: 0; }
      /* Páginas 2+: mismos estilos que .pdf-running-header y .pdf-page-number de dashboard-pdf.js. */
      .pdf-pag-sig { padding-bottom: 30px; }
      .pdf-cabecera { display: flex; align-items: center; gap: 10px; min-height: 36px; margin: 0 0 10px; padding: 0 2px 7px; border-bottom: 2px solid #e8ebf0; font-family: Arial, Helvetica, sans-serif; }
      .pdf-cabecera-barra { width: 5px; height: 25px; flex: 0 0 5px; border-radius: 5px; background: #ed174c; }
      .pdf-cabecera-logo { width: 26px; height: 26px; flex: 0 0 26px; object-fit: contain; }
      .pdf-cabecera-textos { display: flex; flex: 1; flex-direction: column; min-width: 0; gap: 2px; }
      .pdf-cabecera-titulo { overflow: hidden; color: #1d273a; font-size: 9px; font-weight: 800; letter-spacing: .11em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
      .pdf-cabecera-rotulo { overflow: hidden; color: #697586; font-size: 7px; line-height: 1.3; letter-spacing: .08em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
      .pdf-pie-pag { position: absolute; left: 0; right: 0; bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 6px; border-top: 1px solid #e0e5ed; color: #778294; font-family: Arial, Helvetica, sans-serif; font-size: 7px; }
      .pdf-pie-pag::before { content: ""; width: 44px; height: 3px; flex: 0 0 44px; border-radius: 3px; background: #ed174c; }
      .pdf-pie-emision { flex: 1; }
      .pdf-pie-numero { color: #1d273a; font-weight: 700; text-align: right; }`;
    doc.head.appendChild(estilo);
    doc.body.classList.add('pdf-gen');
    try {
      await waitForImages(doc);
      const cont = doc.createElement('div');
      doc.body.appendChild(cont);
      const pages = paginar(doc, cont);
      if (!pages.length) throw new Error('El reporte no tiene contenido para exportar.');
      pages.forEach(page => { page.style.height = Math.max(PAG_H, page.offsetHeight) + 'px'; });
      doc.body.replaceChildren(...pages);
      avance.linea(`Páginas armadas: ${pages.length}`);
      await waitForImages(doc);
      if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
      await loadPdfLibraries(doc);
      avance.linea('Librerías cargadas');

      const { jsPDF } = frame.contentWindow.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = PDF_MARGEN_MM;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      for (let index = 0; index < pages.length; index++) {
        const { canvas, imageData } = await renderPdfPage(frame.contentWindow, pages[index], index + 1);
        avance.linea(`Capturando página ${index + 1} de ${pages.length}... canvas ${canvas.width} x ${canvas.height}`);
        // Mejor la ventana de imprimir que un PDF en blanco.
        if (capturaVacia(canvas)) {
          const detalle = `canvas ${canvas.width} x ${canvas.height}, página ${pages[index].offsetWidth} x ${pages[index].offsetHeight} px`;
          canvas.width = 1;
          canvas.height = 1;
          throw new Error(`La captura de la página ${index + 1} salió en blanco (${detalle}).`);
        }
        if (index > 0) pdf.addPage();
        const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
        const imageWidth = canvas.width * scale;
        const imageHeight = canvas.height * scale;
        const x = (pageWidth - imageWidth) / 2;
        const y = (pageHeight - imageHeight) / 2;
        try {
          pdf.addImage(imageData, 'JPEG', x, y, imageWidth, imageHeight, undefined, 'FAST');
        } finally {
          canvas.width = 1;
          canvas.height = 1;
        }
      }

      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = pdfUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
      avance.linea(`PDF generado: ${pages.length} ${pages.length === 1 ? 'página' : 'páginas'} (${filename})`);
    } catch (error) {
      doc.body.replaceChildren(...originales);
      estilo.remove();
      doc.body.classList.remove('pdf-gen');
      throw error;
    }
  }

  function generarReportePDF(config) {
    const cfg = config || {};
    // Ya se está generando uno: no se abre otro.
    if (enCurso) return false;
    const tarjetas = cfg.tarjetas || [];
    // 0 tarjetas es una decisión (el reporte va sin resumen ejecutivo); 1–3 o
    // más de 4 suele ser un descuido: la fila está pensada para 4.
    if (tarjetas.length && tarjetas.length !== 4) console.warn(`[reporte-pdf] Llegaron ${tarjetas.length} tarjetas; el resumen ejecutivo está pensado para 4 (o ninguna, si no se quiere). Revisá si falta o sobra alguna.`);

    /* La «ventana» del reporte es un iframe invisible de esta página. Se pide
       con window.open('', nombre del iframe): el navegador devuelve ese iframe
       en vez de abrir una pestaña, y los tableros que envuelven window.open
       (Marketing, RRHH, Flash) lo retocan como antes. Si un navegador abre
       una pestaña de todos modos, se cierra y se usa el iframe sin retoques. */
    const frame = crearMarco();
    let printWin = window.open('', frame.name);
    let marcoAjeno = false;
    if (printWin && printWin !== frame.contentWindow) {
      printWin.close();
      printWin = frame.contentWindow;
      marcoAjeno = true;
    }
    // Ventana bloqueada: no se imprime nada (imprimir el tablero sería peor);
    // se avisa con onBloqueado(mensaje) o, si el tablero no lo pasa, con alert.
    if (!printWin) {
      frame.remove();
      const msg = 'El navegador bloqueó la ventana del reporte. Permití las ventanas emergentes para este sitio '
        + '(ícono a la derecha de la barra de direcciones) y volvé a hacer clic en PDF.';
      if (typeof cfg.onBloqueado === 'function') cfg.onBloqueado(msg);
      else alert(msg);
      return false;
    }

    // Rutas absolutas del logo (la ventana nueva es about:blank, una ruta relativa no resolvería)
    const baseHref = document.baseURI;
    const logoCandidates = [
      cfg.logo,
      scriptSrc && new URL('../img/logo-intelfon.png', scriptSrc).href,
      new URL('../../assets/img/logo-intelfon.png', baseHref).href,
      new URL('assets/img/logo-intelfon.png', baseHref).href,
      new URL('/assets/img/logo-intelfon.png', baseHref).href
    ].filter(Boolean);

    const ahora = new Date();
    const fechaEmision = ahora.toLocaleDateString('es-SV', { year: 'numeric', month: 'long', day: 'numeric' })
      + ' a las ' + ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });

    // Solo a la consola: el PDF es para la reunión, no para el programador.
    (cfg.secciones || []).forEach(s => {
      if (s && !conocido(s)) console.warn(
        `[reporte-pdf] La sección «${s.titulo || 'sin título'}» tiene tipo "${s.tipo}", que no existe ` +
        `(tipos válidos: ${Object.keys(TIPOS).join(', ')}). ` +
        (vacia(s) ? 'No trae filas: no aparece en el reporte.' : 'Se dibuja como tabla.'));
    });

    // Detalles: fuera columnas vacías; las repetidas pasan a los filtros.
    const extras = [];
    const listas = (cfg.secciones || []).filter(s => s && !vacia(s)).map(s => {
      if (!esDetalle(s)) return s;
      const p = prepararDetalle(s);
      p.constantes.forEach(c => { if (!extras.some(x => x.etiqueta === c.etiqueta && x.valor === c.valor)) extras.push(c); });
      return p.seccion;
    });

    const eyebrow = ['RED INTELFON', cfg.area, cfg.subarea].filter(Boolean).map(esc).join(' · ');
    const filtros = [...(cfg.filtros || []), ...extras].map(f => `${esc(f.etiqueta)}: <b>${esc(f.valor)}</b>`).join(' | ');
    const pill = cfg.pill ? `<div class="pill">${esc(cfg.pill.etiqueta)}: ${esc(cfg.pill.valor)}</div>` : '';
    // Franja «Módulos incluidos» (como en Facturación) con lo que el usuario marcó; si no se puede leer, no va.
    const modulos = modulosMarcados();
    const franjaModulos = modulos.length ? `
    <div class="module-summary"><b>Módulos incluidos:</b> ${modulos.map(esc).join(' · ')}</div>` : '';
    const cards = tarjetas.map(t => `
      <div class="card${t.acento ? ` ac" style="--ac:${esc(t.acento)};` : ''}"><div class="lbl">${esc(t.lbl)}</div><div class="num"${t.color ? ` style="color:${esc(t.color)};"` : ''}>${esc(t.num)}</div><div class="sub">${esc(t.sub)}</div></div>`).join('');
    // Numeración corrida: las secciones vacías no se pintan ni gastan número.
    let n = 0;
    const resumen = tarjetas.length ? `
    <h2>${++n}. Resumen ejecutivo</h2>
    <div class="cards4">${cards}
    </div>` : '';
    const secciones = listas.map(s => seccionHTML(s, ++n)).join('\n');

    const html = `<!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <base href="${esc(baseHref)}">
    <title>${esc(cfg.archivo || cfg.titulo || 'Reporte - RED Intelfon')}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 22px; color: #242837; font-size: 12px; }
      /* Encabezado con el formato del PDF de Facturación por Línea: banda
         oscura con barra roja, logo redondo y franja de módulos. Son los
         estilos de paginateReport() en dashboard-pdf.js (viven en un texto
         dentro de esa función, no en un .css que se pueda compartir).
         .filtro solo se toca dentro de .header: abajo es la nota gris de las tablas. */
      .header { position: relative; display: flex; justify-content: space-between; align-items: center; gap: 16px; min-height: 76px; margin: 0 0 10px; padding: 12px 16px 12px 20px; overflow: hidden; border-radius: 10px; background: #111a2c; color: #fff; font-family: Arial, Helvetica, sans-serif; }
      .header::before { content: ""; position: absolute; top: 10px; bottom: 10px; left: 8px; width: 5px; border-radius: 5px; background: #ed174c; }
      .head-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
      .head-left > div { min-width: 0; }
      .logo { width: 44px; height: 44px; max-width: 44px; flex: 0 0 44px; border: 2px solid #fff; border-radius: 50%; object-fit: cover; }
      .eyebrow { margin-bottom: 3px; font-size: 8px; font-weight: 700; letter-spacing: .18em; color: #d5dcea; text-transform: uppercase; }
      .title { margin: 0 0 3px; font-size: 17px; font-weight: 700; line-height: 1.2; color: #fff; }
      .filtro { font-size: 11px; color: #8b909e; }
      .header .filtro { font-size: 8px; line-height: 1.35; color: #d5dcea; overflow-wrap: anywhere; }
      .head-right { flex: 0 0 180px; text-align: right; font-size: 8px; line-height: 1.4; color: #d5dcea; }
      .pill { display: inline-block; margin-top: 4px; padding: 5px 10px; border-radius: 6px; background: #ed174c; color: #fff; font-weight: 800; font-size: 9px; }
      .module-summary { margin: 0 0 10px; padding: 6px 9px; border-left: 4px solid #ed174c; border-radius: 4px; background: #f1f4f8; color: #344054; font-family: Arial, Helvetica, sans-serif; font-size: 8px; page-break-inside: avoid; }
      h2 { font-size: 13px; text-transform: uppercase; margin: 16px 0 8px; color: #151821; border-bottom: 1px solid #e8eaf0; padding-bottom: 4px; }
      .cards4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
      .card { border: 1px solid #e8eaf0; border-radius: 8px; padding: 10px; text-align: center; background: #fff; page-break-inside: avoid; }
      /* Franja de color arriba: solo en las tarjetas que traen «acento». */
      .card.ac { position: relative; overflow: hidden; }
      .card.ac::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--ac); }
      .card .lbl { font-size: 10px; font-weight: 700; color: #8b909e; text-transform: uppercase; }
      .card .num { font-size: 22px; font-weight: 900; margin-top: 4px; }
      .card .sub { font-size: 10px; color: #8b909e; margin-top: 3px; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
      .box { border: 1px solid #e8eaf0; border-radius: 8px; padding: 12px 14px; page-break-inside: avoid; }
      .box h3 { font-size: 13px; margin: 0 0 8px; }
      .box .hint { font-size: 10px; color: #8b909e; margin: -6px 0 9px; }
      .solo { margin-top: 10px; }
      .solo .sit { justify-content: center; gap: 52px; }
      .ops { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
      .op { border: 1px solid #e8eaf0; border-left: 5px solid #151821; border-radius: 8px; padding: 12px 14px; background: #fff; page-break-inside: avoid; }
      .op-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .op-nom { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: #151821; }
      .op-nom svg { border: 1px solid rgba(15,17,23,.18); border-radius: 2px; display: block; }
      .op-sub { font-size: 10.5px; color: #8b909e; margin-top: 3px; }
      .op-pct { font-size: 30px; font-weight: 900; line-height: 1; text-align: right; color: #151821; }
      .op-pct-sub { text-align: right; font-size: 9.5px; color: #8b909e; margin-top: 4px; }
      .op-barra { height: 10px; border-radius: 99px; background: #e8eaf0; margin-top: 12px; overflow: hidden; }
      .op-barra i { display: block; height: 100%; border-radius: 99px; background: #2f8f76; }
      .op-pie { display: flex; justify-content: space-between; font-size: 9.5px; color: #8b909e; margin-top: 7px; }
      .sit { display: flex; align-items: center; gap: 18px; }
      .sit ul { list-style: none; margin: 0; padding: 0; line-height: 1.9; font-size: 12px; }
      .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
      .bar { display: grid; grid-template-columns: 52px 1fr 100px; align-items: center; gap: 10px; margin-top: 8px; font-size: 11px; }
      .bar label { font-weight: 800; }
      .bar b { text-align: right; }
      .track { height: 9px; border-radius: 99px; background: #e8eaf0; overflow: hidden; }
      .fill { height: 100%; border-radius: inherit; }
      .bar-sub { font-size: 10px; color: #8b909e; margin: 2px 0 0 62px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #151821; color: #fff; text-align: left; padding: 8px 10px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
      td { padding: 7px 10px; border-bottom: 1px solid #e8eaf0; }
      tr:nth-child(even) td { background: #e8eaf0; }
      tr.tot td { background: #151821 !important; color: #fff; font-weight: 800; }
      .c { text-align: center; } th.c { text-align: center; }
      .r { text-align: right; } th.r { text-align: right; }
      .com { font-size: 10px; color: #8b909e; max-width: 180px; word-wrap: break-word; }
      .mini { display: inline-block; width: 60px; height: 7px; background: #e8eaf0; border-radius: 99px; overflow: hidden; vertical-align: middle; margin-right: 6px; }
      .mini span { display: block; height: 100%; background: #3f9c85; }
      .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; }
      .b-ok { background: #dcfce7; color: #15803d; }
      .b-near { background: #fef3c7; color: #b45309; }
      .b-venc { background: #fee2e2; color: #c43c50; }
      .b-etapa { background: #ffedd5; color: #c2410c; }
      .b-fin { background: #e8eaf0; color: #8b909e; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      @media print { body { margin: 0; } }
      /* Agregado al CSS original: solo en las tablas de detalle, para que
         quepan más filas por página. Lo corto no se parte; el texto libre
         (.com) tiene ancho fijo y salta de renglón, sin puntos suspensivos. */
      .nota { margin: -4px 0 8px; }
      table.det td { padding: 5px 6px; }
      table.det th { padding: 6px 6px; }
      table.det td.com { min-width: 250px; max-width: 250px; }
      table.det .nw { white-space: nowrap; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="head-left">
        <img class="logo" id="logoImg" src="${esc(logoCandidates[0])}" alt="RED Intelfon" />
        <div>
          <div class="eyebrow">${eyebrow}</div>
          <div class="title">${esc(cfg.titulo)}</div>
          <div class="filtro">${filtros}</div>
        </div>
      </div>
      <div class="head-right">
        <div>Fecha de Emisión: <b>${esc(fechaEmision)}</b></div>
        ${pill}
      </div>
    </div>${franjaModulos}

${resumen}
${secciones}
  </body>
  </html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();

    // Esperar a que cargue el logo (probando rutas alternas) antes de imprimir
    const waitLogo = (doc) => new Promise((resolve) => {
      const img = doc.getElementById('logoImg');
      if (!img) return resolve();
      let idx = 0;
      if (img.complete && img.naturalWidth > 0) return resolve();
      img.addEventListener('load', () => resolve());
      img.addEventListener('error', () => {
        idx++;
        if (idx < logoCandidates.length) {
          img.src = logoCandidates[idx];
        } else {
          img.style.display = 'none';
          resolve();
        }
      });
      setTimeout(resolve, 3000);
    });
    /* Descarga en la tarea siguiente: para entonces el tablero ya retocó el
       reporte y cerró su ventana de exportar (panelAvance la vuelve a abrir).
       Si algo falla, el error queda en esa ventana y el iframe imprime como antes. */
    enCurso = true;
    setTimeout(() => {
      const avance = panelAvance();
      avance.linea(`reporte-pdf.js ${VERSION}`);
      if (marcoAjeno) avance.linea('Aviso: el navegador abrió una pestaña en vez del iframe; el PDF sale sin los retoques del tablero.');
      descargarPDF(frame, nombreArchivo(cfg, ahora), waitLogo, avance)
        .then(() => {
          frame.remove();
          setTimeout(avance.cerrar, 1500);
        })
        .catch(err => {
          avance.error(err);
          const win = frame.contentWindow;
          win.addEventListener('afterprint', () => frame.remove(), { once: true });
          win.focus();
          win.print();
        })
        .finally(() => { enCurso = false; });
    }, 0);
    return true;
  }

  generarReportePDF.esc = esc;
  window.generarReportePDF = generarReportePDF;
})();
