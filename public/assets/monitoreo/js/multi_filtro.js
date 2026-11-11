/* =========================================================
   Red Intelfon · Filtro con selección múltiple y búsqueda
   ---------------------------------------------------------
   Convierte un <select> en un desplegable con casillas y un
   cuadro de búsqueda: al escribir sólo se muestran las
   opciones relacionadas con lo tecleado y la parte que
   coincide se resalta en amarillo.

   · La búsqueda IGNORA mayúsculas, tildes y espacios:
     "banco fal" encuentra "BANCO FAL", "agricola" encuentra
     "Empresa Agrícola", "CL000123" se encuentra escribiendo
     "cl123"? no: hay que escribir las letras en orden, pero
     sin importar tildes ni mayúsculas.
   · Varias opciones a la vez (selección múltiple). Sin
     ninguna marcada = sin filtro, pasan todas.
   · El <select> sigue siendo el dueño del valor: su .value
     devuelve las opciones elegidas separadas por ", " y al
     asignarle un valor se marca esa opción (sin lanzar
     'change', igual que el navegador). Al elegir con el
     desplegable se lanza 'change' en el <select>, así las
     páginas que ya escuchaban ese evento no cambian.

   Uso:
     RI_MULTI.construir(document.getElementById('fEmpresa'));
     RI_MULTI.valoresDe('fEmpresa');   // [] = sin filtro
     RI_MULTI.limpiar('fEmpresa');
     RI_MULTI.cerrarTodos();
   ========================================================= */
(function (global) {
    'use strict';

    /* Texto original + versión "fácil de comparar" (minúsculas y sin
       tildes) + mapa de cada carácter de esa versión a su posición en
       el original (para resaltar sin perder las tildes del texto). */
    function preparar(texto) {
        var s = String(texto == null ? '' : texto);
        var norm = '';
        var fuente = [];
        for (var i = 0; i < s.length; i++) {
            var bajo = s.charAt(i).toLowerCase();
            var descompuesto = bajo.normalize ? bajo.normalize('NFD') : bajo;
            for (var j = 0; j < descompuesto.length; j++) {
                var c = descompuesto.charAt(j);
                if (c >= '\u0300' && c <= '\u036f') continue;   // la tilde se quita
                norm += c;
                fuente.push(i);
            }
        }
        fuente.push(s.length);       // cierre: fuente[norm.length] = fin
        return { texto: s, norm: norm, fuente: fuente };
    }

    function escapar(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    /* Devuelve el HTML del texto con las coincidencias envueltas en <mark> */
    function resaltar(pre, tokens) {
        if (!tokens || !tokens.length) return escapar(pre.texto);
        var rangos = [];
        tokens.forEach(function (t) {
            var i = pre.norm.indexOf(t);
            if (i >= 0) rangos.push([i, i + t.length]);
        });
        if (!rangos.length) return escapar(pre.texto);

        rangos.sort(function (a, b) { return a[0] - b[0]; });
        var f = [rangos[0]];
        for (var i = 1; i < rangos.length; i++) {
            var u = f[f.length - 1];
            if (rangos[i][0] <= u[1]) u[1] = Math.max(u[1], rangos[i][1]);
            else f.push(rangos[i]);
        }

        var out = '', pos = 0;
        f.forEach(function (r) {
            var ini = pre.fuente[r[0]];
            var fin = r[1] < pre.fuente.length ? pre.fuente[r[1]] : pre.texto.length;
            if (ini < pos) return;                      // no retroceder (rangos fusionados)
            out += escapar(pre.texto.slice(pos, ini)) +
                '<mark>' + escapar(pre.texto.slice(ini, fin)) + '</mark>';
            pos = fin;
        });
        return out + escapar(pre.texto.slice(pos));
    }

    function avisar(sel) {
        var ev;
        try { ev = new Event('change', { bubbles: true }); }
        catch (e) {
            ev = document.createEvent('HTMLEvents');
            ev.initEvent('change', true, false);
        }
        sel.dispatchEvent(ev);
    }

    /* ---------- Construcción del desplegable ----------
       opciones.simple = true → selección SIMPLE: elegir una opción
       deselecciona las demás (para "todas" está el enlace "Todos"). */
    function construir(sel, opciones) {
        opciones = opciones || {};
        if (!sel) return null;
        var yaHay = document.querySelector('.multi[data-for="' + sel.id + '"]');
        if (yaHay) return yaHay;
        var campo = sel.parentNode;
        if (!campo) return null;

        var wrap = document.createElement('div');
        wrap.className = 'multi';
        wrap.setAttribute('data-for', sel.id);
        wrap._sel = {};          // { valor: 1 } — mismo formato que usaban las páginas
        wrap._textos = {};
        wrap._simple = !!opciones.simple;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'multi__btn';
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '<span class="multi__txt">Todos</span><span class="multi__caret" aria-hidden="true"></span>';

        var box = document.createElement('div');
        box.className = 'multi__box';
        box.hidden = true;

        /* Búsqueda: se escribe y la lista va mostrando lo relacionado */
        var busq = document.createElement('div');
        busq.className = 'multi__busq';
        var inp = document.createElement('input');
        inp.type = 'search';
        inp.className = 'multi__q';
        inp.placeholder = 'Buscar…';
        inp.setAttribute('aria-label', 'Buscar');
        var cuenta = document.createElement('span');
        cuenta.className = 'multi__n';
        cuenta.hidden = true;
        busq.appendChild(inp);
        busq.appendChild(cuenta);

        var head = document.createElement('div');
        head.className = 'multi__head';
        /* "Limpiar" DENTRO del menú: sólo lo pide inicio.html (en el resto
           se quita, como se pidió). Sigue existiendo el botón Limpiar de
           la barra de filtros de cada página. */
        var acciones = opciones.conLimpiar ? ['Todos', 'Limpiar'] : ['Todos'];
        acciones.forEach(function (txt, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'multi__link';
            b.textContent = txt;
            b.setAttribute('data-accion', i ? 'limpiar' : 'todos');
            head.appendChild(b);
        });

        var lista = document.createElement('div');
        lista.className = 'multi__lista';
        var ops = [];
        Array.prototype.forEach.call(sel.options, function (o) {
            if (!o.value) return;                // "Todas/Todos" no es una opción
            wrap._textos[o.value] = o.textContent;

            var lab = document.createElement('label');
            lab.className = 'multi__opt';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = o.value;
            var sp = document.createElement('span');
            sp.textContent = o.textContent;
            lab.appendChild(cb);
            lab.appendChild(sp);
            lista.appendChild(lab);

            if (o.selected) { cb.checked = true; wrap._sel[o.value] = 1; }
            ops.push({ valor: o.value, texto: o.textContent, pre: preparar(o.textContent), lab: lab, cb: cb, sp: sp });
        });

        var vacio = document.createElement('div');
        vacio.className = 'multi__vacio';
        vacio.textContent = 'Sin coincidencias';
        vacio.hidden = true;

        box.appendChild(busq);
        box.appendChild(head);
        box.appendChild(lista);
        box.appendChild(vacio);
        wrap.appendChild(btn);
        wrap.appendChild(box);
        campo.appendChild(wrap);
        sel.classList.add('multi__orig');

        /* ----- Utilidades internas ----- */
        function elegidos() { return Object.keys(wrap._sel); }

        function refrescar() {
            var eleg = elegidos();
            var txt = btn.querySelector('.multi__txt');
            if (!eleg.length) txt.textContent = 'Todos';
            else if (eleg.length === 1) txt.textContent = wrap._textos[eleg[0]] || eleg[0];
            else txt.textContent = eleg.length + ' de ' + ops.length;
            btn.classList.toggle('is-on', eleg.length > 0);
        }

        function aplicarBusqueda() {
            var tokens = preparar(inp.value).norm.split(/\s+/).filter(Boolean);
            var visibles = 0;
            ops.forEach(function (op) {
                var coincide = tokens.every(function (t) { return op.pre.norm.indexOf(t) !== -1; });
                var ver = coincide || op.cb.checked;   // lo elegido se ve siempre
                op.lab.hidden = !ver;
                if (ver) visibles++;
                op.sp.innerHTML = resaltar(op.pre, tokens);
            });
            vacio.hidden = visibles > 0;
            cuenta.hidden = !tokens.length;
            cuenta.textContent = visibles + ' de ' + ops.length;
        }

        function marcar(valor, on) {
            if (on) wrap._sel[valor] = 1; else delete wrap._sel[valor];
            ops.forEach(function (op) { if (op.valor === valor) op.cb.checked = !!on; });
        }

        function marcarTodos(on) {
            ops.forEach(function (op) {
                op.cb.checked = on;
                if (on) wrap._sel[op.valor] = 1; else delete wrap._sel[op.valor];
            });
        }

        function aplicarLista(valores) {
            ops.forEach(function (op) {
                var on = valores.indexOf(op.valor) !== -1;
                op.cb.checked = on;
                if (on) wrap._sel[op.valor] = 1; else delete wrap._sel[op.valor];
            });
            refrescar();
            aplicarBusqueda();
        }

        /* ----- El <select> sigue mandando ----- */
        try {
            Object.defineProperty(sel, 'value', {
                configurable: true,
                get: function () { return elegidos().join(', '); },
                set: function (v) {
                    var s = v == null ? '' : String(v);
                    var lista2 = [];
                    if (s !== '') {
                        if (wrap._textos.hasOwnProperty(s)) lista2 = [s];   // nombre completo (aunque lleve comas)
                        else {
                            lista2 = s.split(',').map(function (x) { return x.trim(); })
                                .filter(function (x) { return wrap._textos.hasOwnProperty(x); });
                        }
                    }
                    aplicarLista(lista2);      // sin 'change', como el navegador
                }
            });
        } catch (e) { /* sin override: se lee el <select> normal */ }

        /* ----- Eventos ----- */
        btn.addEventListener('click', function (e) {
            e.preventDefault();          // el <label> contenedor no roba el foco
            e.stopPropagation();
            var abrirAhora = box.hidden;             // ¿estaba cerrada?
            RI_MULTI.cerrarTodos();                  // sólo uno abierto a la vez
            box.hidden = !abrirAhora;
            btn.setAttribute('aria-expanded', abrirAhora ? 'true' : 'false');
            if (abrirAhora) {
                inp.value = '';
                aplicarBusqueda();
                /* El foco va DESPUÉS de la activación del <label>, si no
                   el navegador se lo lleva al <select> oculto */
                setTimeout(function () {
                    try { inp.focus(); } catch (err) { /* sin foco */ }
                }, 0);
            }
        });

        box.addEventListener('click', function (e) { e.stopPropagation(); });

        box.addEventListener('change', function (e) {
            var cb = e.target;
            if (!cb || cb.type !== 'checkbox') return;
            if (wrap._simple) {
                /* Selección simple: no se puede desmarcar la única elegida
                   ni quedar sin selección (para "todas" está "Todos") */
                if (!cb.checked) { cb.checked = true; return; }
                ops.forEach(function (op) { if (op.cb !== cb) op.cb.checked = false; });
                wrap._sel = {};
                wrap._sel[cb.value] = 1;
            } else {
                marcar(cb.value, cb.checked);
            }
            refrescar();
            aplicarBusqueda();
            avisar(sel);
        });

        inp.addEventListener('input', aplicarBusqueda);

        head.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-accion]') : null;
            if (!b) return;
            var accion = b.getAttribute('data-accion');
            /* En modo simple "Todos" = sin filtro (todas las empresas),
               nunca marcarlas todas de una vez */
            if (wrap._simple && accion === 'todos') marcarTodos(false);
            else marcarTodos(accion === 'todos');
            refrescar();
            aplicarBusqueda();
            avisar(sel);
        });

        wrap._aplicar = aplicarLista;
        refrescar();
        aplicarBusqueda();

        if (!global._RI_MULTI_LISTENERS) {
            global._RI_MULTI_LISTENERS = true;
            document.addEventListener('click', function (e) {
                var t = e.target;
                if (!t || !t.closest) return;
                if (t.closest('.multi')) return;    // dentro del menú: lo maneja cada botón
                RI_MULTI.cerrarTodos();
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') RI_MULTI.cerrarTodos();
            });
        }

        return wrap;
    }

    function wrapperDe(id) {
        return document.querySelector('.multi[data-for="' + id + '"]');
    }

    global.RI_MULTI = {
        construir: construir,
        /* Valores elegidos en un filtro ([] = sin filtro). Si el filtro
           todavía no es múltiple, se lee el <select> normal. */
        valoresDe: function (id) {
            var w = wrapperDe(id);
            if (!w) {
                var sel = document.getElementById(id);
                var v = sel ? sel.value : '';
                return v ? [String(v)] : [];
            }
            return Object.keys(w._sel);
        },
        setValores: function (id, arr) {
            var w = wrapperDe(id);
            if (!w) {
                var sel = document.getElementById(id);
                if (sel) sel.value = (arr && arr.length) ? arr[0] : '';
                return;
            }
            w._aplicar(arr || []);
        },
        limpiar: function (id) {
            var w = wrapperDe(id);
            if (!w) {
                var sel = document.getElementById(id);
                if (sel) sel.value = '';
                return;
            }
            w._aplicar([]);
        },
        cerrarTodos: function () {
            Array.prototype.forEach.call(document.querySelectorAll('.multi'), function (w) {
                var box = w.querySelector('.multi__box');
                if (box) box.hidden = true;
                var btn = w.querySelector('.multi__btn');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });
        }
    };
})(window);
