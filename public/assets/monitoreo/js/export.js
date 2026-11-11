/* =========================================================
   Red Intelfon · Exportación compartida (PDF y Excel)
   ---------------------------------------------------------
   Uso desde cualquier vista:

     <button id="btnExcel">…</button>
     <button id="btnPdf">…</button>

   y en el script de la vista:

     window.RI_EXPORT_DATOS = function () {
         return {
             archivo: 'control_empresas',
             titulo:  'Control de Empresas',
             subtitulo: 'Periodo …',
             resumen: [['Sesiones', '92']],        // opcional
             columnas: [{ k: 'empresa', t: 'Empresa', w: 40 }],
             filas:    [{ empresa: 'DEMO' }]
         };
     };

   Los botones se amarran solos con data-exp="excel" | "pdf".
   jsPDF se descarga local (una sola vez) al pulsar PDF.
   ========================================================= */
(function () {
    'use strict';

    var PDF_LOCAL = [
        'js/jspdf.umd.min.js',
        'js/jspdf.plugin.autotable.min.js'
    ];

    function base() {
        var sc = document.currentScript ||
            document.querySelector('script[src*="js/export.js"]');
        var src = sc && sc.src ? sc.src : '';
        return src.replace(/assets\/(?:monitoreo\/)?js\/export\.js(\?.*)?$/, 'assets/monitoreo/');
    }

    /* ---------- Logo (el mismo del sidebar) ----------
       El PNG original mide 1254×1254: se baja a 320 px para que el PDF
       y el Excel no crezcan de tamaño. Se cachea el data URL. */
    var logoMemo = null;

    function cargarLogo() {
        if (logoMemo) return logoMemo;

        logoMemo = new Promise(function (listo) {
            var img = new Image();
            img.onload = function () {
                try {
                    var L = 320;
                    var c = document.createElement('canvas');
                    c.width = L;
                    c.height = L;
                    c.getContext('2d').drawImage(img, 0, 0, L, L);
                    listo(c.toDataURL('image/png'));
                } catch (e) { listo(null); }
            };
            img.onerror = function () { listo(null); };
            img.src = base() + 'img/RedIntelfon_Logo.png';
        })['catch'](function () { return null; });

        return logoMemo;
    }

    /* ---------- utilidades ---------- */
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function dato(f, col) {
        var v = typeof col.get === 'function' ? col.get(f) : f[col.k];
        if (v == null || v === '') return '—';
        if (typeof v === 'number') {
            return v.toLocaleString('es-ES');
        }
        return String(v);
    }

    /* Mismo dato, pero dejando los números como números: así Excel
       puede sumar, filtrar y hacer gráficas con la columna. */
    function datoExcel(f, col) {
        var v = typeof col.get === 'function' ? col.get(f) : f[col.k];
        return (v == null || v === '') ? null : v;
    }

    function proveedor() {
        if (typeof window.RI_EXPORT_DATOS !== 'function') return null;
        var d = window.RI_EXPORT_DATOS();
        return (d && d.columnas && d.columnas.length) ? d : null;
    }

    function archivo(d, ext) {
        return (d.archivo || 'reporte') + '.' + ext;
    }

    /* ---------- carga perezosa de jsPDF ---------- */
    var pdfListo = null;

    function cargarPdf() {
        if (pdfListo) return pdfListo;

        if (window.jspdf && window.jspdf.jsPDF && (
            window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable ||
            window.jspdf.jsPDF.prototype && window.jspdf.jsPDF.prototype.autoTable
        )) {
            pdfListo = Promise.resolve(window.jspdf.jsPDF);
            return pdfListo;
        }

        var ruta = base();
        pdfListo = PDF_LOCAL.reduce(function (p, f) {
            return p.then(function () {
                return new Promise(function (res, rej) {
                    var el = document.createElement('script');
                    el.src = ruta + f;
                    el.onload = res;
                    el.onerror = function () { rej(new Error('No se pudo cargar ' + f)); };
                    document.head.appendChild(el);
                });
            });
        }, Promise.resolve()).then(function () {
            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error('jsPDF no disponible');
            }
            return window.jspdf.jsPDF;
        })['catch'](function (err) {
            pdfListo = null;
            throw err;
        });

        return pdfListo;
    }

     /* ---------- XLSX (OOXML dentro de un ZIP sin compresión) ---------- */
     function excel(d) {
         var cols = d.columnas;
         var filas = d.filas || [];
         var resumen = (d.resumen || []).slice(0, Math.min(4, cols.length));
         var numeroFilaCabecera = 8;
         var numeroFilaPie = numeroFilaCabecera + filas.length + 2;
         var emitido = new Date().toLocaleString('es-ES');

         function referencia(columna, fila) {
             var nombre = '';
             columna++;
             while (columna) {
                 var resto = (columna - 1) % 26;
                 nombre = String.fromCharCode(65 + resto) + nombre;
                 columna = Math.floor((columna - 1) / 26);
             }
             return nombre + fila;
         }

         function xml(valor) {
             return String(valor == null ? '' : valor)
                 .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
                 .replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&apos;');
         }

         function celda(ref, valor, estilo) {
             var estiloXml = estilo ? ' s="' + estilo + '"' : '';
             if (typeof valor === 'number' && isFinite(valor)) {
                 return '<c r="' + ref + '"' + estiloXml + '><v>' + valor + '</v></c>';
             }
             return '<c r="' + ref + '" t="inlineStr"' + estiloXml + '><is><t xml:space="preserve">' +
                 xml(valor == null ? '' : valor) + '</t></is></c>';
         }

         function filaXml(numero, celdas, estilo) {
             return '<row r="' + numero + '">' + celdas.map(function (valor, indice) {
                 return celda(referencia(indice, numero), valor, estilo);
             }).join('') + '</row>';
         }

         function ancho(col, indice) {
             var max = String(col.t || '').length;
             filas.slice(0, 500).forEach(function (fila) {
                 var valor = datoExcel(fila, col);
                 if (valor !== null) max = Math.max(max, String(valor).length);
             });
             var limite = indice === 0 ? 55 : 30;
             var minimo = indice === 0 ? 12 : 8;
             if (col.w) minimo = Math.max(minimo, Math.round(col.w));
             return Math.min(limite, Math.max(minimo, max));
         }

         var filasXml = [];
         filasXml.push(filaXml(1, [d.titulo], 1));
         filasXml.push(filaXml(2, [d.subtitulo || ''], 2));
         filasXml.push(filaXml(3, ['Emitido ' + emitido + ' · Red Intelfon · Control de Tráfico'], 3));
         filasXml.push('<row r="4"></row>');
         filasXml.push(filaXml(5, resumen.map(function (item) { return String(item[1]); }), 4));
         filasXml.push(filaXml(6, resumen.map(function (item) { return String(item[0]).toUpperCase(); }), 5));
         filasXml.push('<row r="7"></row>');
         filasXml.push(filaXml(numeroFilaCabecera, cols.map(function (col) { return col.t; }), 6));

         filas.forEach(function (fila, indice) {
             var numero = numeroFilaCabecera + indice + 1;
             filasXml.push('<row r="' + numero + '">' + cols.map(function (col, columna) {
                 var valor = datoExcel(fila, col);
                 if (valor == null || valor === '') valor = '—';
                 var numerico = typeof valor === 'number' && isFinite(valor);
                 var estilo = numerico
                     ? (indice % 2 ? 9 : 10)
                     : (indice % 2 ? 7 : 8);
                 return celda(referencia(columna, numero), valor, estilo);
             }).join('') + '</row>');
         });
         filasXml.push('<row r="' + (numeroFilaPie - 1) + '"></row>');
         filasXml.push(filaXml(numeroFilaPie, [
             'Documento generado automáticamente por Red Intelfon · Control de Tráfico · ' + emitido
         ], 3));

         var ultimaColumna = referencia(cols.length - 1, 1).replace(/[0-9]/g, '');
         var ultimaFila = numeroFilaPie;
         var merges = [
             'A1:' + ultimaColumna + '1',
             'A2:' + ultimaColumna + '2',
             'A3:' + ultimaColumna + '3',
             'A' + numeroFilaPie + ':' + ultimaColumna + numeroFilaPie
         ];
         var mergesXml = cols.length > 1
             ? '<mergeCells count="' + merges.length + '">' + merges.map(function (ref) {
                 return '<mergeCell ref="' + ref + '"/>';
             }).join('') + '</mergeCells>'
             : '';
         var xmlHoja = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
             '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
             'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
             '<dimension ref="A1:' + ultimaColumna + ultimaFila + '"/>' +
             '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + numeroFilaCabecera +
             '" topLeftCell="A' + (numeroFilaCabecera + 1) + '" activePane="bottomLeft" state="frozen"/>' +
             '<selection pane="bottomLeft" activeCell="A' + (numeroFilaCabecera + 1) +
             '" sqref="A' + (numeroFilaCabecera + 1) + '"/></sheetView></sheetViews>' +
             '<cols>' + cols.map(function (col, indice) {
                 return '<col min="' + (indice + 1) + '" max="' + (indice + 1) + '" width="' +
                     ancho(col, indice) + '" customWidth="1"/>';
             }).join('') + '</cols>' +
             '<sheetData>' + filasXml.join('') + '</sheetData>' +
             (filas.length ? '<autoFilter ref="A' + numeroFilaCabecera + ':' +
                 ultimaColumna + (numeroFilaCabecera + filas.length) + '"/>' : '') +
             mergesXml + '</worksheet>';

         var archivos = [
             {
                 nombre: '[Content_Types].xml',
                 contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                     '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
                     '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
                     '<Default Extension="xml" ContentType="application/xml"/>' +
                     '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
                     '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
                     '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
                     '</Types>'
             },
             {
                 nombre: '_rels/.rels',
                 contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                     '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                     '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
                     '</Relationships>'
             },
             {
                 nombre: 'xl/workbook.xml',
                 contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                     '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
                     'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
                     '<sheets><sheet name="Reporte" sheetId="1" r:id="rId1"/></sheets></workbook>'
             },
             {
                 nombre: 'xl/_rels/workbook.xml.rels',
                 contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                     '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                     '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
                     '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
                     '</Relationships>'
             },
             {
                 nombre: 'xl/styles.xml',
                 contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                     '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
                     '<fonts count="5">' +
                     '<font><sz val="11"/><name val="Calibri"/></font>' +
                     '<font><b/><color rgb="FFFFFFFF"/><sz val="18"/><name val="Calibri"/></font>' +
                     '<font><color rgb="FFCFD9F2"/><sz val="11"/><name val="Calibri"/></font>' +
                     '<font><color rgb="FF8FA1C4"/><sz val="9"/><name val="Calibri"/></font>' +
                     '<font><b/><color rgb="FF141E37"/><sz val="14"/><name val="Calibri"/></font>' +
                     '</fonts>' +
                     '<fills count="5">' +
                     '<fill><patternFill patternType="none"/></fill>' +
                     '<fill><patternFill patternType="gray125"/></fill>' +
                     '<fill><patternFill patternType="solid"><fgColor rgb="FF0A1224"/><bgColor indexed="64"/></patternFill></fill>' +
                     '<fill><patternFill patternType="solid"><fgColor rgb="FFF5F7FC"/><bgColor indexed="64"/></patternFill></fill>' +
                     '<fill><patternFill patternType="solid"><fgColor rgb="FFF6F8FC"/><bgColor indexed="64"/></patternFill></fill>' +
                     '</fills>' +
                     '<borders count="2">' +
                     '<border><left/><right/><top/><bottom/><diagonal/></border>' +
                     '<border><left style="thin"><color rgb="FFDDE2EE"/></left><right style="thin"><color rgb="FFDDE2EE"/></right>' +
                     '<top style="thin"><color rgb="FFDDE2EE"/></top><bottom style="thin"><color rgb="FFDDE2EE"/></bottom><diagonal/></border>' +
                     '</borders>' +
                     '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
                     '<cellXfs count="11">' +
                     '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
                     '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>' +
                     '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
                     '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
                     '<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
                     '<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
                     '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>' +
                     '<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
                     '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
                     '<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>' +
                     '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>' +
                     '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
             },
             { nombre: 'xl/worksheets/sheet1.xml', contenido: xmlHoja }
         ];

         function bytes(texto) {
             return new TextEncoder().encode(texto);
         }

         function crc32(datos) {
             var crc = -1;
             for (var i = 0; i < datos.length; i++) {
                 crc ^= datos[i];
                 for (var bit = 0; bit < 8; bit++) {
                     crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
                 }
             }
             return (crc ^ -1) >>> 0;
         }

         function unir(partes) {
             var longitud = partes.reduce(function (total, parte) { return total + parte.length; }, 0);
             var salida = new Uint8Array(longitud);
             var offset = 0;
             partes.forEach(function (parte) {
                 salida.set(parte, offset);
                 offset += parte.length;
             });
             return salida;
         }

         function encabezado(longitud, escribir) {
             var salida = new Uint8Array(longitud);
             escribir(new DataView(salida.buffer));
             return salida;
         }

         function zip(entradas) {
             var locales = [];
             var centrales = [];
             var offset = 0;
             var fecha = new Date();
             var horaDos = (fecha.getHours() << 11) | (fecha.getMinutes() << 5) |
                 Math.floor(fecha.getSeconds() / 2);
             var fechaDos = ((Math.max(1980, fecha.getFullYear()) - 1980) << 9) |
                 ((fecha.getMonth() + 1) << 5) | fecha.getDate();

             entradas.forEach(function (entrada) {
                 var nombre = bytes(entrada.nombre);
                 var datos = bytes(entrada.contenido);
                 var crc = crc32(datos);
                 var local = encabezado(30, function (vista) {
                     vista.setUint32(0, 0x04034B50, true);
                     vista.setUint16(4, 20, true);
                     vista.setUint16(6, 0x0800, true);
                     vista.setUint16(8, 0, true);
                     vista.setUint16(10, horaDos, true);
                     vista.setUint16(12, fechaDos, true);
                     vista.setUint32(14, crc, true);
                     vista.setUint32(18, datos.length, true);
                     vista.setUint32(22, datos.length, true);
                     vista.setUint16(26, nombre.length, true);
                     vista.setUint16(28, 0, true);
                 });
                 locales.push(unir([local, nombre, datos]));

                 var central = encabezado(46, function (vista) {
                     vista.setUint32(0, 0x02014B50, true);
                     vista.setUint16(4, 20, true);
                     vista.setUint16(6, 20, true);
                     vista.setUint16(8, 0x0800, true);
                     vista.setUint16(10, 0, true);
                     vista.setUint16(12, horaDos, true);
                     vista.setUint16(14, fechaDos, true);
                     vista.setUint32(16, crc, true);
                     vista.setUint32(20, datos.length, true);
                     vista.setUint32(24, datos.length, true);
                     vista.setUint16(28, nombre.length, true);
                     vista.setUint16(30, 0, true);
                     vista.setUint16(32, 0, true);
                     vista.setUint16(34, 0, true);
                     vista.setUint16(36, 0, true);
                     vista.setUint32(38, 0, true);
                     vista.setUint32(42, offset, true);
                 });
                 centrales.push(unir([central, nombre]));
                 offset += local.length + nombre.length + datos.length;
             });

             var directorio = unir(centrales);
             var final = encabezado(22, function (vista) {
                 vista.setUint32(0, 0x06054B50, true);
                 vista.setUint16(4, 0, true);
                 vista.setUint16(6, 0, true);
                 vista.setUint16(8, entradas.length, true);
                 vista.setUint16(10, entradas.length, true);
                 vista.setUint32(12, directorio.length, true);
                 vista.setUint32(16, offset, true);
                 vista.setUint16(20, 0, true);
             });
             return unir(locales.concat([directorio, final]));
         }

         var blob = new Blob([zip(archivos)], {
             type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
         });
         descargar(blob, archivo(d, 'xlsx'));
     }

    /* ---------- PDF (jsPDF + autotable) ---------- */
    function pdf(d) {
        return Promise.all([cargarPdf(), cargarLogo()]).then(function (r) {
            var jsPDF = r[0];
            var logo = r[1];

            var doc = new jsPDF({
                orientation: d.columnas.length > 8 ? 'landscape' : 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            var M = 32;
            var ancho = doc.internal.pageSize.getWidth() - M * 2;
            var hLogo = 54;
            var xTit = M;

            /* Encabezado: el logo del sidebar a la izquierda y los
               textos corridos hacia la derecha. Sin logo, todo a M. */
            if (logo) {
                try {
                    doc.addImage(logo, 'PNG', M, M - 8, hLogo, hLogo);
                    xTit = M + hLogo + 14;
                } catch (e) { xTit = M; }
            }

            var y = M + 18;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(17);
            doc.setTextColor(240, 51, 61);
            doc.text(d.titulo, xTit, y);
            y += 15;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(70, 70, 70);
            var sub = doc.splitTextToSize(d.subtitulo || '', Math.max(140, ancho - (xTit - M)));
            doc.text(sub, xTit, y);
            y += sub.length * 12 + 2;

            doc.setTextColor(110, 110, 110);
            doc.setFontSize(8.5);
            doc.text(
                'Red Intelfon · Control de Tráfico  —  emitido ' +
                new Date().toLocaleString('es-ES'),
                xTit, y
            );
            y += 10;

            /* Filete de marca: tramo rojo + tramo gris */
            var yLinea = Math.max(y, M + hLogo - 8) + 10;
            doc.setLineWidth(1.8);
            doc.setDrawColor(240, 51, 61);
            doc.line(M, yLinea, M + 70, yLinea);
            doc.setLineWidth(.6);
            doc.setDrawColor(220, 224, 234);
            doc.line(M + 70, yLinea, M + ancho, yLinea);
            y = yLinea + 16;

            /* Metadatos del documento (se ven en Propiedades) */
            doc.setProperties({
                title: d.titulo,
                subject: d.subtitulo || '',
                author: 'Red Intelfon',
                creator: 'Red Intelfon · Control de Tráfico'
            });

            /* Resumen en cajitas */
            var res = d.resumen || [];
            if (res.length) {
                var cw = ancho / Math.min(res.length, 4);
                res.slice(0, 4).forEach(function (f, i) {
                    var x = M + i * cw;
                    doc.setFillColor(245, 247, 252);
                    doc.setDrawColor(225, 228, 236);
                    doc.roundedRect(x, y, cw - 6, 34, 3, 3, 'FD');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.setTextColor(20, 30, 55);
                    doc.text(String(f[1]), x + 7, y + 16);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(120, 130, 155);
                    doc.text(String(f[0]).toUpperCase().slice(0, 26), x + 7, y + 27);
                });
                y += 44;
            }

            var cuerpo = d.filas.map(function (f) {
                return d.columnas.map(function (c) { return dato(f, c); });
            });

            doc.autoTable({
                startY: y,
                head: [d.columnas.map(function (c) { return c.t; })],
                body: cuerpo,
                margin: { left: M, right: M, top: M, bottom: M },
                styles: {
                    font: 'helvetica',
                    fontSize: d.columnas.length > 10 ? 6.6 : 8,
                    cellPadding: d.columnas.length > 10 ? 2.4 : 3.6,
                    overflow: 'linebreak',
                    textColor: [40, 46, 66],
                    lineColor: [222, 226, 236],
                    lineWidth: .4
                },
                headStyles: {
                    fillColor: [10, 18, 36],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: d.columnas.length > 10 ? 6.8 : 8.4
                },
                alternateRowStyles: { fillColor: [248, 249, 252] }
            });

            /* Pie en todas las páginas: filete, marca y «Página X de Y» */
            var total = doc.internal.getNumberOfPages();
            var alto = doc.internal.pageSize.getHeight();
            for (var p = 1; p <= total; p++) {
                doc.setPage(p);
                doc.setDrawColor(228, 231, 240);
                doc.setLineWidth(.5);
                doc.line(M, alto - 27, M + ancho, alto - 27);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(150, 155, 170);
                doc.text(
                    'Red Intelfon · Control de Tráfico  ·  ' + d.titulo,
                    M, alto - 17
                );
                doc.text(
                    'Página ' + p + ' de ' + total,
                    M + ancho, alto - 17, { align: 'right' }
                );
            }

            descargar(doc.output('blob'), archivo(d, 'pdf'));
            return true;
        });
    }

    function descargar(blob, nombre) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 1200);
    }

    /* ---------- Amarre automático de botones ---------- */
    function amarrar() {
        var ex = document.querySelector('[data-exp="excel"]:not([data-exp-on])');
        var pd = document.querySelector('[data-exp="pdf"]:not([data-exp-on])');

        if (ex) {
            ex.setAttribute('data-exp-on', '1');
            ex.addEventListener('click', function () {
                var d = proveedor();
                if (!d) { aviso('No hay datos para exportar'); return; }
                try { excel(d); }
                catch (e) { console.error(e); aviso('No se pudo generar el Excel'); }
            });
        }

        if (pd) {
            pd.setAttribute('data-exp-on', '1');
            pd.addEventListener('click', function () {
                var d = proveedor();
                if (!d) { aviso('No hay datos para exportar'); return; }

                var original = pd.innerHTML;
                pd.disabled = true;
                pd.textContent = 'Generando…';

                pdf(d).then(function () {
                    pd.disabled = false;
                    pd.innerHTML = original;
                })['catch'](function (e) {
                    console.error(e);
                    pd.disabled = false;
                    pd.innerHTML = original;
                    aviso('No se pudo generar el PDF');
                });
            });
        }
    }

    function aviso(txt) {
        var t = document.createElement('div');
        t.className = 'exp-toast';
        t.textContent = txt;
        document.body.appendChild(t);
        setTimeout(function () { t.classList.add('is-on'); }, 10);
        setTimeout(function () {
            t.classList.remove('is-on');
            setTimeout(function () { t.remove(); }, 350);
        }, 2800);
    }

    window.RI_EXPORT = { excel: excel, pdf: pdf, datos: proveedor, amarrar: amarrar };

    function arrancar() {
        amarrar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', arrancar);
    } else {
        arrancar();
    }

    /* La navegación AJAX (sidebar.js) reemplaza el DOM: hay que volver a
       amarrar los botones de la vista destino. */
    document.addEventListener('ri:navegada', arrancar);
})();
