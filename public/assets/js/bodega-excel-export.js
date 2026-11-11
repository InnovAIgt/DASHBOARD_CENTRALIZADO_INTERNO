(function (global) {
  function exportTable({ headers, rows, sheetName, filename, columnWidths, numericColumns = [], title, subtitle }) {
    if (!global.XLSX) {
      throw new Error('No se pudo cargar la librería para crear archivos Excel.');
    }
    if (!headers.length) {
      throw new Error('La exportación necesita al menos una columna.');
    }

    const workbook = global.XLSX.utils.book_new();
    const generatedAt = new Date().toLocaleString('es-GT');
    const worksheet = global.XLSX.utils.aoa_to_sheet([
      [title || sheetName.toUpperCase()],
      [subtitle || `${rows.length.toLocaleString('es-GT')} registros`],
      [`Generado ${generatedAt} · RED Intelfon · Bodega`],
      headers,
      ...rows
    ]);
    const lastColumn = headers.length - 1;
    const headerRow = 3;
    const lastRow = rows.length + headerRow;
    const endCell = global.XLSX.utils.encode_cell({ r: lastRow, c: lastColumn });
    const border = { style: 'thin', color: { rgb: 'D7DFEA' } };
    const fill = color => ({ patternType: 'solid', fgColor: { rgb: color } });

    worksheet['!cols'] = columnWidths || headers.map(header => ({ wch: Math.min(36, Math.max(16, String(header).length + 4)) }));
    worksheet['!autofilter'] = { ref: `A4:${endCell}` };
    worksheet['!merges'] = [0, 1, 2].map(row => ({
      s: { r: row, c: 0 },
      e: { r: row, c: lastColumn }
    }));
    worksheet['!rows'] = [{ hpt: 32 }, { hpt: 22 }, { hpt: 19 }, { hpt: 28 }, ...rows.map(() => ({ hpt: 21 }))];
    workbook.Props = {
      Title: title || sheetName,
      Subject: 'Reporte de Bodega',
      Author: 'RED Intelfon',
      CreatedDate: new Date()
    };

    for (let column = 0; column <= lastColumn; column += 1) {
      const address = column => global.XLSX.utils.encode_cell({ r: 0, c: column });
      [0, 1, 2].forEach(rowIndex => {
        const cellAddress = global.XLSX.utils.encode_cell({ r: rowIndex, c: column });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' };
      });

      const titleCell = worksheet[address(column)];
      titleCell.s = {
        fill: fill('17243A'),
        font: { name: 'Segoe UI', sz: 16, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { vertical: 'center', horizontal: 'left' }
      };
      const subtitleCell = worksheet[global.XLSX.utils.encode_cell({ r: 1, c: column })];
      subtitleCell.s = {
        fill: fill('EAF0F8'),
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '344054' } },
        alignment: { vertical: 'center', horizontal: 'left' }
      };
      const metadataCell = worksheet[global.XLSX.utils.encode_cell({ r: 2, c: column })];
      metadataCell.s = {
        fill: fill('F8FAFC'),
        font: { name: 'Segoe UI', sz: 9, color: { rgb: '64748B' } },
        alignment: { vertical: 'center', horizontal: 'left' },
        border: { bottom: { style: 'medium', color: { rgb: 'EF3E4D' } } }
      };

      const headerAddress = global.XLSX.utils.encode_cell({ r: headerRow, c: column });
      const headerCell = worksheet[headerAddress];
      headerCell.s = {
        fill: fill('17243A'),
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
        border: { top: border, bottom: { style: 'medium', color: { rgb: 'EF3E4D' } }, left: border, right: border }
      };

      for (let rowIndex = headerRow + 1; rowIndex <= lastRow; rowIndex += 1) {
        const cell = worksheet[global.XLSX.utils.encode_cell({ r: rowIndex, c: column })];
        if (!cell) continue;
        cell.s = {
          fill: fill((rowIndex - headerRow - 1) % 2 ? 'F1F5F9' : 'FFFFFF'),
          font: { name: 'Segoe UI', sz: 10, color: { rgb: '243247' } },
          alignment: { vertical: 'center', horizontal: numericColumns.includes(column) ? 'right' : 'left', wrapText: false },
          border: { bottom: border, left: border, right: border }
        };
        if (numericColumns.includes(column) && typeof cell.v === 'number') {
          cell.z = '#,##0.##;[Red]-#,##0.##';
        }
      }
    }

    global.XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    global.XLSX.writeFile(workbook, filename);
  }

  global.BodegaExcelExport = Object.freeze({ exportTable });
})(window);
