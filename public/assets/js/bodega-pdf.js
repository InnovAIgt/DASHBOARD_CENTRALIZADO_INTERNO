(function () {
  'use strict';

  const config = window.BODEGA_PDF_CONFIG;
  const button = document.getElementById('bodegaPdfBtn');
  const modal = document.getElementById('pdfModuleModal');
  const options = document.getElementById('pdfModuleOptions');
  const count = document.getElementById('pdfModuleCount');
  const generateButton = document.getElementById('generatePdfModules');
  const generateCount = document.getElementById('pdfModuleGenerateCount');

  if (!config || !button || !modal || !options || !Array.isArray(config.modules)) return;

  const jsPdfUrl = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
  const autoTableUrl = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';
  const moduleIds = config.modules.map(module => module.id);
  let busy = false;
  let lastFocused = null;
  let closeTimer = null;

  const safeText = value => String(value == null ? '' : value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\u0000-\u00FF]/g, '')
    .trim();

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      let script = document.querySelector(`script[src="${url}"]`);
      if (script) {
        if (script.dataset.ready === '1') {
          resolve();
          return;
        }
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener('error', () => reject(new Error('No se pudo cargar la librería para generar el PDF.')), { once: true });
        return;
      }
      script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => {
        script.dataset.ready = '1';
        resolve();
      };
      script.onerror = () => reject(new Error('No se pudo cargar la librería para generar el PDF.'));
      document.head.appendChild(script);
    });
  }

  async function loadPdfLibraries() {
    await loadScript(jsPdfUrl);
    if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
      throw new Error('La librería jsPDF no está disponible.');
    }
    await loadScript(autoTableUrl);
    if (typeof window.jspdf.jsPDF.API.autoTable !== 'function') {
      throw new Error('No se pudo activar la creación de tablas PDF.');
    }
    return window.jspdf.jsPDF;
  }

  function toast(kind, title, detail) {
    document.querySelector('.pdf-report-toast')?.remove();
    const element = document.createElement('div');
    element.className = `pdf-report-toast${kind === 'error' ? ' is-error' : ''}`;
    element.setAttribute('role', 'status');
    element.innerHTML = '<i></i><span><b></b><small></small></span>';
    element.querySelector('b').textContent = title;
    element.querySelector('small').textContent = detail || '';
    document.body.appendChild(element);
    setTimeout(() => {
      element.classList.add('is-out');
      setTimeout(() => element.remove(), 260);
    }, 4200);
  }

  function selectedIds() {
    return Array.from(options.querySelectorAll('input:checked')).map(input => input.value);
  }

  function refreshCount() {
    const ids = selectedIds();
    options.querySelectorAll('.pdf-module-option').forEach(option => {
      option.classList.toggle('is-checked', Boolean(option.querySelector('input')?.checked));
    });
    count.textContent = `${ids.length} de ${config.modules.length} módulos seleccionados`;
    count.classList.toggle('is-empty', ids.length === 0);
    generateCount.textContent = String(ids.length);
    generateButton.disabled = ids.length === 0;
  }

  function renderOptions() {
    options.innerHTML = config.modules.map((module, index) => `
      <label class="pdf-module-option is-checked" data-module="${module.id}">
        <input type="checkbox" value="${module.id}" checked>
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
    options.querySelectorAll('input[type="checkbox"]').forEach(input => input.addEventListener('change', refreshCount));
    refreshCount();
  }

  function openSelection() {
    if (busy || !modal.hidden) return;
    lastFocused = document.activeElement;
    clearTimeout(closeTimer);
    modal.classList.remove('is-closing');
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    refreshCount();
    options.querySelector('input')?.focus();
  }

  function closeSelection() {
    if (modal.hidden) return;
    modal.classList.add('is-closing');
    document.body.style.overflow = '';
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      modal.hidden = true;
      modal.classList.remove('is-closing');
    }, 170);
    if (lastFocused && lastFocused.isConnected) lastFocused.focus();
  }

  function drawSummaryCards(doc, section, startY) {
    doc.setFillColor(239, 62, 77);
    doc.roundedRect(12, startY - 4.5, 1.8, 6.5, .8, .8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(23, 32, 51);
    doc.text(safeText(section.title), 17, startY);

    let cardsY = startY + 5;
    if (section.note) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(safeText(section.note), 17, cardsY + 1, { maxWidth: 265 });
      cardsY += 4;
    }

    const columns = 3;
    const gap = 4;
    const width = (273 - gap * (columns - 1)) / columns;
    const height = 24;
    const colors = [
      [239, 62, 77], [28, 113, 196], [16, 137, 99],
      [206, 132, 19], [13, 135, 155], [80, 98, 125]
    ];

    section.rows.forEach((row, index) => {
      const column = index % columns;
      const line = Math.floor(index / columns);
      const x = 12 + column * (width + gap);
      const y = cardsY + line * (height + 4);
      const color = colors[index % colors.length];

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(216, 222, 232);
      doc.setLineWidth(.2);
      doc.roundedRect(x, y, width, height, 2, 2, 'FD');
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(x, y, width, 1.6, .8, .8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.4);
      doc.setTextColor(100, 116, 139);
      doc.text(safeText(row[0]).toUpperCase(), x + 3.5, y + 7, { maxWidth: width - 7 });

      doc.setTextColor(color[0], color[1], color[2]);
      let valueFontSize = 13;
      while (valueFontSize > 7) {
        doc.setFontSize(valueFontSize);
        if (doc.getTextWidth(safeText(row[1])) <= width - 7) break;
        valueFontSize -= .5;
      }
      doc.text(safeText(row[1]), x + 3.5, y + 16);
    });

    const lines = Math.ceil(section.rows.length / columns);
    return cardsY + lines * height + Math.max(0, lines - 1) * 4 + 5;
  }

  function drawTable(doc, section, startY) {
    if (section.headers.length === 2 && section.headers[0] === 'Indicador' && section.headers[1] === 'Valor') {
      return drawSummaryCards(doc, section, startY);
    }

    doc.setFillColor(239, 62, 77);
    doc.roundedRect(12, startY - 4.5, 1.8, 6.5, .8, .8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(23, 32, 51);
    doc.text(safeText(section.title), 17, startY);
    let y = startY + 5;
    if (section.note) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(safeText(section.note), 17, y + 1, { maxWidth: 265 });
      y += 4;
    }
    doc.autoTable({
      startY: y,
      head: [section.headers.map(safeText)],
      body: section.rows.length
        ? section.rows.map(row => row.map(safeText))
        : [[`Sin registros para los filtros actuales.`, ...Array(section.headers.length - 1).fill('')]],
      theme: 'grid',
      margin: { left: 12, right: 12, top: 24, bottom: 18 },
      styles: { font: 'helvetica', fontSize: 7.4, cellPadding: { top: 1.7, right: 2, bottom: 1.7, left: 2 }, overflow: 'linebreak', valign: 'middle', textColor: [38, 49, 68], lineColor: [216, 222, 232], lineWidth: .1 },
      headStyles: { fillColor: [21, 28, 46], textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0, cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2 } },
      alternateRowStyles: { fillColor: [247, 249, 252] },
      didDrawPage: () => {
        if (doc.internal.getCurrentPageInfo().pageNumber > 1) drawPageHeader(doc, config.title, config.scope || '');
      }
    });
    return doc.lastAutoTable.finalY + 9;
  }

  function drawPageHeader(doc, title, scope) {
    doc.setFillColor(21, 28, 46);
    doc.roundedRect(12, 8, 273, 16, 2, 2, 'F');
    doc.setFillColor(239, 62, 77);
    doc.roundedRect(16, 11, 1.8, 10, .8, .8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('RED INTELFON · BODEGA', 22, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(226, 232, 240);
    doc.text(safeText(`${title}${scope ? ` · ${scope}` : ''}`), 283, 14, { align: 'right', maxWidth: 250 });
  }

  async function generatePdf(ids) {
    if (typeof config.buildReport !== 'function') throw new Error('No está configurado el contenido del reporte.');
    const report = config.buildReport(ids);
    if (!report || !report.hasData) {
      throw new Error('No hay datos disponibles con los filtros actuales para exportar.');
    }
    const jsPDF = await loadPdfLibraries();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({
      title: `${config.title} · Reporte`,
      subject: 'Reporte de Bodega',
      author: 'RED Intelfon · Dashboard de Bodega',
      creator: 'Dashboard de Bodega'
    });

    doc.setFillColor(21, 28, 46);
    doc.roundedRect(12, 10, 273, 30, 3, 3, 'F');
    doc.setFillColor(239, 62, 77);
    doc.roundedRect(16, 14, 2.4, 22, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(169, 185, 207);
    doc.text('DASHBOARD DE BODEGA · RED INTELFON', 24, 19);
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(safeText(report.title || config.title), 24, 30, { maxWidth: 205 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(226, 232, 240);
    doc.text(safeText(`Generado ${new Date().toLocaleString('es-GT')}`), 279, 19, { align: 'right' });

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(12, 44, 273, 15, 2, 2, 'F');
    doc.setFillColor(239, 62, 77);
    doc.roundedRect(12, 44, 1.8, 15, .8, .8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(239, 62, 77);
    doc.text('FILTROS APLICADOS', 18, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(52, 64, 84);
    if (report.filters) doc.text(safeText(report.filters), 18, 55, { maxWidth: 261 });

    let y = 69;
    report.sections.forEach(section => {
      if (y > 175) {
        doc.addPage();
        y = 33;
        drawPageHeader(doc, report.title || config.title, report.filters || '');
      }
      y = drawTable(doc, section, y);
    });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setDrawColor(216, 222, 232);
      doc.line(12, pageHeight - 13.5, 285, pageHeight - 13.5);
      doc.setFillColor(239, 62, 77);
      doc.roundedRect(12, pageHeight - 14.2, 18, 1.4, .7, .7, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(107, 122, 148);
      doc.text('RED Intelfon · Dashboard de Bodega', 33, pageHeight - 9.5);
      doc.text(`Página ${page} de ${pageCount}`, 285, pageHeight - 9.5, { align: 'right' });
    }

    const date = new Date().toISOString().slice(0, 10);
    doc.save(`${config.fileName || 'reporte-bodega'}-${date}.pdf`);
    toast('ok', 'PDF descargado', `${ids.length} módulo(s) incluidos en el reporte.`);
  }

  async function runGeneration(ids) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    button.classList.add('is-loading');
    try {
      await generatePdf(ids);
    } catch (error) {
      console.error('[Bodega PDF] No se pudo generar el reporte:', error);
      toast('error', 'No se pudo generar el PDF', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      button.disabled = false;
      button.classList.remove('is-loading');
      busy = false;
    }
  }

  renderOptions();
  button.addEventListener('click', openSelection);
  modal.querySelector('#closePdfModules')?.addEventListener('click', closeSelection);
  modal.querySelector('#cancelPdfModules')?.addEventListener('click', closeSelection);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeSelection();
  });
  modal.querySelectorAll('[data-pdf-quick]').forEach(action => {
    action.addEventListener('click', () => {
      const checked = action.dataset.pdfQuick === 'all';
      options.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = checked; });
      refreshCount();
    });
  });
  generateButton.addEventListener('click', () => {
    const ids = selectedIds();
    if (!ids.length) return;
    closeSelection();
    runGeneration(ids);
  });
  document.addEventListener('keydown', event => {
    if (modal.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSelection();
      return;
    }
    if (event.key === 'Tab') {
      const focusables = Array.from(modal.querySelectorAll('button, input'))
        .filter(element => !element.disabled && element.getClientRects().length);
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
  });
})();
