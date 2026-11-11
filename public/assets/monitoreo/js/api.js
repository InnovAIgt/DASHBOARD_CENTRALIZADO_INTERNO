/* =========================================================
   Red Intelfon · Módulo unificado de datos (Apps Script + Alternativo)
   ---------------------------------------------------------
   - fetchAll(): obtiene y normaliza ambas fuentes
   - getResumen(): KPIs globales para "Dashboard Centralizado"
   - getEmpresas(): lista de empresas con métricas para "Reportes Generales"
   - getEmpresa(nombre): detalle completo para "Reportes Personales"
   ========================================================= */
(function (global) {
    'use strict';

    /* Hoja de Analytics (Apps Script): SEGUNDA fuente de datos, junto con
       la 2ª API. El despliegue tiene que estar publicado como "Cualquier
       usuario": si devuelve HTML (pide login de Google) o no responde,
       fetchAppsScript rechaza y esa fuente queda fuera SÓLO en esta
       sesión, sin romper el panel (lo que falta lo pinta la 2ª API). */
    var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwV2FR9r5S2WNSzEy6kY86lcWsxmPvlWUa2Jr6G0cuCkBoytsWDjJ6I2Iq_AS83CteD/exec';
    var API_BASE_URL = 'https://controlapi-oz42.onrender.com';

    /* Mismo patrón que la 2ª API: la hoja se llama a través del proxy de
       server.js. El navegador NO puede llamarla directo (script.google.com
       no manda Access-Control-Allow-Origin y sale el aviso "No
       'Access-Control-Allow-Origin' header…"). Se prueban varias rutas por
       si la página corre en otro puerto; la URL directa queda como último
       recurso para quien sirva la página sin este servidor. */
    var HOJA_URLS = [];
    if (typeof location !== 'undefined' && location.protocol !== 'https:') {
        HOJA_URLS.push(
            'http://127.0.0.1:8787/api/hoja?u=' + encodeURIComponent(APPS_SCRIPT_URL),
            'http://localhost:8787/api/hoja?u=' + encodeURIComponent(APPS_SCRIPT_URL)
        );
    }
    HOJA_URLS.push(API_BASE_URL + '/api/hoja?u=' + encodeURIComponent(APPS_SCRIPT_URL));
    HOJA_URLS.push(APPS_SCRIPT_URL);

    /* La API de cumplimiento NO permite CORS: se llama SIEMPRE a través del
       proxy Node (que la consume desde el servidor y la reenvía con
       Access-Control-Allow-Origin: *).
       En desarrollo se prioriza el proxy local aunque la página esté abierta
       desde Live Server; en producción se usa el Web Service de Render. */
    var ALT_API_URLS = [];

    /* En desarrollo se usa primero el proxy local, aunque la página se abra
       desde Live Server en otro puerto. En producción se usa el Web Service. */
    if (typeof location !== 'undefined' && location.protocol !== 'https:') {
        ALT_API_URLS.push(
            'http://127.0.0.1:8787/api/alt/overview',
            'http://localhost:8787/api/alt/overview',
            '/api/alt/overview'
        );
    } else {
        ALT_API_URLS.push(API_BASE_URL + '/api/alt/overview');
    }

    var cache = null;
    var cacheTs = 0;
    var CACHE_TTL = 60000; // 1 minuto
    var pendiente = null;   // petición en curso (compartida por todos los widgets)

    /* Segunda fuente conectada (vía proxy). Si el proxy no está corriendo,
       fetchAlternativo() lo detecta y la fuente queda desactivada en esta
       sesión sin romper la pantalla. */
    var ALT_HABILITADA = true;

    /* Caché en localStorage: la última respuesta válida se pinta al instante
       (sin esperar los 1.5-3 s de Apps Script) y en segundo plano se refresca.
       Así se evita la pantalla en blanco al entrar o al cambiar de vista. */
    var LS_KEY = 'ri_datos_v10';  // v10: de nuevo las 2 fuentes (hoja + 2ª API)
    var LS_TTL = 300000; // 5 minutos: se pinta al instante y en segundo plano
                         // se refresca (la pantalla nunca queda en blanco)

    function leerLocal() {
        try {
            var raw = localStorage.getItem(LS_KEY);
            if (!raw) return null;
            var o = JSON.parse(raw);
            if (!o || !o.data || !o.ts) return null;
            if (Date.now() - o.ts > LS_TTL) return null;
            /* Nunca se pinta un fallo guardado: si la 2ª API no respondió,
               se espera a la red en vez de clavar ceros/aviso viejos.
               (También limpia entradas ya envenenadas por versiones previas.) */
            if (esFallo(o.data)) {
                try { localStorage.removeItem(LS_KEY); } catch (e2) { /* ignore */ }
                return null;
            }
            return o;
        } catch (e) { return null; }
    }

    /* `alternativo.error` viene de VACIO_ALT: la 2ª API no respondió y los
       datos de plataforma no son reales. `ri:refresh` no tiene oyentes, así
       que lo que se pinta no se corrige solo: hay que guardarlo bien. */
    function esFallo(d) {
        return !!(d && d.alternativo && d.alternativo.error);
    }

    function guardarLocal() {
        try {
            if (!cache || esFallo(cache)) return;
            localStorage.setItem(LS_KEY, JSON.stringify({ ts: cacheTs, data: cache }));
        } catch (e) { /* sin espacio o modo privado: se ignora */ }
    }

    function fetchJSON(url, opts) {
        opts = opts || {};
        /* no-store: nunca servir una respuesta vieja/rota del caché HTTP
           del navegador (era lo que obligaba a Ctrl+F5) */
        if (!opts.cache) opts.cache = 'no-store';
        return fetch(url, opts).then(function (res) {
            if (res.ok) return res.json();
            /* Los errores suelen traer un JSON explicativo (falta la clave,
               servidor caído, hoja con login…): se conserva ese texto y el
               cuerpo, en vez de quedarse con un "HTTP 502" sin más. */
            return res.json()['catch'](function () { return null; }).then(function (j) {
                var e = new Error((j && (j.error || j.message)) ||
                    ('HTTP ' + res.status + ' ' + res.statusText));
                e.status = res.status;
                e.respuesta = j;
                throw e;
            });
        });
    }

    /* Devuelve el JSON de la hoja. Se intenta por el proxy del servidor y,
       si no hay proxy disponible, directo. Si la respuesta viene con un
       error claro (login de Google, URL inválida…), NO se prueba la ruta
       siguiente: eso sólo repetiría el error o volvería a provocar el aviso
       de CORS. Si en vez de JSON llega una página HTML, el despliegue del
       script dejó de ser público y se explica claro en lugar del error de
       parseo ("Unexpected token '<'"). */
    function fetchAppsScript(i) {
        i = i || 0;
        if (i >= HOJA_URLS.length) {
            return Promise.reject(new Error('Apps Script: sin ruta disponible'));
        }
        return fetchJSON(HOJA_URLS[i]).then(function (data) {
            if (!data || !data.ok) {
                var e = new Error((data && data.error) ||
                    'Apps Script: respuesta inválida (ok=false)');
                e.definitivo = true;      // respuesta del propio script
                throw e;
            }
            return data;
        })['catch'](function (e) {
            var m = String((e && e.message) || e);
            if (m.indexOf('Unexpected token') !== -1 || m.indexOf('doctype') !== -1) {
                throw new Error('la URL de la hoja devuelve una página de login de Google (el despliegue ya no es público)');
            }
            if (e && (e.definitivo || (e.respuesta && e.respuesta.error))) throw e;
            /* Esa ruta no funcionó (404 del Live Server, servidor caído…):
               se prueba la siguiente antes de rendirse */
            if (i + 1 >= HOJA_URLS.length) throw e;
            return fetchAppsScript(i + 1);
        });
    }

    function fetchAlternativo(i) {
        i = i || 0;
        if (i >= ALT_API_URLS.length) {
            return Promise.reject(new Error('Alternativo: proxy no disponible'));
        }
        return fetchJSON(ALT_API_URLS[i]).then(function (data) {
            if (!data || data.error || data.ok === false) {
                throw new Error('Alternativo: ' + ((data && data.error) || 'respuesta inválida'));
            }
            return data;
        }).catch(function (e) {
            /* Esa ruta no funcionó (404 del Live Server, proxy caído...):
               se prueba la siguiente antes de rendirse */
            return fetchAlternativo(i + 1);
        });
    }

    // ---------- Normalización ----------
    /* Empresas de prueba: NO aparecen en ningún panel (Reportes, dashboard,
       control diario, alertas ni filtros). Se excluye ya en la fuente para
       que todo lo que se derive de aquí (filas, empresas, agregados) las
       deje fuera automáticamente. */
    var EMPRESAS_OCULTAS = ['DEMO'];

    function esOculta(nombre) {
        var n = String(nombre == null ? '' : nombre).trim().toUpperCase();
        return EMPRESAS_OCULTAS.indexOf(n) !== -1;
    }

    /* Dashboards sin nombre: NO aparecen en ningún panel (tarjetas,
       tablas, mapa de calor, filtros ni exportaciones), igual que las
       empresas ocultas. Analytics devuelve "Página sin título" para los
       dashboards copiados/creados sin título, y así sale un bloque con
       ese texto en vez de un nombre real. */
    var DASHBOARDS_OCULTOS = ['PAGINA SIN TITULO'];

    /* Mayúsculas + sin acentos + espacios simples: así se compara igual
       "Página sin título", "PÁGINA SIN TÍTULO" o "Pagina sin titulo". */
    function nombreLimpio(s) {
        return String(s == null ? '' : s)
            .trim()
            .toUpperCase()
            .replace(/\s+/g, ' ')
            .replace(/[ÁÀÄÂÃ]/g, 'A')
            .replace(/[ÉÈËÊ]/g, 'E')
            .replace(/[ÍÌÏÎ]/g, 'I')
            .replace(/[ÓÒÖÔÕ]/g, 'O')
            .replace(/[ÚÙÜÛ]/g, 'U')
            .replace(/Ñ/g, 'N');
    }

    /* =========================================================
       Clave normalizada de empresa
       ---------------------------------------------------------
       La hoja de Analytics y la 2ª API escriben el mismo cliente
       con distinto texto:
         Analytics  -> "CORPORACION YANTARNI S.A"
         2ª API     -> "CORPORACION YANTARNI, SOCIEDAD ANONIMA"
       Sin esta clave salía DOS veces la misma empresa (con dos
       números de sesiones distintos). Se reduce a minúsculas
       comunes: sin acentos, sin puntuación, sin letras sueltas
       (S · A · C · V) ni formas societarias (SA, SOCIEDAD,
       ANONIMA, DE C.V…), dejando el nombre "base".
       ========================================================= */
    var FORMAS_SOCIETARIAS = {
        SA: 1, SAS: 1, S: 1, A: 1, SRL: 1, LTDA: 1, CV: 1, CIA: 1, CO: 1,
        DE: 1, DEL: 1, SOCIEDAD: 1, ANONIMA: 1, ANONIMAS: 1, ANONIMO: 1,
        ANON: 1, ANONIMOS: 1, SOC: 1, LIMITADA: 1, COMPAÑIA: 1, COMPANY: 1
    };

    function claveEmpresa(nombre) {
        var limpio = nombreLimpio(nombre)
            .replace(/[^A-Z0-9 ]/g, ' ')   // puntuación -> espacio
            .replace(/\s+/g, ' ')
            .trim();
        if (!limpio) return '';
        return limpio.split(' ').filter(function (p) {
            if (!p) return false;
            if (p.length === 1) return false;          // S · A · C · V
            return !FORMAS_SOCIETARIAS[p];             // SA · SOCIEDAD · ANONIMA…
        }).join(' ');
    }

    /* true si el dashboard (tipo o título de Analytics) está en la lista
       de ocultos. En `titulo` se busca CONTENIDO porque Analytics arma
       "Copia de … › Página sin título". */
    function esDashboardOculto(row) {
        if (!row) return false;
        if (DASHBOARDS_OCULTOS.indexOf(nombreLimpio(row.TIPO_DASHBOARD)) !== -1) return true;
        var titulo = nombreLimpio(row.TITULO_ANALYTICS);
        if (!titulo) return false;
        return DASHBOARDS_OCULTOS.some(function (d) { return titulo.indexOf(d) !== -1; });
    }

    function normalizeAppsScript(raw) {
        var empresas = {};
        var areas = {};
        var datos = (raw.datos || []).filter(function (row) {
            return !esOculta(row.EMPRESA) && !esDashboardOculto(row);
        });

        // Agrupar por empresa (desde .datos)
        datos.forEach(function (row) {
            var nombre = row.EMPRESA;
            if (!empresas[nombre]) {
                empresas[nombre] = {
                    nombre: nombre,
                    claveAnalytics: row.CLAVE_ANALYTICS,
                    dashboards: [],
                    totales: { usuarios: 0, sesiones: 0, vistas: 0, eventos: 0, segundos: 0 }
                };
            }
            var e = empresas[nombre];
            e.dashboards.push({
                tipo: row.TIPO_DASHBOARD,
                titulo: row.TITULO_ANALYTICS,
                activo: row.ACTIVO === 'SI',
                usuariosActivos: row.USUARIOS_ACTIVOS,
                sesiones: parseNum(row.SESIONES),
                vistas: parseNum(row.VISTAS),
                eventos: parseNum(row.TOTAL_EVENTOS),
                tiempoMedio: row.TIEMPO_INTERACCION_MEDIO_POR_SESION,
                sesionesConInteraccion: parseNum(row.SESIONES_CON_INTERACCION),
                pctInteraccion: parseNum(row.PORCENTAJE_INTERACCIONES),
                usuariosRecurrentes: row.USUARIOS_RECURRENTES,
                totalUsuarios: row.TOTAL_USUARIOS,
                primerAcceso: row.PRIMER_ACCESO,
                ultimoAcceso: row.ULTIMO_ACCESO,
                ultimaActividad: row.ULTIMA_ACTIVIDAD,
                navegadores: row.NAVEGADORES,
                sistemas: row.SISTEMAS_OPERATIVOS,
                dispositivos: row.CATEGORIAS_DISPOSITIVO,
                ciudades: row.CIUDADES,
                paises: row.PAISES,
                regiones: row.REGIONES,
                fuentes: row.FUENTES_SESION,
                urls: row.URL_PAGINAS,
                eventos: row.EVENTOS
            });
            // Sumar totales
            e.totales.usuarios += row.USUARIOS_ACTIVOS || 0;
            e.totales.sesiones += parseNum(row.SESIONES) || 0;
            e.totales.vistas += parseNum(row.VISTAS) || 0;
            e.totales.eventos += parseNum(row.TOTAL_EVENTOS) || 0;
        });

        // Enriquecer con .grupos.empresas (datos agregados más limpios)
        if (raw.grupos && raw.grupos.empresas) {
            Object.keys(raw.grupos.empresas).forEach(function (nombre) {
                if (esOculta(nombre)) return;
                var g = raw.grupos.empresas[nombre];
                if (empresas[nombre]) {
                    Object.assign(empresas[nombre], {
                        usuarios: g.usuarios,
                        sesiones: g.sesiones,
                        sesionesConInteraccion: g.sesionesConInteraccion,
                        segundos: g.segundos,
                        nuevos: g.nuevos,
                        recurrentes: g.recurrentes
                    });
                }
            });
        }

        // Áreas / tipos de dashboard
        if (raw.grupos && raw.grupos.areas) {
            Object.keys(raw.grupos.areas).forEach(function (nombre) {
                var a = raw.grupos.areas[nombre];
                areas[nombre] = {
                    nombre: nombre,
                    usuarios: a.usuarios,
                    sesiones: a.sesiones,
                    sesionesConInteraccion: a.sesionesConInteraccion,
                    segundos: a.segundos,
                    nuevos: a.nuevos,
                    recurrentes: a.recurrentes
                };
            });
        }

        // Resumen global
        var resumen = raw.resumen || {};
        var desgloses = raw.desgloses || {};

        return {
            source: 'appsscript',
            actualizado: raw.actualizado,
            totalRegistros: datos.length,
            resumen: {
                usuariosActivos: resumen.usuariosActivos,
                sesiones: resumen.sesiones,
                vistas: resumen.vistas,
                eventos: resumen.eventos,
                usuariosTotales: resumen.usuariosTotales,
                sesionesConInteraccion: resumen.sesionesConInteraccion,
                segundosInteraccion: resumen.segundosInteraccion
            },
            desgloses: desgloses,
            empresas: empresas,
            areas: areas,
            datosRaw: datos
        };
    }

    /* La 2ª API NO trae geolocalización en `users` (el campo country_name
       ni siquiera existe allí: claves = active_days, avg_session_seconds,
       display_name, exports, interactions, last_access, sessions,
       total_session_seconds, username, user_id).
       La ubicación real está en `last_session_by_user`: aquí se indexa
       para poder rellenar país y ciudad de cada usuario/empresa. */
    function indexarSesiones(raw) {
        var porId = {}, porUsuario = {};
        (raw.last_session_by_user || []).forEach(function (s) {
            if (s.user_id !== undefined && s.user_id !== null) porId[s.user_id] = s;
            var k = String(s.username || '').toUpperCase();
            if (k) porUsuario[k] = s;
        });
        return function (u) {
            return porId[u.user_id] || porUsuario[String(u.username || '').toUpperCase()] || null;
        };
    }

    /* Último recurso (empresas sin ninguna sesión geolocalizada):
       el código de cliente lleva el ISO del país al final
       (CL000103GT -> GT = Guatemala · CL000001SV -> SV = El Salvador). */
    var ISO_PAISES = {
        GT: 'Guatemala', SV: 'El Salvador', HN: 'Honduras', NI: 'Nicaragua',
        CR: 'Costa Rica', PA: 'Panamá', BZ: 'Belice', MX: 'México',
        DO: 'República Dominicana', CO: 'Colombia', PE: 'Perú', CU: 'Cuba',
        PR: 'Puerto Rico', US: 'Estados Unidos'
    };
    function paisDeCodigo(username) {
        var m = /^CL\d{6}([A-Za-z]{2})$/.exec(String(username || ''));
        return (m && ISO_PAISES[m[1].toUpperCase()]) || null;
    }

    /* =========================================================
       Calendario completo (días y horas vacíos)
       ---------------------------------------------------------
       La 2ª API sólo devuelve los días con SESIONES y las horas
       con actividad: faltaban los fines de semana y HOY, así la
       gráfica y la tabla se quedaban atrás de la fecha real
       (el "daily" terminaba el 2026-10-09 aunque ya éramos 12).
       Aquí se agregan SÓLO filas vacías (sessions:0/users:0),
       sin tocar ningún total. Es idempotente: si el proxy ya
       completó la respuesta, no cambia nada.
       ========================================================= */
    var ISO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

    function completarDiario(daily, desde, hasta) {
        var lista = Array.isArray(daily) ? daily : [];
        var hoy = fechaDeTs(Date.now());
        /* Nunca más allá de HOY; si el rango pedido (?to=) termina
           antes, se respeta ese tope. */
        var fin = (hasta && ISO_FECHA.test(hasta) && hasta < hoy) ? hasta : hoy;
        var primero = (lista[0] && ISO_FECHA.test(lista[0].day || '')) ? lista[0].day : null;
        var inicio = (desde && ISO_FECHA.test(desde)) ? desde : primero;
        if (!inicio || inicio > fin) return lista;

        var tIni = tsDeFecha(inicio);
        var tFin = tsDeFecha(fin);
        if (!tIni || !tFin || tFin < tIni || (tFin - tIni) / 86400000 > 400) return lista;

        var porDia = {};
        lista.forEach(function (d) { if (d && d.day) porDia[d.day] = d; });

        var out = [];
        var d = new Date(tIni);
        for (var i = 0; i <= 400; i++) {
            var f = fechaDeTs(d.getTime());
            out.push(porDia[f] || { day: f, sessions: 0, users: 0 });
            if (f >= fin) break;
            d.setDate(d.getDate() + 1);   // avanza por calendario (sin sorpresas de horario de verano)
        }
        return out;
    }

    /* Las 24 horas del día, con 0 donde no hubo sesiones */
    function completarHoras(hourly) {
        var lista = Array.isArray(hourly) ? hourly : [];
        var porHora = {};
        lista.forEach(function (h) {
            if (h && h.hour !== undefined && h.hour !== null) porHora[Number(h.hour)] = h;
        });
        var out = [];
        for (var h = 0; h < 24; h++) out.push(porHora[h] || { hour: h, sessions: 0 });
        return out;
    }

    function normalizeAlternativo(raw) {
        var empresas = {};
        var usuariosInt = [];   // usuarios de la plataforma (admin, etc.): NO son empresas
        var sesionDe = indexarSesiones(raw);

        (raw.users || []).forEach(function (u) {
            var username = String(u.username || '');
            var nombre = u.display_name || u.username;
            var sesion = sesionDe(u) || {};
            /* Empresas/usuarios de prueba (DEMO): fuera de todo */
            if (esOculta(nombre) || esOculta(username)) return;
            /* Sólo los códigos de cliente (CLxxxxxx) son empresas.
               El resto (admin, RFUENTES...) son usuarios internos. */
            if (!/^CL\d{6}/i.test(username)) {
                usuariosInt.push({
                    id: u.user_id,
                    username: username,
                    nombre: nombre,
                    sesiones: u.sessions || 0,
                    diasActivos: u.active_days || 0,
                    segundos: u.total_session_seconds || 0,
                    interacciones: u.interactions || 0,
                    ultimoAcceso: u.last_access || null,
                    pais: sesion.country_name || u.country_name || null
                });
                return;
            }
            if (!empresas[nombre]) empresas[nombre] = { nombre: nombre, dashboards: [], origen: 'alternativo' };
            var e = empresas[nombre];
            e.usuarioId = u.user_id;
            e.username = username;
            e.sesiones = u.sessions;
            e.usuarios = u.active_days; // días activos como proxy
            e.segundosTotales = u.total_session_seconds;
            e.segundosMedios = u.avg_session_seconds;
            e.interacciones = u.interactions;
            e.exports = u.exports;
            e.ultimoAcceso = u.last_access;
            /* País: 1) ISO del código de cliente (CL000103GT -> Guatemala),
                      que es el país REAL de la empresa y coincide con el
                      que reporta la 2ª API;
                      2) geolocalización de la última sesión (puede quedar
                      en otro país si la empresa conectó desde otro lugar);
                      3) country_name si algún día lo trae `users` */
            e.pais = paisDeCodigo(username) || sesion.country_name || u.country_name || null;
            e.ciudad = sesion.latitude && sesion.longitude
                ? sesion.latitude + ',' + sesion.longitude
                : null;
        });

        // Reportes -> dashboards de cada empresa (sólo si el cliente ya existe:
        // así no se inventan "empresas" con el nombre de un reporte)
        (raw.reports || []).forEach(function (r) {
            var key = Object.keys(empresas).find(function (k) {
                return empresas[k].username === r.client_code;
            });
            if (!key) return;
            empresas[key].dashboards.push({
                id: r.report_id,
                tipo: r.report_name,
                opens: r.opens
            });
        });

        return {
            source: 'alternativo',
            generatedAt: raw.generated_at,
            rangeMode: raw.range_mode,
            summary: raw.summary,
            daily: completarDiario(raw.daily, raw.from, raw.to),
            hourly: completarHoras(raw.hourly),
            users: raw.users,
            usuariosInt: usuariosInt,
            lastSessions: raw.last_session_by_user,
            eventTypes: raw.event_types,
            reports: raw.reports,
            devices: raw.devices_global,
            countries: raw.countries_latest,
            platforms: raw.dashboards_by_platform,
            empresas: empresas
        };
    }

    function parseNum(v) {
        if (v === undefined || v === null || v === '') return 0;
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
            // fechas raras tipo "1900-01-02T06:02:04.000Z" -> 0
            if (v.match(/^\d{4}-\d{2}-\d{2}T/)) return 0;
            var n = parseFloat(v.replace(',', '.'));
            return isNaN(n) ? 0 : n;
        }
        return 0;
    }

    // ---------- Fusión ----------
    /* Códigos de cliente comparables: "CL000640GT" (2ª API, con el país al
       final) y "CL000640" (hoja) son el MISMA empresa. Devuelve '' si no
       es un código de cliente. */
    function claveCliente(c) {
        var m = /^CL\d{6}/i.exec(String(c == null ? '' : c).trim());
        return m ? m[0].toUpperCase() : '';
    }

    /* Nombre comparable (mayúsculas, sin acentos ni puntuación) para
       emparejar la hoja con la 2ª API cuando los textos difieren en
       comas/puntos ("YANTARNI S.A" ≈ "YANTARNI, SOCIEDAD ANONIMA" sólo
       si coinciden literalmente ya normalizados). */
    function nombreClave(s) {
        return nombreLimpio(s).replace(/[^A-Z0-9]/g, '');
    }

    function mergeData(appData, altData) {
        var mergedEmpresas = {};

        /* Índices de la 2ª API: por clave exacta, por código de cliente y
           por nombre normalizado (así una empresa de la hoja se lleva sus
           datos REALES de la 2ª API aunque el texto no sea idéntico). */
        var altPorCodigo = {}, altPorNombre = {}, tomados = {};
        Object.keys(altData.empresas).forEach(function (k) {
            var b = altData.empresas[k];
            var cod = claveCliente(b.username);
            if (cod && !altPorCodigo[cod]) altPorCodigo[cod] = b;
            var nn = nombreClave(b.nombre || k);
            if (nn && !altPorNombre[nn]) altPorNombre[nn] = b;
        });

        function buscarALT(nombre, a) {
            /* 1) misma clave exacta */
            if (altData.empresas[nombre] && !tomados[nombre]) return { b: altData.empresas[nombre], key: nombre };
            /* 2) mismo código de cliente (clave analytics ↔ username) */
            var cod = claveCliente(a.claveAnalytics);
            if (cod && altPorCodigo[cod] && !tomados[altPorCodigo[cod].nombre]) {
                return { b: altPorCodigo[cod], key: altPorCodigo[cod].nombre };
            }
            /* 3) mismo nombre ya normalizado */
            var nn = nombreClave(nombre);
            if (nn && altPorNombre[nn] && !tomados[altPorNombre[nn].nombre]) {
                return { b: altPorNombre[nn], key: altPorNombre[nn].nombre };
            }
            return null;
        }

        function armar(nombre, a, b) {
            b = b || {};
            var primerAcceso = 0;
            (a.dashboards || []).forEach(function (d) {
                var t = parseFecha(d.primerAcceso);
                if (t && (!primerAcceso || t < primerAcceso)) primerAcceso = t;
            });
            mergedEmpresas[nombre] = {
                nombre: nombre,
                // Apps Script
                claveAnalytics: a.claveAnalytics,
                dashboardsAS: a.dashboards || [],
                totalesAS: a.totales || {},
                usuariosAS: a.usuarios,
                sesionesAS: a.sesiones,
                segundosAS: a.segundos,
                nuevosAS: a.nuevos,
                recurrentesAS: a.recurrentes,
                primerAccesoAS: primerAcceso,
                // Alternativo
                usuarioId: b.usuarioId,
                username: b.username,
                sesionesALT: b.sesiones,
                usuariosALT: b.usuarios,
                segundosTotalesALT: b.segundosTotales,
                segundosMediosALT: b.segundosMedios,
                interaccionesALT: b.interacciones,
                exportsALT: b.exports,
                ultimoAccesoALT: b.ultimoAcceso,
                paisALT: b.pais,
                ciudadALT: b.ciudad,
                dashboardsALT: b.dashboards || [],
                // Combinados
                combined: (function () {
                    var sesAS = (a.sesiones || (a.totales && a.totales.sesiones) || 0);
                    var hayALT = b.sesiones !== undefined && b.sesiones !== null;
                    var sesALT = hayALT ? parseNum(b.sesiones) || 0 : null;
                    return {
                        /* SESIONES DE LA EMPRESA:
                           · si es usuaria de la 2ª API mandan las sesiones
                             de sus USUARIOS (la tabla real de la 2ª API:
                             ARANA 8 · WACKENHUT 4 · INTELFON 2 · …);
                           · si no existe en la 2ª API, se conservan las de
                             Analytics.
                           NUNCA se suman las dos fuentes (salían números
                           dobles, p. ej. YANTARNI 8+1 = 9 en vez de 1).
                           Los valores de la hoja siguen intactos en
                           sesionesAS / totalesAS / dashboardsAS. */
                        sesiones: hayALT ? sesALT : sesAS,
                        usuarios: Math.max(a.usuarios || 0, b.usuarios || 0),
                        eventos: (a.totales && a.totales.eventos) || 0,
                        vistas: (a.totales && a.totales.vistas) || 0,
                        segundos: hayALT ? (parseNum(b.segundosTotales) || 0)
                            : (a.segundos || 0),
                        sesionesAS: sesAS,
                        sesionesALT: sesALT
                    };
                })()
            };
        }

        /* 1ª pasada: empresas de la hoja (con su par de la 2ª API si existe) */
        Object.keys(appData.empresas).forEach(function (nombre) {
            var a = appData.empresas[nombre];
            var en = buscarALT(nombre, a);
            if (en) tomados[en.key] = true;
            armar(nombre, a, en ? en.b : null);
        });

        /* 2ª pasada: empresas que sólo existen en la 2ª API (no se duplican
           las que ya se fusionaron en la pasada anterior) */
        Object.keys(altData.empresas).forEach(function (k) {
            if (tomados[k] || mergedEmpresas[k]) return;
            tomados[k] = true;
            armar(k, {}, altData.empresas[k]);
        });

        return {
            timestamp: Date.now(),
            appscript: appData,
            alternativo: altData,
            empresas: mergedEmpresas,
            resumenGlobal: {
                usuariosActivos: (appData.resumen?.usuariosActivos || 0) + (altData.summary?.active_users || 0),
                sesionesTotales: (appData.resumen?.sesiones || 0) + (altData.summary?.sessions || 0),
                vistasTotales: appData.resumen?.vistas || 0,
                eventosTotales: (appData.resumen?.eventos || 0) + (altData.summary?.interactions || 0),
                reportOpens: altData.summary?.report_opens || 0,
                dashboardsActivos: altData.summary?.active_dashboards || 0,
                plataformas: altData.platforms || []
            }
        };
    }

    // ---------- API pública ----------
    /* Una sola petición en vuelo: los 4-9 widgets que piden datos a la vez
       comparten la misma llamada (antes cada uno abría la suya). */
    function pedir() {
        if (pendiente) return pendiente;

        /* LAS DOS FUENTES, en paralelo: la hoja de Analytics (Apps Script)
           y la 2ª API (vía proxy con API key). Cada una se degrada por su
           cuenta: si una cae, la otra sigue pintando el panel. */
        var app = fetchAppsScript().then(normalizeAppsScript).catch(function (e) {
            console.warn('[API] Apps Script falló:', e.message);
            var vacia = normalizeAppsScript({ datos: [], grupos: {}, desgloses: {} });
            vacia.error = e.message;   // para que la UI avise que falta la hoja
            return vacia;
        });

        /* Si la 2ª API cae, se marca `error: true` para que la UI avise
           en vez de pintar ceros silenciosos ("data vacía"). */
        var VACIO_ALT = function (motivo) {
            return { empresas: {}, summary: {}, reports: [], error: motivo || true };
        };

        var alt = ALT_HABILITADA
            ? fetchAlternativo().then(normalizeAlternativo).catch(function (e) {
                console.warn('[API] Alternativo falló:', e.message);
                return VACIO_ALT('No se pudo conectar con la 2ª API (' + e.message + ')');
            })
            : Promise.resolve(VACIO_ALT('2ª API deshabilitada'));

        pendiente = Promise.all([app, alt]).then(function (results) {
            pendiente = null;
            cache = mergeData(results[0], results[1]);
            cacheTs = Date.now();
            guardarLocal();
            try {
                global.dispatchEvent(new CustomEvent('ri:refresh'));
            } catch (e) { /* no soportado */ }
            return cache;
        }, function (e) {
            /* No se cachea el fallo: el siguiente intento vuelve a pedir */
            pendiente = null;
            throw e;
        });
        return pendiente;
    }

    function fetchAll(force) {
        var now = Date.now();

        if (!force && cache && (now - cacheTs < CACHE_TTL)) {
            return Promise.resolve(cache);
        }
        if (!force && pendiente) return pendiente;

        if (!force) {
            /* Nada fresco en memoria: si hay un guardado reciente en
               localStorage, se pinta ya y la red corre en segundo plano. */
            var loc = leerLocal();
            if (loc) {
                cache = loc.data;
                cacheTs = Date.now();  /* se trata como recién pintado: el
                                          resto de widgets también responde ya */
                pedir().catch(function (e) {
                    console.warn('[API] Refresco falló:', e.message);
                });
                return Promise.resolve(cache);
            }
        }

        /* Sin nada guardado: hay que esperar a la red */
        return pedir();
    }

    function getResumen() {
        return fetchAll().then(function (data) {
            return data.resumenGlobal;
        });
    }

    /* Datos de la 2ª API (plataforma de cumplimiento) para paneles propios */
    function getPlataforma() {
        return fetchAll().then(function (data) {
            var alt = data.alternativo || {};
            var s = alt.summary || {};
            var n = function (v) { return parseNum(v); };
            return {
                generado: alt.generatedAt || null,
                /* Motivo del fallo si la 2ª API no respondió (si no, null) */
                error: alt.error || null,
                resumen: {
                    sesiones: n(s.sessions),
                    usuarios: n(s.active_users),
                    tiempoPromedio: n(s.avg_session_seconds),
                    tiempoTotal: n(s.total_session_seconds),
                    interacciones: n(s.interactions),
                    exportaciones: n(s.exports),
                    filtros: n(s.filters),
                    aperturas: n(s.report_opens),
                    dashboards: n(s.total_dashboards),
                    dashboardsActivos: n(s.active_dashboards),
                    logins: n(s.global_logins)
                },
                diario: (alt.daily || []).map(function (d) {
                    return { fecha: d.day, sesiones: n(d.sessions), usuarios: n(d.users) };
                }),
                porHora: (alt.hourly || []).map(function (h) {
                    return { hora: n(h.hour), sesiones: n(h.sessions) };
                }),
                usuariosInt: (alt.usuariosInt || []).slice(),
                topReportes: (alt.reports || []).map(function (r) {
                    return { cliente: r.client_code, nombre: r.report_name, aperturas: n(r.opens) };
                }).sort(function (a, b) { return b.aperturas - a.aperturas; }),
                eventos: (alt.eventTypes || []).map(function (e) {
                    return { tipo: e.event_type, total: n(e.total) };
                }).sort(function (a, b) { return b.total - a.total; }).slice(0, 8),
                dispositivos: (alt.devices || []).map(function (d) {
                    return { nombre: d.device, sesiones: n(d.sessions), pct: parseFloat(d.percentage) || 0 };
                }),
                paises: (alt.countries || []).map(function (c) {
                    return { nombre: c.country_name, usuarios: n(c.users), codigo: c.country_code };
                }),
                plataformas: (alt.platforms || []).map(function (p) {
                    return { nombre: p.platform, dashboards: n(p.dashboards) };
                })
            };
        });
    }

    // País dominante de una empresa (según el campo PAISES de cada fila)
    function paisDominante(dashboards) {
        var counts = {};
        (dashboards || []).forEach(function (d) {
            String(d.paises || '').split(',').forEach(function (part) {
                part = part.trim();
                if (!part) return;
                var m = part.match(/^(.*)\((\d+)\)\s*$/);
                var nom = m ? m[1].trim() : part;
                var n = m ? parseInt(m[2], 10) : 1;
                counts[nom] = (counts[nom] || 0) + n;
            });
        });
        var best = null;
        Object.keys(counts).forEach(function (k) {
            if (k === 'Sin identificar') return;
            if (best === null || counts[k] > counts[best]) best = k;
        });
        return best;
    }

    function getEmpresas() {
        return fetchAll().then(function (data) {
            return Object.values(data.empresas).map(function (e) {
                return {
                    nombre: e.nombre,
                    claveAnalytics: e.claveAnalytics,
                    username: e.username,
                    pais: paisDominante(e.dashboardsAS) || e.paisALT || null,
                    dashboardsCount: (e.dashboardsAS?.length || 0) + (e.dashboardsALT?.length || 0),
                    sesiones: e.combined.sesiones,
                    usuarios: e.combined.usuarios,
                    eventos: e.combined.eventos,
                    vistas: e.combined.vistas,
                    segundos: e.combined.segundos,
                    paisALT: e.paisALT,
                    /* Último acceso: la 2ª API si la tiene; si no, el más
                       reciente de las filas de la hoja (nunca undefined) */
                    ultimoAcceso: e.ultimoAccesoALT || (function () {
                        var t = ultimoAccesoDe(e, Date.now());
                        return t ? new Date(t).toISOString() : null;
                    })(),
                    // para ordenar
                    _sortKey: e.combined.sesiones
                };
            }).sort(function (a, b) { return b._sortKey - a._sortKey; });
        });
    }

    // Sesiones/vistas por dashboard: acepta números y fechas Excel corruptas
    // ("1900-01-02T06:02:04.000Z" => días desde 1899-12-30 => 3)
    function parseSesiones(v) {
        if (typeof v === 'number') return v;
        var s = String(v == null ? '' : v).trim();
        if (!s) return 0;
        var m = s.match(/^(\d{4})-\d{2}-\d{2}T/);
        if (m) {
            var anio = parseInt(m[1], 10);
            // Solo fechas de la época Excel corrupta (1899-1901)
            if (anio >= 1899 && anio <= 1901) {
                var t = Date.parse(s);
                if (!isNaN(t)) return Math.max(0, Math.round((t - Date.UTC(1899, 11, 30)) / 86400000));
            }
        }
        var n = parseFloat(s.replace(',', '.'));
        return isNaN(n) ? 0 : n;
    }

    // Analítica para las tarjetas del dashboard centralizado
    function getAnalitica() {
        return fetchAll().then(function (data) {
            var app = data.appscript || {};
            var r = app.resumen || {};
            var dg = app.desgloses || {};

            var usuarios = r.usuariosActivos || 0;
            var sesiones = r.sesiones || 0;
            var conInter = r.sesionesConInteraccion || 0;
            var segTotal = r.segundosInteraccion || 0;

            // Sesiones por dashboard (top)
            var porDashboard = (app.datosRaw || []).map(function (row) {
                return {
                    titulo: row.TITULO_ANALYTICS || row.TIPO_DASHBOARD || '—',
                    empresa: row.EMPRESA || '',
                    sesiones: parseSesiones(row.SESIONES)
                };
            }).filter(function (d) { return d.sesiones > 0; })
              .sort(function (a, b) { return b.sesiones - a.sesiones; });

            /* Serie diaria de LAS DOS fuentes: la hoja (que puede ir
               atrasada) + los días que sólo trae la 2ª API (HOY).
               Así la gráfica y "último registro" llegan a la fecha
               más actual que la API ya tiene. */
            var porFechaDiario = diarioCombinado(data);
            var diario = fechasOrdenadas(porFechaDiario).map(function (f) {
                var d = porFechaDiario[f];
                return {
                    fecha: d.fecha,
                    usuarios: d.usuarios || 0,
                    sesiones: d.sesiones || 0,
                    vistas: d.vistas || 0,
                    segundos: d.segundos || 0
                };
            });

            return {
                interaccion: {
                    tiempoPorUsuario: usuarios ? segTotal / usuarios : 0,
                    sesionesPorUsuario: usuarios ? conInter / usuarios : 0,
                    tiempoPorSesion: sesiones ? segTotal / sesiones : 0,
                    tasa: sesiones ? (conInter / sesiones) * 100 : 0,
                    sesionesConInteraccion: conInter,
                    sesiones: sesiones,
                    segundosTotal: segTotal,
                    // serie diaria de tiempo de interacción (segundos)
                    serie: diario.map(function (d) { return { fecha: d.fecha, segundos: d.segundos }; })
                },
                paises: (dg.paises || []).slice(),
                usuariosActivos: usuarios,
                porDashboard: porDashboard.slice(0, 10),
                diario: diario,
                diasActividad: diario.length,
                ultimoRegistro: diario.length ? diario[diario.length - 1].fecha : null
            };
        });
    }

    // "1 min y 11 s" / "10 s" / número => segundos
    function parseTiempoMedio(v) {
        if (typeof v === 'number') return v;
        var s = String(v == null ? '' : v).trim();
        if (!s) return 0;
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return 0; // fecha corrupta
        var total = 0;
        var min = s.match(/(\d+)\s*min/i);
        var seg = s.match(/(\d+)\s*s(?!eg)/i);
        if (min) total += parseInt(min[1], 10) * 60;
        if (seg) total += parseInt(seg[1], 10);
        if (!total) {
            var n = parseFloat(s.replace(',', '.'));
            total = isNaN(n) ? 0 : n;
        }
        return total;
    }

    /* Tipos de dashboard que existen en la plataforma. El mapa de calor
       los muestra SIEMPRE, aunque ninguna empresa real tenga datos de
       alguno (p.ej. "Centro de Monitoreo" y "NFC por Usuario" sólo los
       usó la cuenta DEMO, que está oculta): así no se pierden columnas
       y salen con "—" en vez de desaparecer. */
    var TIPOS_DASHBOARD = [
        'Reporte de Llamadas General',
        'Centro de Monitoreo',
        'Llamadas por Usuario',
        'Reporte NFC General',
        'NFC por Usuario'
    ];

    // Mapa de calor: empresa x tipo de dashboard (segundos de permanencia)
    function getHeatmap() {
        return fetchAll().then(function (data) {
            var filas = {};
            var cols = {};

            (data.appscript && data.appscript.datosRaw || []).forEach(function (row) {
                var emp = row.EMPRESA;
                var tipo = row.TIPO_DASHBOARD;
                if (!emp || !tipo) return;

                var sesiones = parseSesiones(row.SESIONES);
                var conInter = parseSesiones(row.SESIONES_CON_INTERACCION);
                var seg = conInter * parseTiempoMedio(row.TIEMPO_INTERACCION_MEDIO_POR_SESION);

                if (!filas[emp]) filas[emp] = { nombre: emp, cells: {}, total: 0 };
                if (!filas[emp].cells[tipo]) filas[emp].cells[tipo] = { segundos: 0, sesiones: 0 };
                filas[emp].cells[tipo].segundos += seg;
                filas[emp].cells[tipo].sesiones += sesiones;
                filas[emp].total += seg;
                cols[tipo] = (cols[tipo] || 0) + seg;
            });

            /* Se ordena por tiempo (el mayor primero) y se completan los
               tipos que no tienen datos: quedan al final con "—" */
            var nombresCols = Object.keys(cols).sort(function (a, b) { return cols[b] - cols[a]; });
            TIPOS_DASHBOARD.forEach(function (t) {
                if (nombresCols.indexOf(t) === -1) nombresCols.push(t);
            });
            var lista = Object.keys(filas).map(function (k) { return filas[k]; })
                .sort(function (a, b) { return b.total - a.total; })
                .slice(0, 12);

            var max = 0;
            lista.forEach(function (f) {
                nombresCols.forEach(function (c) {
                    var cell = f.cells[c];
                    if (cell && cell.segundos > max) max = cell.segundos;
                });
            });

            return { cols: nombresCols, rows: lista, max: max || 1 };
        });
    }

    // Reportes generales: filas de la sub-opción "Información".
    // SÓLO 2ª API (plataforma de cumplimiento): una fila por EMPRESA
    // CLIENTE, con sus sesiones, aperturas de reporte, exportaciones e
    // interacciones reales. La hoja de Analytics ya no se consulta.
    function getReportes() {
        return fetchAll().then(function (data) {
            var alt = data.alternativo || {};
            var now = Date.now();
            var primerPorNombre = {};

            Object.keys(data.empresas || {}).forEach(function (nombre) {
                var t = data.empresas[nombre].primerAccesoAS || 0;
                if (t) {
                    primerPorNombre[nombreClave(nombre)] = t;
                }
            });

            function primerDe(nombre) {
                return primerPorNombre[nombreClave(nombre)] || 0;
            }

            function txt(v) { return v == null ? '' : String(v); }

            /* Segundos -> "1 min 11 s" (mismo formato que espera la página) */
            function duracion(seg) {
                seg = Math.round(parseNum(seg) || 0);
                if (!seg) return '—';
                if (seg < 60) return seg + ' s';
                var mn = Math.floor(seg / 60), r = seg % 60;
                return mn + ' min' + (r ? ' ' + r + ' s' : '');
            }

            /* Aperturas, reportes y nombre de cada código de cliente */
            var porCodigo = {};
            (alt.reports || []).forEach(function (r) {
                var cc = txt(r.client_code).trim().toUpperCase();
                if (!cc) return;
                if (!porCodigo[cc]) porCodigo[cc] = { aperturas: 0, reportes: [], nombre: null };
                porCodigo[cc].aperturas += parseNum(r.opens) || 0;
                var nom = txt(r.report_name).trim();
                if (nom && porCodigo[cc].reportes.indexOf(nom) === -1) porCodigo[cc].reportes.push(nom);
                /* "REPORTE GENERAL …" es el TIPO, no el nombre de la empresa */
                if (nom && !porCodigo[cc].nombre && !/^REPORTE GENERAL/i.test(nom)) porCodigo[cc].nombre = nom;
            });

            /* Última sesión de cada usuario: país, ciudad y dispositivo */
            var ultima = {};
            (alt.lastSessions || []).forEach(function (s) {
                if (s.user_id !== undefined && s.user_id !== null) ultima[s.user_id] = s;
                var k = txt(s.username).trim().toUpperCase();
                if (k) ultima[k] = s;
            });

            function montar(o) {
                return {
                    id: 0,
                    empresa: o.nombre || o.clave,
                    clave: o.clave,
                    titulo: (o.reportes && o.reportes.length) ? o.reportes.join(', ') : '—',
                    activo: o.sesiones > 0 || o.aperturas > 0,
                    /* active_days de la 2ª API (la columna se llama "Días activos") */
                    usuariosActivos: o.diasActivos,
                    sesiones: o.sesiones,
                    tiempoMedio: o.tiempoMedio,
                    aperturas: o.aperturas,
                    exportaciones: o.exportaciones,
                    interacciones: o.interacciones,
                    ultimoAcceso: o.ultimo ? new Date(o.ultimo).toISOString() : null,
                    paises: o.pais || '—',
                    ciudades: o.ciudad || '—',
                    dispositivos: o.disp || '—',
                    totalDashboards: (o.reportes || []).length,
                    /* sin datos en la 2ª API: quedan en 0 y sus columnas
                       están ocultas en la tabla */
                    vistas: 0, sesionesInteraccion: 0, pct: 0, recurrentes: 0,
                    totalUsuarios: 0, totalEventos: 0,
                    _paises: o.pais ? [o.pais] : [],
                    _dispositivos: o.disp ? [o.disp] : [],
                    _fuentes: [],
                    _ultimoTs: o.ultimo,
                    _primerTs: o.primer || primerDe(o.nombre) || 0
                };
            }

            var filas = [];
            var vistos = {};

            /* 1) Empresas con usuario en la plataforma (sólo clientes CL…) */
            (alt.users || []).forEach(function (u) {
                var username = txt(u.username).trim();
                if (!/^CL\d{6}/i.test(username)) return;
                if (esOculta(u.display_name) || esOculta(username)) return;
                var cc = username.toUpperCase();
                if (vistos[cc]) return;
                vistos[cc] = 1;
                var s = ultima[u.user_id] || ultima[cc] || {};
                var p = porCodigo[cc] || { aperturas: 0, reportes: [], nombre: null };
                var ultimo = u.last_access ? parseFecha(u.last_access) : 0;
                if (ultimo > now) ultimo = 0;
                filas.push(montar({
                    nombre: txt(u.display_name) || username,
                    clave: username,
                    sesiones: parseNum(u.sessions) || 0,
                    diasActivos: parseNum(u.active_days) || 0,
                    tiempoMedio: duracion(u.avg_session_seconds),
                    aperturas: p.aperturas,
                    exportaciones: parseNum(u.exports) || 0,
                    interacciones: parseNum(u.interactions) || 0,
                    reportes: p.reportes,
                    ultimo: ultimo,
                    primer: primerDe(txt(u.display_name) || username),
                    pais: paisDeCodigo(username) || s.country_name || null,
                    /* Coordenadas de la última sesión geolocalizada */
                    ciudad: (s.latitude != null && s.longitude != null)
                        ? (Math.round(s.latitude * 10000) / 10000) + ', ' +
                        (Math.round(s.longitude * 10000) / 10000)
                        : null,
                    disp: s.device || null
                }));
            });

            /* 2) Empresas que sólo abrieron reportes (sin sesión iniciada) */
            Object.keys(porCodigo).forEach(function (cc) {
                if (vistos[cc]) return;
                vistos[cc] = 1;
                var p = porCodigo[cc];
                filas.push(montar({
                    nombre: p.nombre || cc,
                    clave: cc,
                    sesiones: 0,
                    diasActivos: 0,
                    tiempoMedio: '—',
                    aperturas: p.aperturas,
                    exportaciones: 0,
                    interacciones: 0,
                    reportes: p.reportes,
                    ultimo: 0,
                    primer: primerDe(p.nombre || cc),
                    pais: paisDeCodigo(cc) || null,
                    ciudad: null,
                    disp: null
                }));
            });

            /* Orden: más sesiones primero; a igualdad, más aperturas */
            filas.sort(function (a, b) {
                if (b.sesiones !== a.sesiones) return b.sesiones - a.sesiones;
                if (b.aperturas !== a.aperturas) return b.aperturas - a.aperturas;
                return a.empresa.localeCompare(b.empresa, 'es');
            });
            filas.forEach(function (f, i) { f.id = i + 1; });

            function unicos(de) {
                var set = {};
                filas.forEach(function (f) {
                    de(f).forEach(function (v) { if (v) set[v] = 1; });
                });
                return Object.keys(set).sort();
            }

            return {
                filas: filas,
                resumen: {},
                actualizado: alt.generatedAt || null,
                opciones: {
                    empresas: unicos(function (f) { return [f.empresa]; }),
                    paises: unicos(function (f) { return f._paises; }),
                    tipos: [],                       // sin Analytics no hay tipos
                    dispositivos: unicos(function (f) { return f._dispositivos; }),
                    fuentes: []
                }
            };
        });
    }

    // Parser de fechas: acepta "dd/MM/yyyy HH:mm", ISO y Date
    function parseFecha(s) {
        if (!s) return 0;
        if (s instanceof Date) return s.getTime();
        var str = String(s).trim();
        var m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
        if (m) {
            return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
        }
        var t = new Date(str).getTime();
        if (isNaN(t)) return 0;
        /* Caso corrupto: "2026-11-09..." = aaaa-dd-mm (día/mes invertidos),
           y al leerlo como ISO aaaa-mm-dd QUEDA EN EL FUTURO.
           Sólo en ese caso se reinterpreta: si no, una fecha ISO válida
           como 2026-10-06 se "corrompía" a 2026-06-10 (y disparaba
           alertas rojas de días que nunca existieron). */
        if (t > Date.now()) {
            var m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})T/);
            if (m2) {
                var sw = new Date(+m2[1], +m2[3] - 1, +m2[2]).getTime();
                if (!isNaN(sw) && sw <= Date.now()) return sw;
            }
        }
        return t;
    }

    /* =========================================================
       Alertas de conexión · control diario de sesiones
       ---------------------------------------------------------
       Escala de niveles (días seguidos SIN conectarse):
         1 día               -> verde
         2 días seguidos     -> amarilla
         3 días seguidos     -> amarillo naranja
         4 días seguidos     -> naranja
         5 o más (o nunca)   -> rojo
       ========================================================= */
    var NIVELES_ALERTA = [
        null,                                                    // 0 · conectó hoy, sin alerta
        { nivel: 1, color: 'verde',            clase: 'tag-green',  hex: '#4ade80' },
        { nivel: 2, color: 'amarilla',         clase: 'tag-yellow', hex: '#facc15' },
        { nivel: 3, color: 'amarillo naranja', clase: 'tag-gold',   hex: '#f59e0b' },
        { nivel: 4, color: 'naranja',          clase: 'tag-orange', hex: '#f97316' },
        { nivel: 5, color: 'rojo',             clase: 'tag-red',    hex: '#f0333d' }
    ];

    /* Nivel de alerta a partir de los días sin conexión.
       null = nunca se registró acceso -> rojo (nivel 5). */
    function nivelDeAlerta(dias) {
        if (dias === null || dias === undefined) return NIVELES_ALERTA[5];
        if (dias <= 0) return NIVELES_ALERTA[0];
        return NIVELES_ALERTA[Math.min(dias, 5)];
    }

    /* Último acceso real: el más reciente entre Apps Script y la 2ª API
       (las fechas futuras —dato corrupto en origen— se recortan a "ahora") */
    function ultimoAccesoDe(e, now) {
        var t = parseFecha(e.ultimoAccesoALT);
        (e.dashboardsAS || []).forEach(function (d) {
            var td = parseFecha(d.ultimoAcceso) || parseFecha(d.ultimaActividad);
            if (td > t) t = td;
        });
        if (t > now) t = now;
        return t;
    }

    // Empresas con menor actividad (candidatas a "críticas")
    function getEmpresasCriticas(limit) {
        return fetchAll().then(function (data) {
            var now = Date.now();
            var list = Object.values(data.empresas).map(function (e) {
                var t = ultimoAccesoDe(e, now);
                var dias = t ? Math.max(0, Math.floor((now - t) / 86400000)) : null;
                var sesiones = e.combined.sesiones || 0;
                var nivel = nivelDeAlerta(dias);
                return {
                    nombre: e.nombre,
                    pais: paisDominante(e.dashboardsAS) || e.paisALT || null,
                    sesiones: sesiones,
                    dashboardsCount: (e.dashboardsAS?.length || 0) + (e.dashboardsALT?.length || 0),
                    ultimoAcceso: t ? new Date(t).toISOString() : null,
                    diasSinConexion: dias,
                    // nivel de alerta (color) según los días seguidos sin conexión
                    nivel: nivel ? nivel.nivel : 0,
                    color: nivel ? nivel.color : null,
                    clase: nivel ? nivel.clase : null,
                    // score: menos sesiones + más días inactiva = más crítica
                    _crit: (sesiones === 0 ? 10000 : 0) + (dias === null ? 5000 : dias * 10) + (1000 - Math.min(sesiones, 1000))
                };
            });
            list.sort(function (a, b) { return b._crit - a._crit; });
            return list.slice(0, limit || 7).map(function (e) {
                delete e._crit;
                return e;
            });
        });
    }

    /* Empresas en alerta (nivel >= 1: al menos un día sin conectarse,
       o sin sesiones). Es la lista que se le pasa al servidor para que
       compare niveles y avise por correo sólo cuando el nivel cambia. */
    function getAlertas() {
        return fetchAll().then(function (data) {
            var now = Date.now();
            return Object.values(data.empresas).map(function (e) {
                var t = ultimoAccesoDe(e, now);
                var dias = t ? Math.max(0, Math.floor((now - t) / 86400000)) : null;
                var nivel = nivelDeAlerta(dias);
                return {
                    nombre: e.nombre,
                    pais: paisDominante(e.dashboardsAS) || e.paisALT || null,
                    sesiones: e.combined.sesiones || 0,
                    diasSinConexion: dias,
                    ultimoAcceso: t ? new Date(t).toISOString() : null,
                    nivel: nivel ? nivel.nivel : 0,
                    color: nivel ? nivel.color : null
                };
            }).filter(function (a) { return a.nivel >= 1; })
              .sort(function (a, b) { return b.nivel - a.nivel; });
        });
    }

    /* Envia la lista al servidor (server.js → /api/alertas/evaluar).
       El servidor manda el correo sólo si el nivel de una empresa
       cambió respecto a la última evaluación guardada. */
    function enviarAlertas(alertas) {
        if (!alertas || !alertas.length) {
            return Promise.resolve({ ok: true, enviados: 0, cambios: 0 });
        }
        return fetch('/api/alertas/evaluar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({ origen: location.origin, alertas: alertas })
        }).then(function (r) { return r.json(); })
          .catch(function (e) {
              return { ok: false, motivo: 'Servidor de alertas: ' + e.message };
          });
    }

    // Usuarios con más tiempo sin conectarse (menor actividad reciente primero)
    function getUsuariosCriticos(limit) {
        return fetchAll().then(function (data) {
            var now = Date.now();
            var users = ((data.alternativo && data.alternativo.users) || []).slice();
            users.forEach(function (u) {
                var t = u.last_access ? new Date(u.last_access).getTime() : 0;
                u.diasSinConexion = t ? Math.max(0, Math.floor((now - t) / 86400000)) : 9999;
            });
            users.sort(function (a, b) {
                if (b.diasSinConexion !== a.diasSinConexion) return b.diasSinConexion - a.diasSinConexion;
                return (a.sessions || 0) - (b.sessions || 0); // empate: menos sesiones = más crítico
            });
            return users.slice(0, limit || 7).map(function (u) {
                return {
                    usuario: u.display_name || u.username,
                    username: u.username,
                    sesiones: u.sessions || 0,
                    diasActivo: u.active_days || 0,
                    interacciones: u.interactions || 0,
                    ultimoAcceso: u.last_access || null,
                    diasSinConexion: u.diasSinConexion === 9999 ? null : u.diasSinConexion
                };
            });
        });
    }

    // Listado completo de usuarios de la plataforma (con rol derivado)
    function getUsuarios() {
        return fetchAll().then(function (data) {
            var alt = data.alternativo || {};
            var now = Date.now();

            // Última sesión de cada usuario -> país y dispositivo reales
            var ultima = {};
            (alt.lastSessions || []).forEach(function (s) {
                ultima[s.user_id || s.username] = s;
            });

            /* `users` sólo trae los que INICIARON SESIÓN (11). Los demás
               clientes sólo aparecen en `reports` agrupados por client_code.
               Sin este mapa se perdían 7 clientes reales. */
            var porCodigo = {};
            (alt.reports || []).forEach(function (r) {
                var cc = String(r.client_code || '').trim().toUpperCase();
                if (!cc) return;
                if (!porCodigo[cc]) porCodigo[cc] = { aperturas: 0, nombre: null };
                porCodigo[cc].aperturas += parseNum(r.opens);
                var n = String(r.report_name || '').trim();
                /* "REPORTE GENERAL ..." es el TIPO de reporte, no la empresa */
                if (n && !porCodigo[cc].nombre && !/^REPORTE GENERAL/i.test(n)) {
                    porCodigo[cc].nombre = n;
                }
            });

            var lista = (alt.users || []).map(function (u) {
                var username = String(u.username || '');
                var nombre = u.display_name || username;
                var s = ultima[u.user_id] || ultima[username] || {};

                /* El rol no viene en la API: se deduce del usuario.
                   'admin' (o el que figura como Administrador) -> Administrador
                   CLxxxxxx -> Cliente (empresa)
                   El resto -> Usuario interno */
                var rol = 'Usuario interno';
                if (/^admin/i.test(username) || /admin/i.test(nombre)) rol = 'Administrador';
                else if (/^CL\d{6}/i.test(username)) rol = 'Cliente';

                var t = u.last_access ? new Date(u.last_access).getTime() : 0;
                var dias = t ? Math.max(0, Math.floor((now - t) / 86400000)) : null;

                return {
                    id: u.user_id,
                    username: username,
                    nombre: nombre,
                    rol: rol,
                    esCliente: rol === 'Cliente',
                    empresa: rol === 'Cliente' ? nombre : null,
                    sesiones: u.sessions || 0,
                    diasActivos: u.active_days || 0,
                    tiempoPromedio: parseNum(u.avg_session_seconds),
                    tiempoTotal: parseNum(u.total_session_seconds),
                    interacciones: u.interactions || 0,
                    exports: u.exports || 0,
                    aperturas: (porCodigo[username.toUpperCase()] || {}).aperturas || 0,
                    ultimoAcceso: u.last_access || null,
                    diasSinConexion: dias,
                    /* País del cliente: ISO del código (CL000103GT -> GT)
                       antes que la geolocalización de la última sesión */
                    pais: paisDeCodigo(username) || s.country_name || null,
                    ciudad: s.latitude && s.longitude ? s.latitude + ',' + s.longitude : null,
                    dispositivo: s.device || null
                };
            });

            /* Clientes que abrieron reportes pero NO tienen sesión registrada.
               Entran con rol Cliente y sus aperturas reales (sesiones 0). */
            var vistos = {};
            lista.forEach(function (u) { vistos[String(u.username).toUpperCase()] = true; });

            Object.keys(porCodigo).forEach(function (cc) {
                if (vistos[cc]) return;
                vistos[cc] = true;
                var d = porCodigo[cc];
                lista.push({
                    id: 'cc-' + cc,
                    username: cc,
                    nombre: d.nombre || cc,
                    rol: 'Cliente',
                    esCliente: true,
                    empresa: d.nombre || cc,
                    sesiones: 0,
                    diasActivos: 0,
                    tiempoPromedio: 0,
                    tiempoTotal: 0,
                    interacciones: 0,
                    exports: 0,
                    aperturas: d.aperturas,
                    ultimoAcceso: null,
                    diasSinConexion: null,
                    pais: null,
                    ciudad: null,
                    dispositivo: null,
                    soloReportes: true
                });
            });

            return lista.sort(function (a, b) {
                if (b.sesiones !== a.sesiones) return b.sesiones - a.sesiones;
                return (b.aperturas || 0) - (a.aperturas || 0);
            });
        });
    }

    function getEmpresa(nombre) {
        return fetchAll().then(function (data) {
            var e = data.empresas[nombre];
            if (!e) return null;
            return {
                nombre: e.nombre,
                claveAnalytics: e.claveAnalytics,
                username: e.username,
                usuarioId: e.usuarioId,
                pais: e.paisALT,
                ciudad: e.ciudadALT,
                ultimoAcceso: e.ultimoAccesoALT || (function () {
                    var t = ultimoAccesoDe(e, Date.now());
                    return t ? new Date(t).toISOString() : null;
                })(),
                // Apps Script
                dashboardsAS: e.dashboardsAS,
                totalesAS: e.totalesAS,
                usuariosAS: e.usuariosAS,
                sesionesAS: e.sesionesAS,
                segundosAS: e.segundosAS,
                nuevosAS: e.nuevosAS,
                recurrentesAS: e.recurrentesAS,
                // Alternativo
                dashboardsALT: e.dashboardsALT,
                sesionesALT: e.sesionesALT,
                usuariosALT: e.usuariosALT,
                segundosTotalesALT: e.segundosTotalesALT,
                segundosMediosALT: e.segundosMediosALT,
                interaccionesALT: e.interaccionesALT,
                exportsALT: e.exportsALT,
                // Combinado
                combined: e.combined,
                // Desgloses globales (para gráficas)
                desgloses: data.appscript.desgloses,
                areas: data.appscript.areas,
                resumen: data.appscript.resumen,
                // Datos alternativos globales
                altSummary: data.alternativo.summary,
                altDaily: data.alternativo.daily,
                altHourly: data.alternativo.hourly,
                altDevices: data.alternativo.devices,
                altCountries: data.alternativo.countries,
                altEventTypes: data.alternativo.eventTypes
            };
        });
    }

    /* =========================================================
       Reporte personal: serie diaria por empresa
       ---------------------------------------------------------
       El Apps Script no trae desglose diario por empresa, así que
       reparte los totales REALES de la empresa sobre el calendario
       usando el peso del desglose diario global (sesiones por día).
       ========================================================= */
    var HORA_PERFIL = [0.30, 0.55, 0.85, 1.00, 0.90, 0.70, 0.75, 0.90, 1.00, 0.95, 0.75, 0.55, 0.40, 0.25]; // 06:00..19:00
    var DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    var DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function tsDeFecha(s) {
        var p = String(s || '').split('-');
        if (p.length !== 3) return 0;
        return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
    }

    function fechaDeTs(ts) {
        var d = new Date(ts);
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }

    /* =========================================================
       Calendario común · las DOS fuentes de fechas
       ---------------------------------------------------------
       La hoja (Apps Script) se actualiza con el retardo de Analytics
       y puede quedar un día (o más) ATRÁS que la 2ª API, que sí trae
       HOY. Si los calendarios se armaban sólo con la hoja, NINGÚN
       panel llegaba a la fecha más actual que la API ya tenía.
       ---------------------------------------------------------
       · diarioCombinado(): fechas de la hoja + las que sólo trae la
         2ª API (con sus sesiones/usuarios reales de ese día).
       · fechasOrdenadas(): fechas del combinado, de menor a mayor.
       · finDisponible(): último día con datos de cualquier fuente
         (nunca más allá de HOY).
       ========================================================= */
    function diarioCombinado(data) {
        var porFecha = {};
        var app = data && data.appscript;
        ((app && app.desgloses && app.desgloses.diario) || []).forEach(function (d) {
            if (d && d.fecha) porFecha[d.fecha] = d;
        });
        var alt = data && data.alternativo;
        ((alt && alt.daily) || []).forEach(function (d) {
            var f = d && d.day;
            if (!f || porFecha[f]) return;   // si la hoja ya lo tiene, manda la hoja
            porFecha[f] = {
                fecha: f,
                usuarios: d.users || 0,
                sesiones: d.sessions || 0,
                vistas: 0,
                eventos: 0,
                segundos: 0,
                soloAlt: true
            };
        });
        return porFecha;
    }

    function fechasOrdenadas(porFecha) {
        return Object.keys(porFecha).sort();
    }

    /* Último día con datos (cualquier fuente), sin pasar de HOY */
    function finDisponible(porFecha) {
        var f = fechasOrdenadas(porFecha);
        var fin = f.length ? f[f.length - 1] : '';
        var hoy = fechaDeTs(Date.now());
        if (!fin || fin > hoy) fin = hoy;
        return fin;
    }

    // Reparte un total entero entre pesos (mayor resto)
    function repartir(total, pesos) {
        total = Math.round(total || 0);
        var n = pesos.length;
        var out = pesos.map(function () { return 0; });
        if (total <= 0 || !n) return out;
        var suma = pesos.reduce(function (a, b) { return a + b; }, 0);
        if (!suma) {
            var base = Math.floor(total / n), resto = total - base * n;
            return pesos.map(function (_, i) { return base + (i < resto ? 1 : 0); });
        }
        var exacto = pesos.map(function (p) { return total * p / suma; });
        exacto.forEach(function (v, i) { out[i] = Math.floor(v); });
        var falta = total - out.reduce(function (a, b) { return a + b; }, 0);
        var orden = exacto.map(function (v, i) { return { i: i, f: v - Math.floor(v) }; })
            .sort(function (a, b) { return b.f - a.f; });
        for (var k = 0; k < falta && k < orden.length; k++) out[orden[k].i]++;
        return out;
    }

    function getPersonal(empresa, desde, hasta) {
        return fetchAll().then(function (data) {
            /* SÓLO 2ª API: las empresas vienen de la plataforma (usuarios
               con código CL…) y no de la hoja de Analytics. */
            var app = data.appscript || {};
            var res = app.resumen || {};
            var diario = (app.desgloses && app.desgloses.diario) || [];
            var recurrencia = (app.desgloses && app.desgloses.recurrencia) || [];
            var rowsAll = app.datosRaw || [];
            var empresasMap = data.empresas || {};

            // Opciones de empresa (ordenadas por sesiones)
            var opciones = Object.keys(empresasMap)
                .map(function (n) { return { n: n, s: empresasMap[n].sesiones || 0 }; })
                .sort(function (a, b) { return b.s - a.s; })
                .map(function (e) { return e.n; });

            /* El filtro de empresa es de SELECCIÓN MÚLTIPLE: puede venir
               UNA empresa ('CL000123'), VARIAS (['CL1', 'CL2']) o nada
               (todas, como antes). */
            var elegidas = (Array.isArray(empresa) ? empresa : (empresa ? [empresa] : []))
                .map(function (s) { return String(s).trim(); })
                .filter(Boolean);
            var haySel = elegidas.length > 0;
            var enSel = {};
            elegidas.forEach(function (n) { enSel[n] = 1; });
            /* Objeto de cada empresa elegida (null = no está en la 2ª API:
               para lo que no traiga se calcula desde sus filas de la hoja) */
            var empsSel = elegidas.map(function (n) { return empresasMap[n] || null; });

            var rows = haySel
                ? rowsAll.filter(function (r) { return !!enSel[r.EMPRESA]; })
                : rowsAll;

            var sumRows = function (getter) {
                return rows.reduce(function (s, r) { return s + getter(r); }, 0);
            };

            /* Totales reales de las empresas elegidas (o globales cuando
               no hay filtro): 1) lo que cada una trae de la 2ª API,
               2) lo que falte se calcula de sus filas en la hoja. */
            function totalSel(campo, getter, global) {
                if (!haySel) return global();
                var s = 0, faltan = {};
                elegidas.forEach(function (n, i) {
                    var e = empsSel[i];
                    if (e && e[campo] != null) s += e[campo];
                    else faltan[n] = 1;
                });
                rowsAll.forEach(function (r) {
                    if (faltan[r.EMPRESA]) s += getter(r);
                });
                return s;
            }

            var sesionesTotal = totalSel('sesiones',
                function (r) { return parseSesiones(r.SESIONES); },
                function () { return res.sesiones || 0; });
            var conInterTotal = totalSel('sesionesConInteraccion',
                function (r) { return parseSesiones(r.SESIONES_CON_INTERACCION); },
                function () { return res.sesionesConInteraccion || 0; });
            var segTotal = totalSel('segundos',
                function (r) {
                    return parseSesiones(r.SESIONES_CON_INTERACCION) * parseTiempoMedio(r.TIEMPO_INTERACCION_MEDIO_POR_SESION);
                },
                function () { return res.segundosInteraccion || 0; });
            var usuariosTotal = haySel
                ? rows.reduce(function (m, r) { return Math.max(m, parseSesiones(r.USUARIOS_ACTIVOS)); }, 0)
                : (res.usuariosActivos || 0);
            var recTotal = totalSel('recurrentes',
                function (r) { return parseSesiones(r.USUARIOS_RECURRENTES); },
                function () {
                    var ret = 0;
                    recurrencia.forEach(function (x) { if (x.nombre === 'returning') ret = x.valor; });
                    return ret;
                });
            var vistasTotal = haySel
                ? sumRows(function (r) { return parseSesiones(r.VISTAS); })
                : (res.vistas || 0);
            var eventosTotal = haySel
                ? sumRows(function (r) { return parseSesiones(r.TOTAL_EVENTOS); })
                : (res.eventos || 0);

            // Calendario completo (desglose diario global + últimos días de la 2ª API)
            var porFecha = diarioCombinado(data);
            var claves = fechasOrdenadas(porFecha);
            var fechas = [];
            if (claves.length) {
                var t = tsDeFecha(claves[0]);
                var tMax = tsDeFecha(finDisponible(porFecha));
                for (; t <= tMax; t += 86400000) fechas.push(fechaDeTs(t));
            }
            if (!fechas.length) fechas = [fechaDeTs(Date.now())];

            var pesosS = fechas.map(function (f) { return porFecha[f] ? (porFecha[f].sesiones || 0) : 0; });
            var pesosV = fechas.map(function (f) { return porFecha[f] ? (porFecha[f].vistas || 0) : 0; });
            var pesosE = fechas.map(function (f) { return porFecha[f] ? (porFecha[f].eventos || 0) : 0; });
            var pesosG = fechas.map(function (f) { return porFecha[f] ? (porFecha[f].segundos || 0) : 0; });
            /* Días que sólo traen la 2ª API (hoja atrasada) tienen sesiones
               pero no vistas/eventos/segundos: se les da el mismo peso que
               a las sesiones para que la fila NO salga en ceros. */
            fechas.forEach(function (f, i) {
                if (pesosS[i] > 0) {
                    if (!pesosV[i]) pesosV[i] = pesosS[i];
                    if (!pesosE[i]) pesosE[i] = pesosS[i];
                    if (!pesosG[i]) pesosG[i] = pesosS[i];
                }
            });
            var sinPesos = pesosS.every(function (p) { return !p; });
            if (sinPesos) {
                pesosS = pesosV = pesosE = pesosG = fechas.map(function () { return 1; });
            }

            /* SÓLO 2ª API: las sesiones del cliente son las SESIONES DE SUS
               USUARIOS, día por día (?from=&to=), igual que Data Studio.
               NO se reparte el total: un día sin sesión sale en 0.
               Vistas / eventos / interacción no existen en esta API. */
            /* Códigos de cliente (CL…) de las empresas elegidas: con una
               sola se pide su sesión; con varias, la suma de ellas. Sin
               elección, todos los clientes (vista "todas"). */
            var codsSel = [];
            elegidas.forEach(function (n, i) {
                var e = empsSel[i];
                var c = e && e.username ? claveCliente(e.username) : '';
                if (c && codsSel.indexOf(c) === -1) codsSel.push(c);
            });
            var rangoDesde = desde || fechas[0];
            var rangoHasta = hasta || fechas[fechas.length - 1];
            return Promise.all([
                enParalelo(fechas, 6, sesionesDiaALT),
                actividadRangoALT(rangoDesde, rangoHasta)
            ]).then(function (resultados) {
            var lista = resultados[0];
            var actividadALT = resultados[1] || {};
            var sesArr = fechas.map(function (f, i) {
                var pc = lista[i] || {};
                if (codsSel.length) {
                    var t = 0;
                    codsSel.forEach(function (c) { t += pc[c] || 0; });
                    return t;
                }
                var s = 0;
                Object.keys(pc).forEach(function (c) { s += pc[c]; });
                return s;
            });
            /* Usuarios activos del día: los clientes elegidos (o los
               clientes distintos que entraron, en "todas") */
            var usuArr = fechas.map(function (f, i) {
                var pc = lista[i] || {};
                if (codsSel.length) {
                    var n = 0;
                    codsSel.forEach(function (c) { if (pc[c] > 0) n++; });
                    return n;
                }
                var n2 = 0;
                Object.keys(pc).forEach(function (c) { if (pc[c] > 0) n2++; });
                return n2;
            });
            usuariosTotal = usuArr.reduce(function (m, v) { return Math.max(m, v); }, 0);
            var conArr = sesArr.map(function () { return 0; });
            var visArr = sesArr.map(function () { return 0; });
            var evtArr = sesArr.map(function () { return 0; });
            var segArr = sesArr.map(function () { return 0; });
            var recArr = sesArr.map(function () { return 0; });

            // Timestamps reales de actividad por fecha (de las filas)
            var realPorFecha = {};
            rows.forEach(function (r) {
                [['PRIMER_ACCESO', 'min'], ['ULTIMO_ACCESO', 'max'], ['ULTIMA_ACTIVIDAD', 'max']].forEach(function (p) {
                    var ts = parseFecha(r[p[0]]);
                    if (!ts || ts > Date.now()) return;
                    var h = new Date(ts).getHours();
                    if (h < 5) return; // descarta medianoche/UTC raro
                    var f = fechaDeTs(ts);
                    var e = realPorFecha[f] || (realPorFecha[f] = { primer: 0, ultima: 0 });
                    if (p[1] === 'min') {
                        if (!e.primer || ts < e.primer) e.primer = ts;
                    } else {
                        if (ts > e.ultima) e.ultima = ts;
                    }
                });
            });
            /* La 2ª API sí trae la hora REAL de la última sesión de cada
               empresa (incluso de HOY, cuando la hoja todavía no llegó):
               se suma para que "última actividad" no quede atrasado. */
            Object.keys(empresasMap).forEach(function (n) {
                if (haySel && !enSel[n]) return;
                var tsAlt = parseFecha(empresasMap[n].ultimoAccesoALT);
                if (!tsAlt || tsAlt > Date.now()) return;
                var fAlt = fechaDeTs(tsAlt);
                var reg = realPorFecha[fAlt] || (realPorFecha[fAlt] = { primer: 0, ultima: 0 });
                if (tsAlt > reg.ultima) reg.ultima = tsAlt;
            });

            var ultimaReal = 0;
            Object.keys(realPorFecha).forEach(function (f) {
                if (realPorFecha[f].ultima > ultimaReal) ultimaReal = realPorFecha[f].ultima;
            });

            // Sin rango (filtros de fecha vacíos): todo el periodo con datos
            var minTs = tsDeFecha(fechas[0]);
            var maxTs = tsDeFecha(fechas[fechas.length - 1]);
            if (!desde) desde = fechaDeTs(minTs);
            if (!hasta) hasta = fechaDeTs(maxTs);
            if (tsDeFecha(desde) > tsDeFecha(hasta)) { var tmp = desde; desde = hasta; hasta = tmp; }

            // Actividad por día de la semana (para el patrón horario) según el rango
            var selIdx = [];
            fechas.forEach(function (f, i) {
                var ts = tsDeFecha(f);
                if (ts >= tsDeFecha(desde) && ts <= tsDeFecha(hasta)) selIdx.push(i);
            });
            var dowTot = [0, 0, 0, 0, 0, 0, 0];
            selIdx.forEach(function (i) {
                var dow = new Date(tsDeFecha(fechas[i])).getDay();
                dowTot[dow] += sesArr[i];
            });

            // Filas del día (detalle diario)
            var dias = selIdx.map(function (i) {
                var f = fechas[i];
                var ts = tsDeFecha(f);
                var dow = new Date(ts).getDay();
                var ses = sesArr[i];
                var seg = segArr[i];
                var real = realPorFecha[f];

                // Horas: sólo las que trae la 2ª API (realPorFecha).
                // Sin dato real la celda queda en "—" (no se inventa horario)
                var activo = ses > 0;
                var primerDeriv = '—';
                var ultimaDeriv = '—';

                return {
                    fecha: f,
                    fechaCorta: f.slice(8, 10) + '/' + f.slice(5, 7) + '/' + f.slice(0, 4),
                    dow: dow,
                    dowCorto: DIAS_CORTOS[dow],
                    dowLargo: DIAS_LARGOS[dow],
                    usuarios: usuArr[i],
                    sesiones: ses,
                    vistas: visArr[i],
                    eventos: evtArr[i],
                    conInter: conArr[i],
                    seg: seg,
                    tiempoMedio: ses ? Math.round(seg / ses) : 0,
                    pct: ses ? (conArr[i] / ses) * 100 : 0,
                    recurrentes: recArr[i],
                    primerAcceso: real && real.primer
                        ? new Date(real.primer).toTimeString().slice(0, 5)
                        : primerDeriv,
                    ultimaActividad: real && real.ultima
                        ? new Date(real.ultima).toTimeString().slice(0, 5)
                        : ultimaDeriv
                };
            });

            // Estado del día (regla del panel: <1 sesión rojo, 1 sesión amarillo, >1 verde)
            dias.forEach(function (d) {
                d.estado = d.sesiones > 1 ? 'estable'
                    : d.sesiones === 1 ? 'observacion'
                        : 'critica';
            });

            /* El mapa diario sí respeta la empresa seleccionada: sesArr ya
               contiene las sesiones reales devueltas por la 2ª API para ese
               cliente y fecha. Para "todas" conserva el total global. */
            var actividadDiaria = selIdx.map(function (i) {
                return {
                    fecha: fechas[i],
                    sesiones: sesArr[i],
                    usuarios: usuArr[i]
                };
            });

            // KPIs del rango
            var k = dias.reduce(function (a, d) {
                a.sesiones += d.sesiones; a.vistas += d.vistas; a.eventos += d.eventos;
                a.conInter += d.conInter; a.seg += d.seg; a.rec += d.recurrentes;
                return a;
            }, { sesiones: 0, vistas: 0, eventos: 0, conInter: 0, seg: 0, rec: 0 });
            var kpis = {
                usuarios: usuariosTotal,
                sesiones: k.sesiones,
                vistas: k.vistas,
                eventos: k.eventos,
                conInter: k.conInter,
                tasa: k.sesiones ? (k.conInter / k.sesiones) * 100 : 0,
                tiempoMedio: k.sesiones ? Math.round(k.seg / k.sesiones) : 0,
                recurrentes: sesionesTotal > 0
                    ? Math.round(recTotal * (k.sesiones / sesionesTotal))
                    : 0,
                ultimaReal: ultimaReal
            };

            // Última actividad dentro del rango seleccionado (si hay dato real)
            var tsDesde = tsDeFecha(desde), tsHasta = tsDeFecha(hasta) + 86399999;
            Object.keys(realPorFecha).forEach(function (f) {
                var u = realPorFecha[f].ultima;
                if (u >= tsDesde && u <= tsHasta && u > kpis.ultimaRealRango) {
                    kpis.ultimaRealRango = u;
                }
            });
            if (!kpis.ultimaRealRango) kpis.ultimaRealRango = ultimaReal;

            // Periodo anterior (misma longitud, solo días con datos)
            var nDias = dias.length;
            var prevSes = 0, prevVistas = 0, prevEvt = 0, prevCon = 0, prevSeg = 0, prevOk = false;
            fechas.forEach(function (f, i) {
                var ts = tsDeFecha(f);
                if (ts < tsDeFecha(desde) && ts >= tsDeFecha(desde) - nDias * 86400000) {
                    prevSes += sesArr[i]; prevVistas += visArr[i]; prevEvt += evtArr[i];
                    prevCon += conArr[i]; prevSeg += segArr[i];
                    prevOk = true;
                }
            });
            var prev = prevOk ? {
                sesiones: prevSes, vistas: prevVistas, eventos: prevEvt,
                conInter: prevCon,
                tasa: prevSes ? (prevCon / prevSes) * 100 : 0,
                tiempoMedio: prevSes ? Math.round(prevSeg / prevSes) : 0
            } : null;

            /* La 2ª API entrega reportes y aperturas acumuladas, pero no la
               fecha de cada apertura. Se conserva el nombre real del
               dashboard y se muestra el total, sin inventar una serie diaria. */
            var reportesPorTipo = {};
            /* Clientes (código) de las empresas elegidas: sin ninguna
               elegida se muestran los reportes de todas. */
            var codigosAlt = [];
            empsSel.forEach(function (e) {
                var c = e && e.username ? String(e.username).toUpperCase() : '';
                if (c && codigosAlt.indexOf(c) === -1) codigosAlt.push(c);
            });
            (data.alternativo && data.alternativo.reports || []).forEach(function (r) {
                if (codigosAlt.length && codigosAlt.indexOf(String(r.client_code || '').toUpperCase()) === -1) return;
                var nombre = String(r.report_name || '').trim();
                if (!nombre || /^REPORTE GENERAL$/i.test(nombre)) return;
                if (!reportesPorTipo[nombre]) reportesPorTipo[nombre] = { nombre: nombre, aperturas: 0 };
                reportesPorTipo[nombre].aperturas += parseNum(r.opens);
            });
            var dashboards = Object.keys(reportesPorTipo).map(function (nombre) {
                var d = reportesPorTipo[nombre];
                d.serie = selIdx.map(function () { return null; });
                d.totalRango = d.aperturas;
                return d;
            }).sort(function (a, b) { return b.totalRango - a.totalRango; });

            /* El patrón por hora es global y permanece fijo aunque cambie
               el rango de fechas; sólo el mapa diario se filtra por periodo. */
            var actividadHoraria = (data.alternativo && data.alternativo.hourly || [])
                .map(function (x) { return { hora: parseNum(x.hour), sesiones: parseNum(x.sessions) }; })
                .filter(function (x) { return x.hora >= 0 && x.hora <= 23; });

            // Patrón de uso por hora (día de semana × hora)
            var maxCelda = 0;
            var celdas = [];
            for (var dw = 0; dw < 7; dw++) {
                var fila = [];
                for (var h = 0; h < HORA_PERFIL.length; h++) {
                    var v = dowTot[dw] * HORA_PERFIL[h];
                    fila.push(v);
                    if (v > maxCelda) maxCelda = v;
                }
                celdas.push(fila);
            }
            var horas = [];
            for (var hh = 6; hh <= 19; hh++) horas.push(pad2(hh) + ':00');

            var pico = { v: -1 }, baja = { v: Infinity }, picoDow = { v: -1 };
            for (var d2 = 0; d2 < 7; d2++) {
                for (var h2 = 0; h2 < horas.length; h2++) {
                    var val = maxCelda ? Math.round(10 * celdas[d2][h2] / maxCelda) : 0;
                    celdas[d2][h2] = val;
                    if (val > pico.v) pico = { v: val, dow: d2, h: h2 };
                    if (val < baja.v) baja = { v: val, dow: d2, h: h2 };
                }
                if (dowTot[d2] > picoDow.v) picoDow = { v: dowTot[d2], dow: d2 };
            }
            var ordenSemana = [1, 2, 3, 4, 5, 6, 0]; // Lun..Dom

            return {
                empresa: elegidas.join(', '),
                desde: desde,
                hasta: hasta,
                min: fechas[0],
                max: fechas[fechas.length - 1],
                opciones: opciones,
                dias: dias,
                kpis: kpis,
                prev: prev,
                dashboards: dashboards,
                actividadDiaria: actividadDiaria,
                actividadHoraria: actividadHoraria,
                horas: {
                    orden: ordenSemana,
                    horas: horas,
                    celdas: celdas,
                    pico: pico,
                    baja: baja,
                    diaActivo: picoDow.dow != null ? picoDow.dow : 1
                },
                totalDashboards: dashboards.length
            };
            });   // fin de las sesiones REALES de la 2ª API
        });
    }

    /* =========================================================
       Control diario de empresas · sesiones por día Y empresa
       ---------------------------------------------------------
       Combina las DOS fuentes sin inventar datos:
       · 2ª API: sesiones REALES del día por cliente (from/to),
         pedidas en paralelo y cacheadas por día en localStorage.
       · Apps Script: no trae desglose diario por empresa; reparte
         las sesiones REALES de cada empresa por el peso del
         desglose diario global (mismo criterio del reporte
         personal). El total de cada empresa siempre es el real.
       ========================================================= */
    var LS_DIA_ALT = 'ri.alt.dia3.';  // v3: los días cacheados traían APERTURAS
                                      // de reporte en vez de sesiones
    var MAX_DIAS_CONTROL = 62;   // tope de días por petición

    /* Caducidad del caché POR DÍA (antes se guardaba para siempre y la
       actividad que seguía entrando —una sesión de ayer a las 9:21, por
       ejemplo— no aparecia nunca):
       · días recientes (los últimos DIAS_RECIENTES): 5 minutos, igual
         que el refresco automático de la app;
       · más antiguos: histórico cerrado, 12 horas.
       El refresco automático además BORRA los días recientes en cada
       ciclo, así que se vuelven a pedir "sí o sí". */
    var AUTO_REFRESCO_MS = 5 * 60 * 1000;  // la 2ª API se consulta cada 5 min
    var DIAS_RECIENTES = 14;
    var TTL_DIA_VIEJO = 12 * 3600000;

    function diaEsReciente(fecha) {
        return fecha >= fechaDeTs(Date.now() - DIAS_RECIENTES * 86400000);
    }

    function diaCacheALT(fecha) {
        try {
            var raw = localStorage.getItem(LS_DIA_ALT + fecha);
            if (!raw) return null;
            var d = JSON.parse(raw);
            if (!d || typeof d !== 'object') return null;
            /* Entrada vieja (sin marca de tiempo): sólo se acepta si el día
               cerró hace más de 2 días; hoy y ayer se piden otra vez. */
            if (!Object.prototype.hasOwnProperty.call(d, '__t')) {
                return fecha < fechaDeTs(Date.now() - 2 * 86400000) ? d : null;
            }
            var ttl = diaEsReciente(fecha) ? AUTO_REFRESCO_MS : TTL_DIA_VIEJO;
            if (Date.now() - d.__t > ttl) return null;   // caducado: a pedirlo
            return d.v;
        } catch (e) { return null; }
    }

    function guardarDiaALT(fecha, valor) {
        try {
            localStorage.setItem(LS_DIA_ALT + fecha, JSON.stringify({ __t: Date.now(), v: valor }));
        } catch (e) { /* localStorage lleno: se vuelve a pedir la próxima */ }
    }

    /* Tira los cachés de los días recientes (hasta DIAS_RECIENTES atrás):
       es donde sigue llegando actividad nueva. Los días más antiguos no se
       tocan (histórico cerrado) para no martillar la API con 62 peticiones
       cada 5 minutos. */
    function limpiarDiasRecientes() {
        var hoy = fechaDeTs(Date.now());
        var corte = fechaDeTs(Date.now() - DIAS_RECIENTES * 86400000);
        try {
            for (var i = localStorage.length - 1; i >= 0; i--) {
                var k = localStorage.key(i);
                if (!k || k.indexOf(LS_DIA_ALT) !== 0) continue;
                var f = k.slice(LS_DIA_ALT.length);
                if (f >= corte && f <= hoy) localStorage.removeItem(k);
            }
        } catch (e) { /* modo privado o lleno: se respeta el TTL */ }
    }

    // Lanza `fn` sobre todos los elementos con N trabajos en paralelo
    function enParalelo(elementos, ancho, fn) {
        var res = new Array(elementos.length);
        var i = 0;
        function trabajador() {
            if (i >= elementos.length) return Promise.resolve();
            var idx = i++;
            return Promise.resolve(fn(elementos[idx], idx)).then(function (v) {
                res[idx] = v;
                return trabajador();
            });
        }
        var todos = [];
        for (var k = 0; k < Math.min(ancho || 6, elementos.length); k++) todos.push(trabajador());
        return Promise.all(todos).then(function () { return res; });
    }

    /* =========================================================
       Cuentas internas de la plataforma
       ---------------------------------------------------------
       Administradores y configuradores (admin, EMENDEZ, RFUENTES…)
       NO son empresas: sus sesiones nunca entran al control diario
       ni a la meta. Sólo los códigos de cliente (CLxxxxxx) con rol
       de empresa (VIEWER o sin rol declarado) se contabilizan.
       ========================================================= */
    var ROLES_INTERNOS = /^(SUPER_?ADMIN|ADMIN|ADMINISTRADOR|CONFIGURATOR|CONFIGURADOR|SUPPORT|OWNER)$/i;

    function esInterno(u) {
        if (!u) return false;
        var rol = String(u.role == null ? '' : u.role).trim();
        if (rol) return ROLES_INTERNOS.test(rol);
        /* Sin rol declarado: manda el nombre de usuario (CL… = empresa) */
        return !claveCliente(u.username);
    }

    // Sesiones de cada cliente (CLxxxxxx) en un día concreto
    function sesionesDiaALT(fecha) {
        var hoy = fechaDeTs(Date.now());
        var cache = fecha === hoy ? null : diaCacheALT(fecha);  // el día de hoy siempre se repide
        if (cache) return Promise.resolve(cache);

        function pedir(i) {
            if (i >= ALT_API_URLS.length) return Promise.resolve(null);
            return fetchJSON(ALT_API_URLS[i] + '?from=' + fecha + '&to=' + fecha)
                .then(function (j) { return j; }, function () { return pedir(i + 1); });
        }

        return pedir(0).then(function (j) {
            var porCliente = {};
            if (!j) return porCliente;   // sin proxy ese día: sólo cuenta el sheet
            /* Sesiones REALES de cada cliente en ese día (users[].sessions).
               Sumadas en el rango dan exactamente el total de la tabla de
               clientes de la 2ª API (20).
               NO se usa reports[].opens: son APERTURAS de reporte, no
               sesiones (inflaban la matriz con 18-27 "sesiones" de clientes
               que sólo abrieron un reporte ese día).
               Clave = código base (CL000640), igual que en la hoja, para
               que las DOS fuentes caigan en la misma llave. */
            (j.users || []).forEach(function (u) {
                var n = parseNum(u.sessions);
                if (n <= 0) return;
                /* Cuentas internas (administradores/configuradores) fuera:
                   sólo las empresas (códigos cliente) cuentan ese día. */
                if (esInterno(u)) return;
                var c = claveCliente(u.username);
                if (c) porCliente[c] = n;
            });
            guardarDiaALT(fecha, porCliente);
            return porCliente;
        });
    }

    function actividadRangoALT(desde, hasta) {
        var query = '?from=' + encodeURIComponent(desde) + '&to=' + encodeURIComponent(hasta);
        function pedir(i) {
            if (i >= ALT_API_URLS.length) return Promise.resolve({});
            return fetchJSON(ALT_API_URLS[i] + query)
                .then(function (j) { return j || {}; })
                .catch(function () { return pedir(i + 1); });
        }
        return pedir(0);
    }

    /* Devuelve { fechas: [...], sesiones: { empresa: { fecha: sesiones } } }
       para el rango pedido. `desde`/`hasta` son 'aaaa-mm-dd'. */
    function getDiarioEmpresas(desde, hasta) {
        return fetchAll().then(function (data) {
            var porEmpresa = data.empresas || {};
            var nombres = Object.keys(porEmpresa);

            /* Pesos: SOLO el desglose diario del sheet (el reparto de los
               totales reales se hace con esos). */
            var dg = (data.appscript && data.appscript.desgloses) || {};
            var pesoPorFecha = {};
            (dg.diario || []).forEach(function (d) {
                if (d && d.fecha) pesoPorFecha[d.fecha] = d.sesiones || 0;
            });

            /* Calendario: sheet + los días que sólo trae la 2ª API
               (la hoja puede ir atrasada y "hoy" se quedaba sin pintar) */
            var conDatos = fechasOrdenadas(diarioCombinado(data));

            var fechas = [];
            if (desde && hasta && desde <= hasta) {
                for (var t = tsDeFecha(desde); t <= tsDeFecha(hasta); t += 86400000) {
                    fechas.push(fechaDeTs(t));
                }
            } else if (conDatos.length) {
                for (var t2 = tsDeFecha(conDatos[0]); t2 <= tsDeFecha(conDatos[conDatos.length - 1]); t2 += 86400000) {
                    fechas.push(fechaDeTs(t2));
                }
            }
            /* Tope de días: se quedan los MÁS RECIENTES (antes se quedaban
               los primeros y el último día de la API nunca se pintaba) */
            if (fechas.length > MAX_DIAS_CONTROL) fechas = fechas.slice(fechas.length - MAX_DIAS_CONTROL);

            /* Totales REALES de la 2ª API por día (daily[]): sesiones y
               usuarios activos de TODOS los usuarios (clientes + internos).
               Es el mismo número que muestra Data Studio / la API, por día. */
            var totales = {};
            ((data.alternativo && data.alternativo.daily) || []).forEach(function (d) {
                if (d && d.day && fechas.indexOf(d.day) !== -1) {
                    totales[d.day] = {
                        sesiones: parseNum(d.sessions) || 0,
                        usuarios: parseNum(d.users) || 0
                    };
                }
            });
            fechas.forEach(function (f) {
                if (!totales[f]) totales[f] = { sesiones: 0, usuarios: 0 };
            });

            if (!fechas.length) return { fechas: [], sesiones: {}, diasALT: 0, totales: {}, repartidas: {} };

            /* Calendario COMPLETO (todas las fechas con datos del sheet):
               el reparto se hace sobre todo el calendario y luego se toma
               sólo el rango pedido, así el total de cada empresa no se
               infla cuando el rango es corto. */
            var todasFechas = [];
            if (conDatos.length) {
                for (var t3 = tsDeFecha(conDatos[0]); t3 <= tsDeFecha(conDatos[conDatos.length - 1]); t3 += 86400000) {
                    todasFechas.push(fechaDeTs(t3));
                }
            }
            var pesosAll = todasFechas.map(function (f) { return pesoPorFecha[f] || 0; });
            if (!pesosAll.some(function (p) { return p > 0; })) pesosAll = todasFechas.map(function () { return 1; });

            /* 1) Apps Script: totales reales de cada empresa repartidos
                  por el peso del desglose diario global.
                  EXCEPCIÓN: las empresas que son USUARIOS de la 2ª API
                  NO se reparten: su día a día sale de las sesiones REALES
                  de sus usuarios (lo que pinta la 2ª API), así el total
                  de la fila coincide con la tabla de clientes y no se
                  cuentan las sesiones dos veces. */
            var sesiones = {};
            /* Empresas cuyo día a día sale del REPARTO del total real de la
               hoja (estimado), no de sesiones diarias reales: la UI lo
               avisa en el tooltip del KPI para no presentarlo como real. */
            var repartidas = {};
            nombres.forEach(function (n) {
                var e = porEmpresa[n];
                if (claveCliente(e.username)) {
                    sesiones[n] = {};
                    return;
                }
                repartidas[n] = true;
                var total = (e.sesionesAS != null ? e.sesionesAS
                    : (e.totalesAS && e.totalesAS.sesiones)) || 0;
                var reparto = repartir(total, pesosAll);
                var porFecha = {};
                todasFechas.forEach(function (f, i) {
                    if (reparto[i] && fechas.indexOf(f) !== -1) porFecha[f] = reparto[i];
                });
                sesiones[n] = porFecha;
            });

            /* Clientes de la 2ª API ligados a una empresa (mismo código) */
            var clienteDe = {};
            nombres.forEach(function (n) {
                var c = claveCliente(porEmpresa[n].username) || claveCliente(porEmpresa[n].claveAnalytics);
                if (c) clienteDe[c] = n;
            });
            if (!Object.keys(clienteDe).length) {
                return { fechas: fechas, sesiones: sesiones, diasALT: 0, totales: totales, repartidas: repartidas };
            }

            /* 2) 2ª API: sesiones reales del día por cliente (en paralelo) */
            return enParalelo(fechas, 6, sesionesDiaALT).then(function (lista) {
                var diasALT = 0;
                lista.forEach(function (porCliente, i) {
                    if (porCliente && Object.keys(porCliente).length) diasALT++;
                    Object.keys(porCliente || {}).forEach(function (c) {
                        var n = clienteDe[c];
                        if (!n) return;
                        var f = fechas[i];
                        sesiones[n][f] = (sesiones[n][f] || 0) + porCliente[c];
                    });
                });
                return { fechas: fechas, sesiones: sesiones, diasALT: diasALT, totales: totales, repartidas: repartidas };
            });
        });
    }

    /* =========================================================
       Meta diaria · sesiones REALES por código de cliente y día
       ---------------------------------------------------------
       Devuelve { fechas, porCodigo: { 'CL000103': { '2026-09-16': 3 } } }
       · Sólo la 2ª API: historial VERIFICABLE por empresa y fecha, sin
         repartos estimados de la hoja (un reparto no es una sesión
         comprobada y este indicador se basa en datos confirmados).
       · Cuentas internas (admin/configuradores) excluidas: cada cuenta
         de empresa se identifica por su client_code.
       · Caché por día (localStorage) igual que el control diario, así
         cambiar de rango no vuelve a pedir días ya conocidos.
       ========================================================= */
    function getDiarioCodigos(desde, hasta) {
        var fechas = [];
        if (desde && hasta && desde <= hasta) {
            for (var t = tsDeFecha(desde); t <= tsDeFecha(hasta); t += 86400000) {
                fechas.push(fechaDeTs(t));
            }
        }
        /* Tope de días: se conservan los MÁS RECIENTES */
        if (fechas.length > MAX_DIAS_CONTROL) fechas = fechas.slice(fechas.length - MAX_DIAS_CONTROL);
        if (!fechas.length) {
            return Promise.resolve({ fechas: [], porCodigo: {}, diasALT: 0, tope: false });
        }
        var tope = fechas.length === MAX_DIAS_CONTROL;

        return enParalelo(fechas, 6, sesionesDiaALT).then(function (lista) {
            var porCodigo = {}, diasALT = 0;
            lista.forEach(function (porCliente, i) {
                if (porCliente && Object.keys(porCliente).length) diasALT++;
                var f = fechas[i];
                Object.keys(porCliente || {}).forEach(function (c) {
                    var n = parseNum(porCliente[c]);
                    if (!(n > 0)) return;
                    if (!porCodigo[c]) porCodigo[c] = {};
                    porCodigo[c][f] = (porCodigo[c][f] || 0) + n;
                });
            });
            return { fechas: fechas, porCodigo: porCodigo, diasALT: diasALT, tope: tope };
        });
    }

    /* =========================================================
       Dashboards creados · meta acumulada (2ª API)
       ---------------------------------------------------------
       Fuente: reports[] de la 2ª API, que SÍ trae la FECHA DE CREACIÓN
       de cada dashboard (dashboard_created_at). De aquí salen, sin
       números fijos:
         · cuántos dashboards existen y desde qué día cuenta cada uno
         · a qué empresa (client_code) pertenece cada dashboard
       La fecha se toma en horario de El Salvador (UTC-6), el mismo con
       el que la API agrupa las sesiones por día, para que un dashboard
       creado a las 23:50Z caiga en el día local correcto.
       ========================================================= */
    function fechaSV(ts) {
        if (!ts) return '';
        return new Date(ts - 6 * 3600000).toISOString().slice(0, 10);
    }

    function getDashboards() {
        return fetchAll().then(function (data) {
            var alt = data.alternativo || {};
            var nombrePorCodigo = {}, paisPorCodigo = {};

            (alt.users || []).forEach(function (u) {
                var cod = claveCliente(u.username);
                if (!cod || esInterno(u)) return;
                if (!nombrePorCodigo[cod]) {
                    nombrePorCodigo[cod] = String(u.display_name || u.username).trim();
                }
                if (!paisPorCodigo[cod]) {
                    paisPorCodigo[cod] = paisDeCodigo(u.username) || null;
                }
            });

            var dashboards = (alt.reports || []).map(function (r) {
                var cod = claveCliente(r.client_code);
                if (!cod) return null;
                var ts = parseFecha(r.dashboard_created_at);
                if (!ts) return null;                 // sin fecha: no se inventa alta
                var nombre = nombrePorCodigo[cod] || null;
                if (!nombre) {
                    var n = String(r.report_name || '').trim();
                    /* "REPORTE GENERAL …" es el TIPO de reporte, no la empresa */
                    nombre = (!n || /^REPORTE GENERAL/i.test(n)) ? cod : n;
                }
                return {
                    id: r.report_id,
                    codigo: cod,
                    codigoCompleto: String(r.client_code || cod).trim().toUpperCase(),
                    empresa: nombre,
                    pais: paisPorCodigo[cod] || paisDeCodigo(r.client_code) || null,
                    fecha: fechaSV(ts),
                    ts: ts,
                    plataforma: r.platform || '',
                    activo: r.active !== false,
                    reporte: String(r.report_name || '').trim()
                };
            }).filter(function (d) { return !!d; });

            dashboards.sort(function (a, b) {
                return a.ts !== b.ts ? a.ts - b.ts : String(a.id).localeCompare(String(b.id));
            });
            return dashboards;
        });
    }

    /* Síncrono: el motivo por el que la hoja de Analytics (Apps Script) no
       respondió en esta carga, o null si respondió. Así la UI puede avisar
       sin otra petición (por qué faltan empresas y totales de Analytics). */
    function estadoHoja() {
        return (cache && cache.appscript && cache.appscript.error) || null;
    }

    function invalidateCache() {
        cache = null;
        cacheTs = 0;
        pendiente = null;
        try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
    }

    /* ---------- Refresco automático: la app consulta la 2ª API CADA
       5 MINUTOS, aunque nadie toque nada ----------
       1) se tiran los cachés de los días recientes (ahí es donde sigue
          entrando actividad: una sesión de ayer a las 9:21, por ejemplo),
       2) se vuelve a pedir TODO con force, sin caché,
       3) se avisa con el evento `ri:auto` para que cada pantalla repinte.
       Si la pestaña estuvo oculta (el navegador duerme los temporizadores),
       al volverse a ver se comprueba igual. */
    var ultimoAuto = 0;
    var autoTimer = null;

    function refrescar() {
        ultimoAuto = Date.now();
        limpiarDiasRecientes();
        var p = pendiente || fetchAll(true);
        return p.then(function () {
            try {
                global.dispatchEvent(new CustomEvent('ri:auto', { detail: { en: ultimoAuto } }));
            } catch (e) {
                try { global.dispatchEvent(new CustomEvent('ri:auto')); } catch (e2) { /* no soportado */ }
            }
            return true;
        }, function (e) {
            /* Si falla no se avisa: cada pantalla sigue mostrando lo último
               bueno y el siguiente ciclo (u otro widget) vuelve a intentar. */
            console.warn('[API] Refresco automático falló:', (e && e.message) || e);
            return false;
        });
    }

    function arrancarAutoRefresco() {
        if (autoTimer || !global.setInterval) return;
        autoTimer = global.setInterval(refrescar, AUTO_REFRESCO_MS);
        if (global.document && global.document.addEventListener) {
            global.document.addEventListener('visibilitychange', function () {
                if (global.document.hidden) return;
                if (Date.now() - ultimoAuto >= AUTO_REFRESCO_MS) refrescar();
            });
        }
    }

    // Exponer
    global.RI_API = {
        fetchAll: fetchAll,
        getResumen: getResumen,
        getPlataforma: getPlataforma,
        getEmpresas: getEmpresas,
        getEmpresa: getEmpresa,
        getUsuariosCriticos: getUsuariosCriticos,
        getUsuarios: getUsuarios,
        getEmpresasCriticas: getEmpresasCriticas,
        getAlertas: getAlertas,
        enviarAlertas: enviarAlertas,
        getAnalitica: getAnalitica,
        getHeatmap: getHeatmap,
        getReportes: getReportes,
        getPersonal: getPersonal,
        getDiarioEmpresas: getDiarioEmpresas,
        getDiarioCodigos: getDiarioCodigos,
        getDashboards: getDashboards,
        estadoHoja: estadoHoja,
        invalidateCache: invalidateCache,
        refrescar: refrescar
    };

    /* Refresco automático de la API (cada 5 minutos, sin falta) */
    arrancarAutoRefresco();

    /* Precarga: la petición a la red arranca apenas se carga este archivo,
       sin esperar a que el DOM esté listo (ahorra ~250 ms de pantalla en
       blanco). Si falla, cada widget reintenta al pedir sus datos. */
    try {
        fetchAll().catch(function () { /* lo retoma quien llame después */ });
    } catch (e) { /* ignore */ }

})(window);