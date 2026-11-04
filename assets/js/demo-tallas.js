/* ===========================================================
   SEDA — demo del Asesor de Tallas
   Simula el bot real. Tabla genérica, marca ficticia.
   Todo corre en el navegador: no hay servidor detrás.
   =========================================================== */

(function () {
  "use strict";

  const caja = document.getElementById('demo-tallas');
  if (!caja) return;

  const hilo   = caja.querySelector('.chat-hilo');
  const campo  = caja.querySelector('.chat-campo');
  const enviar = caja.querySelector('.chat-enviar');
  const forma  = caja.querySelector('.chat-forma');
  const reiniciar = caja.querySelector('.chat-reiniciar');

  /* --- tabla genérica, en centímetros --- */
  const TALLAS = [
    { max: 82,  talla: 'XS' },
    { max: 87,  talla: 'S'  },
    { max: 93,  talla: 'M'  },
    { max: 100, talla: 'L'  },
    { max: 108, talla: 'XL' },
    { max: 117, talla: '2XL' },
    { max: 126, talla: '3XL' },
    { max: 999, talla: '4XL' }
  ];

  /* Los textos viven en el diccionario de idioma.js, no aquí: si no,
     el sitio cambia a inglés y el bot se queda en español. */
  const T = (k, d) => (window.SEDA ? window.SEDA.t(k, d) : k);

  const PASOS = [
    { clave: 'busto',   pregunta: 'bot.tal.q1', min: 60, max: 180 },
    { clave: 'cintura', pregunta: 'bot.tal.q2', min: 45, max: 180 },
    { clave: 'cadera',  pregunta: 'bot.tal.q3', min: 60, max: 200 }
  ];

  let paso = 0;
  const medidas = {};
  let terminado = false;

  /* --- pintar mensajes --- */

  function burbuja(texto, quien) {
    const el = document.createElement('div');
    el.className = `chat-msj chat-${quien}`;
    el.textContent = texto;
    hilo.appendChild(el);
    hilo.scrollTop = hilo.scrollHeight;
    return el;
  }

  function escribiendo() {
    const el = document.createElement('div');
    el.className = 'chat-msj chat-bot chat-escribiendo';
    el.innerHTML = '<span></span><span></span><span></span>';
    hilo.appendChild(el);
    hilo.scrollTop = hilo.scrollHeight;
    return el;
  }

  function responder(texto, demora = 700) {
    const puntos = escribiendo();
    setTimeout(() => {
      puntos.remove();
      burbuja(texto, 'bot');
    }, demora);
  }

  /* --- lógica --- */

  function tallaDe(busto) {
    for (const t of TALLAS) if (busto <= t.max) return t.talla;
    return '4XL';
  }

  function resultado() {
    const talla = tallaDe(medidas.busto);
    const dif = Math.max(medidas.busto, medidas.cadera) - Math.min(medidas.busto, medidas.cadera);

    let texto = T('bot.tal.res', {
      talla:   talla,
      busto:   medidas.busto.toFixed(1),
      cintura: medidas.cintura.toFixed(1),
      cadera:  medidas.cadera.toFixed(1)
    });

    if (dif > 14) texto += T('bot.tal.dif');

    responder(texto, 900);

    setTimeout(() => {
      responder(T('bot.tal.ayuda'), 500);
      setTimeout(() => {
        caja.classList.add('terminado');
        terminado = true;
      }, 700);
    }, 1900);
  }

  function preguntar() {
    responder(T(PASOS[paso].pregunta), paso === 0 ? 900 : 650);
  }

  function procesar(valor) {
    const limpio = valor.replace(',', '.').replace(/[^\d.]/g, '');
    const n = parseFloat(limpio);
    const p = PASOS[paso];

    if (isNaN(n)) {
      responder(T('bot.tal.nonum'));
      return;
    }
    if (n < p.min || n > p.max) {
      responder(T('bot.tal.fuera'));
      return;
    }

    medidas[p.clave] = n;
    paso++;

    if (paso < PASOS.length) preguntar();
    else resultado();
  }

  /* --- eventos --- */

  forma.addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = campo.value.trim();
    if (!valor || terminado) return;
    burbuja(valor, 'yo');
    campo.value = '';
    setTimeout(() => procesar(valor), 260);
  });

  if (reiniciar) {
    reiniciar.addEventListener('click', () => {
      limpiar();
      arrancar();
    });
  }

  function arrancar() {
    responder(T('bot.tal.hola'), 500);
    setTimeout(() => {
      responder(T('bot.tal.intro'), 600);
      setTimeout(preguntar, 1400);
    }, 1300);
  }

  function limpiar() {
    hilo.innerHTML = '';
    paso = 0; terminado = false;
    delete medidas.busto; delete medidas.cintura; delete medidas.cadera;
    caja.classList.remove('terminado');
  }

  /* Al cambiar de idioma la conversación se reinicia: traducir las
     burbujas ya escritas dejaría media charla en cada idioma. */
  let arrancado = false;
  document.addEventListener('seda:idioma', () => {
    if (!arrancado) return;
    limpiar();
    campo.value = '';
    campo.placeholder = T('bot.tal.ph');
    arrancar();
  });

  /* arranca solo cuando el demo entra en pantalla */
  if ('IntersectionObserver' in window) {
    const ojo = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { arrancado = true; arrancar(); ojo.disconnect(); }
    }, { threshold: 0.4 });
    ojo.observe(caja);
  } else {
    arrancado = true;
    arrancar();
  }
})();
