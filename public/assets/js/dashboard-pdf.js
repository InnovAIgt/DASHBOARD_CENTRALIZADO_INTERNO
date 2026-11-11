(function () {
  const HTML2CANVAS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const PDF_CAPTURE_SCALE = 3;
  const PDF_IMAGE_QUALITY = 0.97;

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
          width: 1062,
          windowWidth: 1062,
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  async function loadPdfLibraries(doc) {
    await Promise.all([
      loadScript(doc, HTML2CANVAS_URL, () => typeof doc.defaultView.html2canvas === 'function'),
      loadScript(doc, JSPDF_URL, () => Boolean(doc.defaultView.jspdf && doc.defaultView.jspdf.jsPDF))
    ]);
  }

  function waitForImages(doc) {
    return Promise.all(Array.from(doc.images).map(image => {
      if (!image.src || image.src === 'about:blank') return Promise.resolve();
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

  function inlineLocalImages(doc) {
    return Promise.all(Array.from(doc.images).map(async image => {
      const rawSrc = image.getAttribute('src') || image.src;
      if (!rawSrc || rawSrc.startsWith('data:') || rawSrc.startsWith('blob:')) {
        return;
      }

      let src = rawSrc;
      try {
        if (!src.startsWith('file:')) {
          src = new URL(src, doc.baseURI).href;
        }
      } catch (error) {
        throw new Error(`No se pudo resolver la imagen del reporte: ${rawSrc}`);
      }

      if (src.startsWith('file:')) {
        if (new URL(src).pathname.toLowerCase().endsWith('/logo-intelfon.png')) {
          const embeddedLogo = window.DASHBOARD_PDF_LOGO_DATA_URL;
          if (!embeddedLogo) {
            throw new Error('No se encontró el logo embebido necesario para exportar desde un archivo local.');
          }
          image.src = embeddedLogo;
          return;
        }
        throw new Error(`La imagen local no se puede incrustar en el PDF: ${src}`);
      }
    }));
  }

  function createPdfPage(doc, shell, header, moduleSummary, section) {
    const page = doc.createElement('div');
    page.className = 'pdf-export-page';
    page.appendChild(header.cloneNode(true));
    if (moduleSummary) page.appendChild(moduleSummary.cloneNode(true));
    page.appendChild(section);
    shell.appendChild(page);
    return page;
  }

  function paginateReport(doc) {
    const shell = doc.querySelector('.report-shell');
    const header = shell && shell.querySelector(':scope > .header');
    const moduleSummary = shell && shell.querySelector(':scope > .module-summary');
    if (!shell || !header) throw new Error('El reporte no tiene una estructura válida para exportar.');

    const style = doc.createElement('style');
    style.textContent = `
      body, .report-shell { background: #ffffff !important; color: #202a3b !important; font-family: Arial, Helvetica, sans-serif !important; }
      .pdf-export-page { position: relative; width: 1062px; min-height: 690px; margin: 0 auto; padding: 14px 16px 42px; box-sizing: border-box; overflow: hidden; background: #ffffff; color: #202a3b; font-family: Arial, Helvetica, sans-serif; }
      .pdf-export-page .header { position: relative; min-height: 76px; margin: 0 0 10px; padding: 12px 16px 12px 20px; gap: 16px; overflow: hidden; border: 0; border-radius: 10px; background: #111a2c !important; color: #ffffff !important; }
      .pdf-export-page .header::before { position: absolute; inset: 10px auto 10px 8px; width: 5px; border-radius: 5px; background: #ed174c; content: ""; }
      .pdf-export-page .pdf-running-header { display: flex; align-items: center; gap: 10px; min-height: 42px; margin: 0 0 12px; padding: 0 2px 8px; border-bottom: 2px solid #e8ebf0; }
      .pdf-export-page .pdf-running-logo { width: 26px; height: 26px; flex: 0 0 26px; object-fit: contain; }
      .pdf-export-page .pdf-running-copy { display: flex; flex: 1; flex-direction: column; min-width: 0; gap: 2px; }
      .pdf-export-page .pdf-running-title { overflow: hidden; color: #1d273a; font-size: 9px; font-weight: 800; letter-spacing: .11em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
      .pdf-export-page .pdf-running-filters { overflow: hidden; color: #697586; font-size: 7px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
      .pdf-export-page .pdf-running-accent { width: 5px; height: 25px; flex: 0 0 5px; margin-left: 1px; border-radius: 5px; background: #ed174c; }
      .pdf-export-page .head-left { gap: 12px; }
      .pdf-export-page .logo { width: 44px; height: 44px; max-width: 44px; flex: 0 0 44px; border: 2px solid #ffffff; border-radius: 50%; object-fit: cover; }
      .pdf-export-page .eyebrow { margin-bottom: 3px; color: #d5dcea !important; font-size: 8px; font-weight: 700; letter-spacing: .18em; }
      .pdf-export-page .title { margin: 0 0 3px; color: #ffffff !important; font-size: 17px; font-weight: 700; line-height: 1.2; }
      .pdf-export-page .filtro { color: #d5dcea !important; font-size: 8px; line-height: 1.35; }
      .pdf-export-page .head-right { flex-basis: 180px; color: #d5dcea !important; font-size: 8px; line-height: 1.4; }
      .pdf-export-page .pill { margin-top: 4px; padding: 5px 10px; border-radius: 6px; background: #ed174c !important; color: #ffffff !important; font-size: 9px; }
      .pdf-export-page .module-summary { margin: 0 0 10px; padding: 6px 9px; border: 0; border-left: 4px solid #ed174c; border-radius: 4px; background: #f1f4f8 !important; color: #344054 !important; font-size: 8px; }
      .pdf-export-page h2 { position: relative; margin: 10px 0 6px; padding: 2px 0 2px 13px; border: 0; color: #202a3b !important; font-size: 12px; font-weight: 700; letter-spacing: .01em; line-height: 1.35; }
      .pdf-export-page h2::before { position: absolute; inset: 0 auto 0 0; width: 4px; border-radius: 4px; background: #ed174c; content: ""; }
      .pdf-export-page .period-kpis { gap: 7px; }
      .pdf-export-page .period-kpi { min-height: 82px; padding: 9px 10px; border: 1px solid #e0e5ed; border-top: 4px solid #ed174c; border-radius: 7px; background: #ffffff !important; }
      .pdf-export-page .period-kpi:nth-child(1) { border-top-color: #ed174c !important; }
      .pdf-export-page .period-kpi:nth-child(2) { border-top-color: #187c58 !important; }
      .pdf-export-page .period-kpi:nth-child(3) { border-top-color: #13805c !important; }
      .pdf-export-page .period-kpi:nth-child(4) { border-top-color: #c42a50 !important; }
      .pdf-export-page .period-kpi:nth-child(5) { border-top-color: #118875 !important; }
      .pdf-export-page .period-kpi:nth-child(6) { border-top-color: #087f9b !important; }
      .pdf-export-page .period-kpi .lbl { color: #697586 !important; font-size: 7px; font-weight: 700; letter-spacing: .13em; }
      .pdf-export-page .period-kpi .num { margin-top: 6px; font-size: 16px; font-weight: 700; }
      .pdf-export-page .period-kpi:nth-child(1) .num { color: #ed174c !important; }
      .pdf-export-page .period-kpi:nth-child(2) .num { color: #187c58 !important; }
      .pdf-export-page .period-kpi:nth-child(3) .num { color: #13805c !important; }
      .pdf-export-page .period-kpi:nth-child(4) .num { color: #c42a50 !important; }
      .pdf-export-page .period-kpi:nth-child(5) .num { color: #118875 !important; }
      .pdf-export-page .period-kpi:nth-child(6) .num { color: #087f9b !important; }
      .pdf-export-page .period-kpi .sub { margin-top: 4px; color: #7b8797 !important; font-size: 7px; line-height: 1.35; }
      .pdf-export-page .grid2 { gap: 10px; margin-top: 8px; }
      .pdf-export-page .box { padding: 9px 11px; border: 1px solid #e5e9ef; border-radius: 6px; background: #ffffff !important; }
      .pdf-export-page .box h3 { margin-bottom: 6px; color: #202a3b !important; font-size: 10px; font-weight: 700; }
      .pdf-export-page .sit ul, .pdf-export-page .neg { color: #465164 !important; font-size: 9px; line-height: 1.65; }
      .pdf-export-page table { width: 100%; border-collapse: collapse; color: #344054; font-size: 8px; }
      .pdf-export-page th { padding: 6px 7px; background: #1d273a !important; color: #ffffff !important; font-size: 7px; font-weight: 700; letter-spacing: .04em; }
      .pdf-export-page td { padding: 5px 7px; border-bottom: 1px solid #e8ebf0; color: #344054; }
      .pdf-export-page tr:nth-child(even) td { background: #f5f7fa; }
      .pdf-export-page tr.tot td { background: #1d273a !important; color: #ffffff !important; }
      .pdf-export-page .bar, .pdf-export-page .country { color: #344054 !important; font-size: 9px; }
      .pdf-export-page .bar-sub, .pdf-export-page .country .sub { color: #7b8797 !important; font-size: 8px; }
      .pdf-export-page .country .pct { font-size: 20px; }
      .pdf-export-page .badge { font-size: 7px; }
      .pdf-export-page .b-ok { background: #e5f4ec; color: #14744a; }
      .pdf-export-page .b-near { background: #fff4df; color: #a86608; }
      .pdf-export-page .b-venc { background: #fde8ed; color: #c51f49; }
      .pdf-export-page .pdf-page-number { position: absolute; right: 16px; bottom: 12px; left: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0; padding-top: 7px; border-top: 1px solid #e0e5ed; color: #778294; font-size: 7px; }
      .pdf-export-page .pdf-page-number::before { width: 44px; height: 3px; flex: 0 0 44px; border-radius: 3px; background: #ed174c; content: ""; }
      .pdf-export-page .pdf-page-brand { flex: 1; color: #526078; font-weight: 700; }
      .pdf-export-page .pdf-page-generated { color: #778294; text-align: center; }
      .pdf-export-page .pdf-page-count { flex: 1; color: #1d273a; font-weight: 700; text-align: right; }
      .pdf-export-page table { width: 100%; }
      .pdf-export-page tr { break-inside: avoid; page-break-inside: avoid; }
    `;
    doc.head.appendChild(style);

    const sections = Array.from(shell.querySelectorAll(':scope > section[data-pdf-module]'));
    const pages = [];
    sections.forEach(section => {
      const tables = Array.from(section.querySelectorAll('table'));
      const longTable = tables.find(table => table.tBodies[0] && table.tBodies[0].rows.length > 20);
      if (!longTable || tables.length !== 1 || section.children.length > 2) {
        pages.push(createPdfPage(doc, shell, header, moduleSummary, section.cloneNode(true)));
        return;
      }

      const heading = section.querySelector('h2');
      const probeSection = section.cloneNode(false);
      if (heading) probeSection.appendChild(heading.cloneNode(true));
      probeSection.appendChild(longTable.cloneNode(true));
      const probePage = createPdfPage(doc, shell, header, moduleSummary, probeSection);
      Object.assign(probePage.style, {
        position: 'absolute',
        top: '0',
        left: '-10000px',
        minHeight: '0',
        height: 'auto',
        overflow: 'visible',
        visibility: 'hidden'
      });
      const probeHeader = probePage.querySelector('.header');
      const probeSummary = probePage.querySelector('.module-summary');
      const probeHeading = probePage.querySelector('h2');
      const probeTable = probePage.querySelector('table');
      const probeRows = Array.from(probeTable.tBodies[0].rows);
      const tableChromeHeight = (probeTable.tHead ? probeTable.tHead.getBoundingClientRect().height : 0)
        + (probeTable.tFoot ? probeTable.tFoot.getBoundingClientRect().height : 0);
      const availableHeight = 700
        - probeHeader.getBoundingClientRect().height
        - (probeSummary ? probeSummary.getBoundingClientRect().height + 12 : 0)
        - (probeHeading ? probeHeading.getBoundingClientRect().height + 16 : 0)
        - tableChromeHeight
        - 64;
      const rowHeights = probeRows.map(row => row.getBoundingClientRect().height);
      probePage.remove();

      let offset = 0;
      while (offset < probeRows.length) {
        let pageHeight = 0;
        let end = offset;
        while (end < probeRows.length && end - offset < 24) {
          const rowHeight = rowHeights[end] || 28;
          if (end > offset && pageHeight + rowHeight > availableHeight) break;
          pageHeight += rowHeight;
          end++;
          if (pageHeight >= availableHeight) break;
        }

        const sectionPage = section.cloneNode(false);
        if (heading) sectionPage.appendChild(heading.cloneNode(true));
        const tablePage = longTable.cloneNode(true);
        const body = tablePage.tBodies[0];
        body.replaceChildren(...Array.from(longTable.tBodies[0].rows)
          .slice(offset, end)
          .map(row => row.cloneNode(true)));
        sectionPage.appendChild(tablePage);
        pages.push(createPdfPage(doc, shell, header, moduleSummary, sectionPage));
        offset = end;
      }
    });

    shell.replaceChildren(...pages);
    const title = header.querySelector('.title')?.textContent.trim() || 'Reporte RED Intelfon';
    const filters = header.querySelector('.filtro')?.textContent.trim() || '';
    const generatedAt = new Date().toLocaleString('es-SV', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
    pages.forEach((page, index) => {
      if (index > 0) {
        const logo = header.querySelector('.logo');
        const runningHeader = doc.createElement('div');
        runningHeader.className = 'pdf-running-header';
        const accent = doc.createElement('span');
        accent.className = 'pdf-running-accent';
        runningHeader.appendChild(accent);
        if (logo) {
          const runningLogo = logo.cloneNode(true);
          runningLogo.className = 'pdf-running-logo';
          runningHeader.appendChild(runningLogo);
        }
        const copy = doc.createElement('div');
        copy.className = 'pdf-running-copy';
        const runningTitle = doc.createElement('span');
        runningTitle.className = 'pdf-running-title';
        runningTitle.textContent = title;
        copy.appendChild(runningTitle);
        if (filters) {
          const runningFilters = doc.createElement('span');
          runningFilters.className = 'pdf-running-filters';
          runningFilters.textContent = filters;
          copy.appendChild(runningFilters);
        }
        runningHeader.appendChild(copy);
        const originalHeader = page.querySelector('.header');
        if (originalHeader) originalHeader.replaceWith(runningHeader);
        const summary = page.querySelector('.module-summary');
        if (summary) summary.remove();
      }
      const number = doc.createElement('div');
      number.className = 'pdf-page-number';
      number.innerHTML = `<span class="pdf-page-brand">${escapeHtml(title)} · RED Intelfon</span><span class="pdf-page-generated">Generado ${escapeHtml(generatedAt)}</span><span class="pdf-page-count">Página ${index + 1} de ${pages.length}</span>`;
      page.appendChild(number);
    });
    return pages;
  }

  async function downloadReport(html, filename, selectedModules) {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;left:0;top:0;width:1062px;height:800px;border:0;opacity:0;z-index:-1;pointer-events:none;';
    document.body.appendChild(frame);

    try {
      const doc = frame.contentDocument;
      if (!doc) throw new Error('No se pudo preparar el documento del PDF.');
      doc.open();
      doc.write(html);
      doc.close();

      await new Promise(resolve => {
        if (doc.readyState === 'complete') resolve();
        else frame.addEventListener('load', resolve, { once: true });
      });

      const selected = new Set(selectedModules);
      doc.querySelectorAll('[data-pdf-module]').forEach(section => {
        if (!selected.has(section.getAttribute('data-pdf-module'))) section.remove();
      });
      if (!doc.querySelector('[data-pdf-module]')) {
        throw new Error('El reporte no contiene módulos seleccionados para exportar.');
      }
      await inlineLocalImages(doc);
      await waitForImages(doc);
      const pages = paginateReport(doc);
      await waitForImages(doc);
      if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
      await loadPdfLibraries(doc);

      const { jsPDF } = frame.contentWindow.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      for (let index = 0; index < pages.length; index++) {
        const { canvas, imageData } = await renderPdfPage(frame.contentWindow, pages[index], index + 1);
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
    } finally {
      frame.remove();
    }
  }

  function openModulePicker(options) {
    const button = document.getElementById(options.buttonId);
    if (!button) throw new Error(`No se encontró el botón ${options.buttonId} para exportar el PDF.`);

    const modules = options.modules;
    const overlay = document.createElement('div');
    overlay.className = 'dashboard-pdf-picker';
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="dashboard-pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboardPdfTitle">
        <header class="dashboard-pdf-head">
          <div class="dashboard-pdf-heading">
            <span class="dashboard-pdf-icon" aria-hidden="true">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v20h12V8z"></path>
                <path d="M14 2v6h6"></path><path d="M9 14h6M9 18h6"></path>
              </svg>
            </span>
            <div>
              <p class="dashboard-pdf-eyebrow">Exportar reporte</p>
              <h2 class="dashboard-pdf-title" id="dashboardPdfTitle">¿Qué módulos deseas incluir?</h2>
              <p class="dashboard-pdf-description">Marca las secciones que quieres incluir en el PDF. Las no seleccionadas no aparecerán.</p>
            </div>
          </div>
          <button type="button" class="dashboard-pdf-close" data-pdf-close aria-label="Cerrar">×</button>
        </header>
        <div class="dashboard-pdf-filter-chips" data-pdf-filter-chips aria-label="Filtros aplicados"></div>
        <div class="dashboard-pdf-controls">
          <div>
            <button type="button" class="dashboard-pdf-select" data-pdf-select-all>Seleccionar todo</button>
            <button type="button" class="dashboard-pdf-select" data-pdf-clear>Limpiar</button>
          </div>
          <span class="dashboard-pdf-count" data-pdf-count></span>
        </div>
        <div class="dashboard-pdf-modules">
          ${modules.map((module, index) => `
            <label class="dashboard-pdf-module">
              <input type="checkbox" value="${escapeHtml(module.id)}" checked>
              <span class="dashboard-pdf-module-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                  <path d="M8 15v-3m4 3V8m4 7v-5"></path>
                </svg>
              </span>
              <span>
                <span class="dashboard-pdf-module-name">${escapeHtml(module.name)}</span>
                <span class="dashboard-pdf-module-description">${escapeHtml(module.description)}</span>
              </span>
              <span class="dashboard-pdf-module-index">${String(index + 1).padStart(2, '0')}</span>
            </label>
          `).join('')}
        </div>
        <div class="dashboard-pdf-status" aria-live="polite"></div>
        <footer class="dashboard-pdf-footer">
          <p class="dashboard-pdf-footer-note">Se descargará un único archivo PDF con los módulos marcados.</p>
          <div class="dashboard-pdf-footer-actions">
            <button type="button" class="dashboard-pdf-secondary" data-pdf-cancel>Cancelar</button>
            <button type="button" class="dashboard-pdf-export" data-pdf-generate>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Descargar PDF <span data-pdf-selected-count></span>
            </button>
          </div>
        </footer>
      </section>`;

    document.body.appendChild(overlay);
    const checkboxes = Array.from(overlay.querySelectorAll('input[type="checkbox"]'));
    const count = overlay.querySelector('[data-pdf-count]');
    const selectedCount = overlay.querySelector('[data-pdf-selected-count]');
    const status = overlay.querySelector('.dashboard-pdf-status');
    const filterChips = overlay.querySelector('[data-pdf-filter-chips]');
    const generate = overlay.querySelector('[data-pdf-generate]');
    const actionButtons = Array.from(overlay.querySelectorAll('button'));

    function renderFilterChips() {
      const filters = typeof options.getFilterChips === 'function' ? options.getFilterChips() : [];
      filterChips.replaceChildren();
      filters.filter(filter => filter && filter.value).forEach(filter => {
        const chip = document.createElement('span');
        chip.className = 'dashboard-pdf-filter-chip';
        chip.setAttribute('aria-label', filter.tooltip || `${filter.label}: ${filter.value}`);
        if (filter.tooltip) {
          chip.classList.add('has-tooltip');
          chip.tabIndex = 0;
        }
        chip.innerHTML = `<span class="dashboard-pdf-filter-chip-label">${escapeHtml(filter.label)}</span><strong>${escapeHtml(filter.value)}</strong>`;
        if (filter.tooltip) {
          const tooltip = document.createElement('span');
          tooltip.className = 'dashboard-pdf-filter-tooltip';
          tooltip.setAttribute('role', 'tooltip');
          tooltip.innerHTML = `<span class="dashboard-pdf-filter-tooltip-title">Opciones aplicadas</span><span class="dashboard-pdf-filter-tooltip-text">${escapeHtml(filter.tooltip)}</span>`;
          chip.appendChild(tooltip);
        }
        filterChips.appendChild(chip);
      });
      filterChips.hidden = filters.length === 0;
    }

    function updateCount() {
      const selected = checkboxes.filter(checkbox => checkbox.checked).length;
      count.textContent = `${selected} de ${modules.length} módulos seleccionados`;
      selectedCount.textContent = selected || '';
      generate.disabled = selected === 0;
      checkboxes.forEach(checkbox => {
        checkbox.closest('.dashboard-pdf-module').classList.toggle('is-selected', checkbox.checked);
      });
    }

    function close() {
      if (!generate.disabled || status.textContent === '') overlay.hidden = true;
    }

    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });
    overlay.querySelectorAll('[data-pdf-close], [data-pdf-cancel]').forEach(control => control.addEventListener('click', close));
    overlay.querySelector('[data-pdf-select-all]').addEventListener('click', () => {
      checkboxes.forEach(checkbox => { checkbox.checked = true; });
      status.textContent = '';
      updateCount();
    });
    overlay.querySelector('[data-pdf-clear]').addEventListener('click', () => {
      checkboxes.forEach(checkbox => { checkbox.checked = false; });
      status.textContent = '';
      updateCount();
    });
    checkboxes.forEach(checkbox => checkbox.addEventListener('change', () => {
      status.textContent = '';
      updateCount();
    }));

    generate.addEventListener('click', async () => {
      const selected = checkboxes.filter(checkbox => checkbox.checked).map(checkbox => checkbox.value);
      if (!selected.length) return;
      actionButtons.forEach(control => { control.disabled = true; });
      status.textContent = 'Preparando tu PDF para descargar...';
      try {
        const html = await options.buildReport(selected);
        if (typeof html !== 'string' || !html.trim()) throw new Error('No se pudo generar el contenido del reporte.');
        await downloadReport(html, options.filename(), selected);
        status.textContent = '';
        overlay.hidden = true;
      } catch (error) {
        console.error('Error al generar el PDF:', error);
        status.textContent = error.message || 'Ocurrió un error al generar el PDF.';
      } finally {
        actionButtons.forEach(control => { control.disabled = false; });
        updateCount();
      }
    });

    button.addEventListener('click', () => {
      status.textContent = '';
      overlay.hidden = false;
      renderFilterChips();
      updateCount();
      const firstCheckbox = checkboxes[0];
      if (firstCheckbox) firstCheckbox.focus();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !overlay.hidden) close();
    });
    updateCount();
  }

  window.DashboardPdf = { openModulePicker };
})();
