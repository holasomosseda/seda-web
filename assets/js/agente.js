/* ===========================================================
   SEDA — el mini agente de Smart Webs

   El clip viene con el fondo ya quitado en CapCut, o sea con FONDO
   NEGRO PURO (un MP4 no puede llevar transparencia). La transparencia
   se calcula aquí, cuadro por cuadro, a partir del brillo de cada píxel.

   Por qué no se usa `mix-blend-mode: screen`, que sería gratis:
   atmosfera.css le pone `z-index: 1` a <main>, y eso crea un contexto
   de apilado. El video quedaría mezclándose contra el fondo de <main>
   —que es transparente— y nunca contra el lienzo de la nebulosa, que
   vive afuera en z-index 0. El negro seguiría ahí. Medido: se ve la
   caja igual. Es pariente del bug del header de octubre.

   Medido en el entorno de pruebas a 380px: 6.4ms por cuadro de mediana,
   18.9ms el peor, contra un presupuesto de 33ms a 30fps.
   =========================================================== */

(function () {
  'use strict';

  var caja = document.querySelector('[data-agente]');
  if (!caja) return;

  var video  = caja.querySelector('video');
  var lienzo = caja.querySelector('canvas');
  if (!video || !lienzo) return;

  /* --- Los dos umbrales del recorte ---
     Medido sobre el clip: el fondo está en luma 0, y lo más oscuro del
     robot que hay que conservar es la tapa del escritorio en 34.8, la
     cara en 79.6 y el hombro teal en 51.8.
     Por debajo de BAJO: transparente. Por arriba de ALTO: opaco.
     En medio, rampa. Subirlos de más se come el escritorio; bajarlos
     deja un halo oscuro alrededor de las burbujas. */
  var BAJO = 22;
  var ALTO = 48;

  /* Desde qué fracción del alto empieza a desvanecerse hacia abajo.
     Sin esto el escritorio queda como una tabla flotando; así se
     disuelve en la nebulosa. */
  var DESVANECE = 0.58;

  /* Tope de nitidez. El costo por cuadro crece con el cuadrado de este
     número, así que no se usa el devicePixelRatio completo en pantallas
     3x: a 2 ya se ve nítido. */
  var NITIDEZ_MAX = 2;

  var ctx = lienzo.getContext('2d', { willReadFrequently: true });
  if (!ctx) { caja.remove(); return; }

  /* Red de seguridad por si `sitio.css` no llega (caché viejo, 404):
     sin sus reglas el lienzo se iría a sus 900px de atributo y el hero
     quedaría destrozado, que es justo lo que pasó el 3 de noviembre.
     Esto lo deja en un tamaño sensato pase lo que pase. Cuando el CSS
     sí carga, su `width` manda y este tope no estorba porque la clamp
     nunca pasa de 380. */
  lienzo.style.display = 'block';
  lienzo.style.maxWidth = '380px';
  lienzo.style.height = 'auto';

  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var corriendo = false;
  var pedido = null;
  var W = 0, H = 0, corte = 0;

  function medir() {
    if (!video.videoWidth) return false;
    var anchoCss = lienzo.getBoundingClientRect().width;
    if (!anchoCss) return false;
    var escala = Math.min(window.devicePixelRatio || 1, NITIDEZ_MAX);
    var nuevoW = Math.round(anchoCss * escala);
    var nuevoH = Math.round(nuevoW * video.videoHeight / video.videoWidth);
    if (nuevoW === W && nuevoH === H) return true;
    W = nuevoW; H = nuevoH;
    lienzo.width = W; lienzo.height = H;
    corte = Math.round(H * DESVANECE);
    return true;
  }

  function pintar() {
    if (!medir()) return;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(video, 0, 0, W, H);

    var img = ctx.getImageData(0, 0, W, H);
    var px = img.data;
    var rango = ALTO - BAJO;
    var j = 0;

    for (var y = 0; y < H; y++) {
      var caida = y <= corte ? 1 : Math.max(0, 1 - (y - corte) / (H - corte));
      for (var x = 0; x < W; x++, j += 4) {
        var luma = px[j] * 0.2126 + px[j + 1] * 0.7152 + px[j + 2] * 0.0722;
        var a = luma <= BAJO ? 0 : (luma >= ALTO ? 1 : (luma - BAJO) / rango);
        px[j + 3] = (a * caida * 255) | 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    lienzo.classList.add('visible');
  }

  function cuadro() {
    if (!corriendo) return;
    pintar();
    pedido = requestAnimationFrame(cuadro);
  }

  function arrancar() {
    if (corriendo) return;
    corriendo = true;
    if (quieto) {
      /* Con Reduce Motion no se anima: un solo cuadro y ya. */
      video.currentTime = Math.min(2.2, video.duration || 2.2);
      video.pause();
      requestAnimationFrame(function () { pintar(); corriendo = false; });
      return;
    }
    var promesa = video.play();
    if (promesa && promesa.catch) {
      promesa.catch(function () { rendirse(); });
    }
    pedido = requestAnimationFrame(cuadro);
  }

  function parar() {
    corriendo = false;
    if (pedido) { cancelAnimationFrame(pedido); pedido = null; }
    if (!video.paused) video.pause();
  }

  /* Si el video no carga, el bloque entero se va: más vale que no esté
     a que quede un hueco. */
  function rendirse() { parar(); caja.remove(); }
  video.addEventListener('error', rendirse);

  /* Arranca al entrar en pantalla, igual que los dos bots. */
  if ('IntersectionObserver' in window) {
    var vigia = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) arrancar(); else parar();
      });
    }, { threshold: 0.25 });
    vigia.observe(lienzo);
  } else {
    arrancar();
  }

  /* Igual que atmosfera.js: con la pestaña escondida no se gasta nada. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) parar();
    else if (lienzo.isConnected) arrancar();
  });

  window.addEventListener('resize', function () { W = 0; H = 0; });

  /* --- La mudanza de celular ---
     En el hero de celular no cabe: medido, a 375x812 quedan 80px libres
     bajo el botón y el robot ocupa 117. Apilarlo ahí empujaba el CTA
     fuera de pantalla, que es justo el error de la etiqueta
     "PRUÉBALO AHORA" de noviembre. Así que debajo de 860px se muda a
     "La prueba es dónde estás parado", donde el copy ya dice lo que el
     clip demuestra y hay espacio de sobra. */
  var casaEscritorio = caja.parentNode;
  var casaCelular = document.querySelector('[data-agente-casa-celular]');
  var angosto = window.matchMedia('(max-width: 860px)');

  function acomodar(e) {
    if (!casaCelular) return;
    var destino = e.matches ? casaCelular : casaEscritorio;
    if (caja.parentNode === destino) return;
    if (destino === casaEscritorio) {
      /* De vuelta al hero: va antes del botón, como en el HTML. */
      destino.insertBefore(caja, destino.querySelector('.boton'));
    } else {
      destino.appendChild(caja);
    }
    W = 0; H = 0;
  }
  acomodar(angosto);
  if (angosto.addEventListener) angosto.addEventListener('change', acomodar);
  else if (angosto.addListener) angosto.addListener(acomodar);

  /* El texto alternativo sale del diccionario, como todo lo demás. */
  function etiquetar() {
    if (window.SEDA && window.SEDA.t) {
      lienzo.setAttribute('aria-label', window.SEDA.t('sit.agente.alt'));
    }
  }
  etiquetar();
  document.addEventListener('seda:idioma', etiquetar);
})();
