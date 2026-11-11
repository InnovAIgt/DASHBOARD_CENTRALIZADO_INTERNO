/* =========================================================
   Red Intelfon · Tema claro / oscuro
   ---------------------------------------------------------
   · Se carga en el <head> de TODAS las páginas ANTES de los
     estilos, para que nunca se pinte un tema equivocado.
   · La preferencia se guarda POR USUARIO en localStorage
     (clave "ri_tema_v1"):  { "admin": "claro", "jose": "oscuro" }
     → cada cuenta tiene su propio tema, sin importar quién
       se siente después en el mismo equipo.
   · "_invitado" guarda el tema del login (cuando todavía no
     hay sesión) y se hereda del último usuario que lo cambió.
   · Pinta  <html data-tema="claro">  para que el CSS aplique
     los overrides y  <html class="es-admin">  para que el CSS
     pueda ocultar las zonas reservadas a administradores sin
     esperar a que corra el resto de los scripts.
   ========================================================= */
(function () {
    'use strict';

    var LS_TEMA = 'ri_tema_v1';
    var LS_SESION = 'ri_sesion_v1';
    var INVITADO = '_invitado';
    var DEFECTO = 'oscuro';

    /* ---------- Almacenamiento tolerante a modo privado ---------- */
    function leerJSON(clave, defecto) {
        try {
            var raw = localStorage.getItem(clave);
            if (!raw) return defecto;
            var v = JSON.parse(raw);
            return v == null ? defecto : v;
        } catch (e) {
            return defecto;
        }
    }

    function sesion() {
        return leerJSON(LS_SESION, null);
    }

    function mapa() {
        var m = leerJSON(LS_TEMA, null);
        return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
    }

    function normaliza(m) {
        return m === 'claro' ? 'claro' : 'oscuro';
    }

    /* ¿Quién manda ahora? El de la sesión o, sin sesión, el invitado */
    function usuarioActual() {
        var s = sesion();
        return (s && s.usuario) ? String(s.usuario) : INVITADO;
    }

    function deUsuario(u) {
        if (!u) return DEFECTO;
        var m = mapa();
        var v = (m[u] != null) ? m[u] : m[INVITADO];
        return v ? normaliza(v) : DEFECTO;
    }

    function actual() {
        return deUsuario(usuarioActual());
    }

    /* ---------- Pintado ---------- */
    function aplicar() {
        var s = sesion();
        var raiz = document.documentElement;
        raiz.setAttribute('data-tema', actual());
        raiz.classList.toggle('es-admin', !!(s && s.rol === 'Administrador'));
        return raiz.getAttribute('data-tema');
    }

    function guardar(modo, u) {
        var m = mapa();
        var quien = u || usuarioActual();
        var valor = normaliza(modo);
        m[quien] = valor;
        /* Cambiar el tema con sesión deja el login igual que la última sesión */
        if (quien !== INVITADO) m[INVITADO] = valor;
        try {
            localStorage.setItem(LS_TEMA, JSON.stringify(m));
        } catch (e) { /* modo privado: sigue vivo en esta pestaña */ }
        aplicar();
        return valor;
    }

    function alternar() {
        return guardar(actual() === 'claro' ? 'oscuro' : 'claro');
    }

    /* Se refleja al instante si cambia en otra pestaña */
    window.addEventListener('storage', function (e) {
        if (!e || e.key === LS_TEMA || e.key === LS_SESION) aplicar();
    });

    aplicar();

    window.RI_TEMA = {
        actual: actual,
        guardar: guardar,
        alternar: alternar,
        deUsuario: deUsuario,
        usuario: usuarioActual,
        aplicar: aplicar
    };
})();
