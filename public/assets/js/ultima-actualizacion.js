/* ============================================================
   ÚLTIMA ACTUALIZACIÓN · RED INTELFON

   Pinta un letrero con la última vez que el proceso de carga
   consultó la API, con semáforo según qué tan viejo está.

   No adivina nada: solo muestra lo que el proceso de carga dejó
   escrito en su tabla de ejecuciones. Si no hay dato, lo dice.

     pintarUltimaActualizacion(elemento, {
       fecha:     '2026-10-08T18:33:56Z',  // fecha_fin de la ejecución
       estado:    'exitoso',               // 'exitoso' | 'parcial' | 'error' | null
       registros: 1147,                    // opcional
       error:     null                     // opcional, texto del fallo
     }, {
       horasVerde: 24,   // hasta aquí, verde   (por defecto 24)
       horasAmbar: 48    // hasta aquí, ámbar   (por defecto 48)
     });

   elemento: un nodo del DOM o el id de uno, como texto.

   Los umbrales se ajustan por dashboard: uno que carga cada hora
   no puede usar la misma vara que uno que carga una vez al día.
   ============================================================ */
(function () {
  var ZONA = 'America/Guatemala';
  var MS_HORA = 3600000;

  var ESTILOS = [
    '.ult-act{display:inline-flex;align-items:center;gap:7px;',
    'padding:5px 11px;border-radius:999px;font-size:12px;',
    'font-weight:600;line-height:1.3;border:1px solid transparent;',
    'font-family:inherit;vertical-align:middle;}',
    '.ult-act i{width:7px;height:7px;border-radius:50%;flex:none;display:block;}',
    '.ult-act b{font-weight:800;}',
    '.ult-act-ok{background:rgba(47, 143, 118,.14);color:#3f9c85;border-color:rgba(47, 143, 118,.3);}',
    '.ult-act-ok i{background:#2f8f76;}',
    '.ult-act-medio{background:rgba(197,150,0,.14);color:#c59600;border-color:rgba(197,150,0,.3);}',
    '.ult-act-medio i{background:#c59600;}',
    '.ult-act-mal{background:rgba(196,60,80,.16);color:#d95f6e;border-color:rgba(196,60,80,.35);}',
    '.ult-act-mal i{background:#c43c50;}',
    '.ult-act-sin{background:rgba(139,144,158,.14);color:#8b909e;border-color:rgba(139,144,158,.3);}',
    '.ult-act-sin i{background:#8b909e;}'
  ].join('');

  function ponerEstilos() {
    if (document.getElementById('ult-act-css')) return;
    var s = document.createElement('style');
    s.id = 'ult-act-css';
    s.textContent = ESTILOS;
    document.head.appendChild(s);
  }

  var esc = function (t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  // Fecha y hora en Guatemala. La base guarda en UTC: convertir aquí
  // evita que el letrero salga corrido seis horas.
  function fechaHora(d) {
    return new Intl.DateTimeFormat('es-GT', {
      timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }).format(d).replace(/\s?a\.?\s?m\.?/i, ' a.m.').replace(/\s?p\.?\s?m\.?/i, ' p.m.');
  }

  function soloFecha(d) {
    return new Intl.DateTimeFormat('es-GT', {
      timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric'
    }).format(d).replace(/\./g, '');   // "8 sept. 2026" -> "8 sept 2026"
  }

  function plural(n, uno, varios) {
    return n + ' ' + (n === 1 ? uno : varios);
  }

  // La antigüedad se dice en la unidad que corresponde. Un tablero que
  // carga varias veces al día no puede leer "hace 0 días" cuando lleva
  // diez horas parado.
  function antiguedad(horas) {
    if (horas < 1)  return 'hace menos de una hora';
    if (horas < 48) return 'hace ' + plural(Math.round(horas), 'hora', 'horas');
    return 'hace ' + plural(Math.floor(horas / 24), 'día', 'días');
  }

  // Devuelve {clase, texto, titulo} sin tocar el DOM: así se puede
  // probar la lógica aparte de cómo se ve.
  function estadoActualizacion(info, op) {
    var cfg = op || {};
    var verde = cfg.horasVerde != null ? cfg.horasVerde : 24;
    var ambar = cfg.horasAmbar != null ? cfg.horasAmbar : 48;
    var datos = info || {};

    var d = datos.fecha ? new Date(datos.fecha) : null;
    if (!d || isNaN(d.getTime())) {
      return {
        clase: 'ult-act-sin',
        texto: 'Sin información de actualización',
        titulo: 'El proceso de carga no ha dejado registro de su última ejecución.'
      };
    }

    var horas = (Date.now() - d.getTime()) / MS_HORA;
    var cuando = fechaHora(d);

    var detalle = [];
    if (datos.registros != null) {
      detalle.push(Number(datos.registros).toLocaleString('es-GT') + ' registros');
    }
    detalle.push('Hora de Guatemala.');

    if (datos.estado === 'error') {
      return {
        clase: 'ult-act-mal',
        texto: 'La última carga falló · <b>' + esc(cuando) + '</b>',
        titulo: datos.error
          ? 'Motivo: ' + String(datos.error)
          : 'La última ejecución terminó con error. Los datos que ves son los de la carga anterior.'
      };
    }

    // Terminó, pero incompleta. Si además ya está vieja, la antigüedad manda:
    // "incompleta hace diez días" es un problema rojo, no ámbar.
    if (datos.estado === 'parcial') {
      var vieja = horas > ambar;
      return {
        clase: vieja ? 'ult-act-mal' : 'ult-act-medio',
        texto: vieja
          ? 'Carga incompleta y sin actualizar desde el <b>' +
            esc(horas < 48 ? cuando : soloFecha(d)) + '</b> · ' + antiguedad(horas)
          : 'Carga incompleta · <b>' + esc(cuando) + '</b>',
        titulo: (datos.error ? 'Detalle: ' + String(datos.error) + ' · ' : '') +
                'La carga terminó, pero faltaron datos. Las cifras que ves ' +
                'están incompletas.'
      };
    }

    // Una fecha en el futuro casi siempre es un reloj mal puesto o una
    // zona horaria equivocada. Mejor decirlo que fingir que todo va bien.
    if (horas < -1) {
      return {
        clase: 'ult-act-sin',
        texto: 'Fecha de actualización inconsistente · <b>' + esc(cuando) + '</b>',
        titulo: 'La fecha registrada está en el futuro. Revisa la zona horaria del proceso de carga.'
      };
    }

    if (horas <= verde) {
      return {
        clase: 'ult-act-ok',
        texto: 'Actualizado: <b>' + esc(cuando) + '</b>',
        titulo: detalle.join(' · ')
      };
    }

    if (horas <= ambar) {
      return {
        clase: 'ult-act-medio',
        texto: 'Actualizado ' + antiguedad(horas) + ' · <b>' + esc(cuando) + '</b>',
        titulo: 'Última carga: ' + cuando + ' · ' + detalle.join(' · ')
      };
    }

    return {
      clase: 'ult-act-mal',
      texto: 'Sin actualizar desde el <b>' + esc(horas < 48 ? cuando : soloFecha(d)) +
             '</b> · ' + antiguedad(horas),
      titulo: 'Última carga: ' + cuando + ' · ' + detalle.join(' · ')
    };
  }

  function pintarUltimaActualizacion(elemento, info, opciones) {
    var el = typeof elemento === 'string'
      ? document.getElementById(elemento)
      : elemento;

    if (!el) {
      console.warn('pintarUltimaActualizacion: no existe el elemento', elemento);
      return null;
    }

    ponerEstilos();

    var r = estadoActualizacion(info, opciones);
    el.innerHTML = '<span class="ult-act ' + r.clase + '" title="' + esc(r.titulo) + '">' +
                   '<i></i><span>' + r.texto + '</span></span>';
    return r;
  }

  pintarUltimaActualizacion.estado = estadoActualizacion;
  window.pintarUltimaActualizacion = pintarUltimaActualizacion;
})();
