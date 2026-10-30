/* ===========================================================
   SEDA — intro

   Un video de 4 segundos: la red neuronal se arma con partículas,
   se queda un momento y estalla. Generado aparte, no en el
   navegador — ni librerías, ni WebGL, ni shaders.

   El primer cuadro del video es prácticamente el fondo liso del
   sitio, así que la tapa que pone el <head> y el video son del
   mismo color: no hay parpadeo al relevar.

   Solo en el inicio y una vez por sesión.
   =========================================================== */

(function () {
  "use strict";

  /* --- diagnóstico ---
     sessionStorage.removeItem('seda_intro')   para volver a verlo
     window.__introDebug = true                traza en consola */
  const DEPURAR = !!window.__introDebug;

  /* Quita la tapa que puso el script del <head>. Se puede llamar de más. */
  function destapar() {
    const h = document.documentElement;
    h.className = h.className.replace(/\s*con-intro\b/, '');
  }

  function traza(m) { if (DEPURAR) console.log('[intro] ' + m); }

  /* --- razones para no correr --- */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    traza('reduce motion'); return destapar();
  }
  try {
    if (sessionStorage.getItem('seda_intro') === 'visto') {
      traza('ya visto en esta sesión'); return destapar();
    }
  } catch (e) {}
  const ruta = location.pathname;
  if (ruta !== '/' && ruta !== '/index.html') { return destapar(); }

  /* --- ajustes ---
     Dos formatos por orientación. El WebM va primero porque pesa ~40%
     menos a la misma calidad; Safari y iOS caen al MP4. El navegador
     elige el primero que sepa reproducir. */
  const FUENTES = {
    ancho: [['/assets/video/intro-169.webm', 'video/webm'],
            ['/assets/video/intro-169.mp4',  'video/mp4']],
    alto:  [['/assets/video/intro-916.webm', 'video/webm'],
            ['/assets/video/intro-916.mp4',  'video/mp4']]
  };
  const T_FUNDIDO   = 450;    // cruce con el sitio (--medio del CSS)
  const T_ANTES     = 400;    // cuánto antes del final arranca el fundido
  const T_VIGIA     = 3000;   // si en este tiempo el video no tiene datos, se abandona
  const T_RESCATE   = 7000;   // último recurso: el intro se quita pase lo que pase

  let terminado = false;
  let rescate = setTimeout(function () {
    traza('rescate: el video nunca arrancó');
    terminar();
  }, T_RESCATE);

  const video = document.createElement('video');

  function terminar() {
    if (terminado) return;
    terminado = true;
    clearTimeout(rescate);
    try { sessionStorage.setItem('seda_intro', 'visto'); } catch (e) {}

    // el sitio se destapa mientras el video todavía se funde:
    // así no hay salto, hay cruce
    destapar();
    video.classList.add('saliendo');
    document.body.classList.remove('intro-activo');

    setTimeout(function () {
      try { video.pause(); } catch (e) {}
      if (video.parentNode) video.parentNode.removeChild(video);
    }, T_FUNDIDO + 80);
  }

  /* ===========================================================
     El video
     =========================================================== */

  // vertical solo si la pantalla es más alta que ancha
  const vertical = window.innerHeight > window.innerWidth;

  video.id = 'seda-intro';
  video.setAttribute('aria-hidden', 'true');

  const lista = FUENTES[vertical ? 'alto' : 'ancho'];
  let fallidas = 0;

  lista.forEach(function (par) {
    const s = document.createElement('source');
    s.src = par[0];
    s.type = par[1];
    // El error llega a cada <source>, no al <video>. Si fallan todas,
    // no hay nada que esperar: se abandona de inmediato en vez de
    // dejar la pantalla tapada hasta que salte el vigía.
    s.addEventListener('error', function () {
      if (++fallidas >= lista.length) {
        traza('fallaron todas las fuentes');
        terminar();
      }
    });
    video.appendChild(s);
  });
  video.muted = true;              // sin esto iOS no deja reproducir solo
  video.defaultMuted = true;
  video.playsInline = true;        // sin esto iOS lo abre a pantalla completa
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.preload = 'auto';
  video.autoplay = true;
  video.loop = false;
  video.controls = false;

  // cuelga de <html>, no de <body>: el body está oculto hasta el final
  document.documentElement.appendChild(video);
  document.body.classList.add('intro-activo');

  /* --- arranque --- */

  let fundidoProgramado = false;

  function programarFundido() {
    if (fundidoProgramado || terminado) return;
    const dur = video.duration;
    if (!dur || !isFinite(dur)) return;
    fundidoProgramado = true;
    clearTimeout(rescate);
    const falta = Math.max(0, (dur * 1000) - T_ANTES - (video.currentTime * 1000));
    traza('duración ' + dur.toFixed(2) + 's, fundido en ' + Math.round(falta) + 'ms');
    setTimeout(terminar, falta);
  }

  video.addEventListener('playing', function () {
    traza('reproduciendo');
    video.classList.add('listo');
    programarFundido();
  });

  video.addEventListener('loadedmetadata', programarFundido);

  // si se acaba antes de que dispare el fundido, cerramos igual
  video.addEventListener('ended', terminar);

  video.addEventListener('error', function () {
    traza('el video no cargó');
    terminar();
  });

  /* Con varias <source>, el error de "ninguna sirve" no siempre llega, y
     una conexión lenta puede dejar la pantalla tapada un buen rato. Si en
     T_VIGIA el video no tiene ni un cuadro listo, se abandona el intro:
     más vale entrar sin él que mirar una pantalla vacía. */
  setTimeout(function () {
    if (terminado) return;
    if (video.readyState < 2) {       // HAVE_CURRENT_DATA
      traza('vigía: sin datos a los ' + T_VIGIA + 'ms, se abandona');
      terminar();
    }
  }, T_VIGIA);

  // Un intro que no puedes saltar envejece mal.
  function saltar() {
    window.removeEventListener('pointerdown', saltar);
    window.removeEventListener('keydown', saltar);
    window.removeEventListener('wheel', saltar);
    terminar();
  }
  window.addEventListener('pointerdown', saltar, { passive: true });
  window.addEventListener('keydown', saltar);
  window.addEventListener('wheel', saltar, { passive: true });

  // play() puede ser rechazado (ahorro de batería, políticas del navegador).
  // Si pasa, el sitio abre normal en vez de quedarse tapado.
  const intento = video.play();
  if (intento && typeof intento.catch === 'function') {
    intento.catch(function (e) {
      traza('play() rechazado: ' + (e && e.name));
      terminar();
    });
  }

})();
