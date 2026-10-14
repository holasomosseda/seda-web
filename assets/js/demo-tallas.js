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

  const PASOS = [
    { clave: 'busto',   pregunta: '¿Cuál es tu medida de busto en centímetros? 📏', min: 60, max: 180 },
    { clave: 'cintura', pregunta: 'Perfecto. ¿Y tu cintura, en centímetros?',       min: 45, max: 180 },
    { clave: 'cadera',  pregunta: 'Última. ¿Tu cadera, en centímetros?',            min: 60, max: 200 }
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

    let texto = `Tu talla recomendada es ${talla} ✨\n\n`
              + `Busto ${medidas.busto.toFixed(1)} cm\n`
              + `Cintura ${medidas.cintura.toFixed(1)} cm\n`
              + `Cadera ${medidas.cadera.toFixed(1)} cm`;

    if (dif > 14) {
      texto += `\n\nTus medidas varían bastante entre sí. Si el conjunto es de dos piezas, `
             + `puede convenirte una talla distinta arriba y abajo. Escríbeme y lo vemos.`;
    }

    responder(texto, 900);

    setTimeout(() => {
      responder('¿Quieres que una persona te ayude a elegir? 💬', 500);
      setTimeout(() => {
        caja.classList.add('terminado');
        terminado = true;
      }, 700);
    }, 1900);
  }

  function preguntar() {
    responder(PASOS[paso].pregunta, paso === 0 ? 900 : 650);
  }

  function procesar(valor) {
    const limpio = valor.replace(',', '.').replace(/[^\d.]/g, '');
    const n = parseFloat(limpio);
    const p = PASOS[paso];

    if (isNaN(n)) {
      responder('No alcancé a entender ese número. Mándamelo solo en cifras, por ejemplo 92');
      return;
    }
    if (n < p.min || n > p.max) {
      responder(`Esa medida se sale de lo normal. ¿Seguro que está en centímetros? Intenta de nuevo.`);
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
      hilo.innerHTML = '';
      paso = 0; terminado = false;
      delete medidas.busto; delete medidas.cintura; delete medidas.cadera;
      caja.classList.remove('terminado');
      arrancar();
    });
  }

  function arrancar() {
    responder('¡Hola! Soy el asesor de tallas de Marea Swim 🌊', 500);
    setTimeout(() => {
      responder('Te hago tres preguntas rápidas y te digo tu talla exacta.', 600);
      setTimeout(preguntar, 1400);
    }, 1300);
  }

  /* arranca solo cuando el demo entra en pantalla */
  if ('IntersectionObserver' in window) {
    const ojo = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { arrancar(); ojo.disconnect(); }
    }, { threshold: 0.4 });
    ojo.observe(caja);
  } else {
    arrancar();
  }
})();
