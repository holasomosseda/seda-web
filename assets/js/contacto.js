/* ===========================================================
   SEDA — bot de contacto
   Califica al visitante y arma el mensaje por él.
   Sin servidor: todo ocurre en el navegador.
   =========================================================== */

(function () {
  "use strict";

  const caja = document.getElementById('bot-contacto');
  if (!caja) return;

  const WHATSAPP = '525545883123';

  const hilo  = caja.querySelector('.chat-hilo');
  const forma = caja.querySelector('.chat-forma');
  const campo = caja.querySelector('.chat-campo');

  /* Los textos NO viven aquí: viven en el diccionario de idioma.js.
     Aquí solo quedan las claves, para que el bot hable el idioma que
     el visitante eligió. */
  const T = (k, d) => (window.SEDA ? window.SEDA.t(k, d) : k);

  const PASOS = [
    { clave: 'negocio',  pregunta: 'bot.cont.q1', pista: 'bot.cont.q1p' },
    { clave: 'problema', pregunta: 'bot.cont.q2', pista: 'bot.cont.q2p' },
    { clave: 'nombre',   pregunta: 'bot.cont.q3', pista: 'bot.cont.q3p' }
  ];

  let paso = 0;
  const datos = {};
  let terminado = false;

  function burbuja(texto, quien) {
    const el = document.createElement('div');
    el.className = `chat-msj chat-${quien}`;
    el.textContent = texto;
    hilo.appendChild(el);
    hilo.scrollTop = hilo.scrollHeight;
  }

  function escribiendo() {
    const el = document.createElement('div');
    el.className = 'chat-msj chat-bot chat-escribiendo';
    el.innerHTML = '<span></span><span></span><span></span>';
    hilo.appendChild(el);
    hilo.scrollTop = hilo.scrollHeight;
    return el;
  }

  function responder(texto, demora = 700, luego) {
    const puntos = escribiendo();
    setTimeout(() => {
      puntos.remove();
      burbuja(texto, 'bot');
      if (luego) luego();
    }, demora);
  }

  function preguntar() {
    const p = PASOS[paso];
    responder(T(p.pregunta), paso === 0 ? 900 : 650, () => {
      campo.placeholder = T(p.pista);
      campo.focus();
    });
  }

  function armarMensaje() {
    return T('bot.cont.wa', datos);
  }

  /* el botón se crea YA con su enlace dentro del chat */
  function ponerBoton() {
    const enlace = document.createElement('a');
    enlace.className = 'chat-accion';
    enlace.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(armarMensaje())}`;
    enlace.target = '_blank';
    enlace.rel = 'noopener';
    enlace.innerHTML = '<span></span>';
    enlace.firstChild.textContent = T('bot.cont.boton');
    hilo.appendChild(enlace);
    hilo.scrollTop = hilo.scrollHeight;
  }

  function cerrar() {
    responder(T('bot.cont.resumen', datos), 1000, () => {
      responder(T('bot.cont.cierre', datos), 850, () => {
        ponerBoton();
        caja.classList.add('terminado');
        terminado = true;
      });
    });
  }

  forma.addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = campo.value.trim();
    if (!valor || terminado) return;

    burbuja(valor, 'yo');
    datos[PASOS[paso].clave] = valor;
    campo.value = '';
    campo.placeholder = '';
    paso++;

    setTimeout(() => {
      if (paso < PASOS.length) preguntar();
      else cerrar();
    }, 300);
  });

  function arrancar() {
    responder(T('bot.cont.hola'), 600, () => {
      responder(T('bot.cont.intro'), 900, preguntar);
    });
  }

  /* Al cambiar de idioma se reinicia la conversación. Traducir las
     burbujas ya escritas dejaría media charla en cada idioma. */
  let arrancado = false;
  document.addEventListener('seda:idioma', () => {
    if (!arrancado) return;
    hilo.innerHTML = '';
    paso = 0; terminado = false;
    for (const k in datos) delete datos[k];
    caja.classList.remove('terminado');
    campo.value = '';
    campo.placeholder = T('bot.cont.ph');
    arrancar();
  });

  if ('IntersectionObserver' in window) {
    const ojo = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { arrancado = true; arrancar(); ojo.disconnect(); }
    }, { threshold: 0.35 });
    ojo.observe(caja);
  } else {
    arrancado = true;
    arrancar();
  }
})();
