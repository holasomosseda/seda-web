/* ===========================================================
   SEDA — bot de contacto
   Califica al visitante y arma el mensaje por él.
   Sin servidor: todo ocurre en el navegador.
   =========================================================== */

(function () {
  "use strict";

  const caja = document.getElementById('bot-contacto');
  if (!caja) return;

  const WHATSAPP = '524461113272';
  const CORREO   = 'holasomosseda@gmail.com';

  const hilo   = caja.querySelector('.chat-hilo');
  const forma  = caja.querySelector('.chat-forma');
  const campo  = caja.querySelector('.chat-campo');
  const salida = caja.querySelector('.chat-salida');

  const PASOS = [
    {
      clave: 'negocio',
      pregunta: '¿A qué se dedica tu negocio?',
      pista: 'Panadería, escuela de idiomas, tienda de ropa…'
    },
    {
      clave: 'problema',
      pregunta: 'Perfecto. ¿Qué es lo que repites todos los días y te gustaría quitarte de encima?',
      pista: 'Contestar los mismos mensajes, agendar citas, cotizar…'
    },
    {
      clave: 'nombre',
      pregunta: 'Va. ¿Cómo te llamas?',
      pista: 'Tu nombre'
    }
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
    responder(p.pregunta, paso === 0 ? 900 : 650, () => {
      campo.placeholder = p.pista;
      campo.focus();
    });
  }

  function armarMensaje() {
    return `Hola, soy ${datos.nombre}.\n\n`
         + `Mi negocio: ${datos.negocio}\n\n`
         + `Lo que repito todos los días: ${datos.problema}\n\n`
         + `Me gustaría ver si se puede automatizar.`;
  }

  function cerrar() {
    const resumen = `Esto es lo que entendí:\n\n`
                  + `Negocio: ${datos.negocio}\n`
                  + `A resolver: ${datos.problema}\n\n`
                  + `${datos.nombre}, con esto ya puedo decirte algo útil. Elige por dónde seguimos.`;

    responder(resumen, 1000, () => {
      const texto = armarMensaje();
      salida.querySelector('.ir-whatsapp').href =
        `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
      salida.querySelector('.ir-correo').href =
        `mailto:${CORREO}?subject=${encodeURIComponent('Consulta desde somosseda.com')}`
        + `&body=${encodeURIComponent(texto)}`;

      caja.classList.add('terminado');
      salida.hidden = false;
      terminado = true;
      salida.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    responder('Hola 👋 Soy el asistente de SEDA.', 600, () => {
      responder('Te hago tres preguntas para entender tu caso, y te dejo listo el mensaje para enviármelo. Treinta segundos.', 900, preguntar);
    });
  }

  if ('IntersectionObserver' in window) {
    const ojo = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { arrancar(); ojo.disconnect(); }
    }, { threshold: 0.35 });
    ojo.observe(caja);
  } else {
    arrancar();
  }
})();
