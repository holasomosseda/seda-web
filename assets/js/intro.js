/* ===========================================================
   SEDA — intro

   Orden: la red neuronal aparece nítida y se queda quieta un
   momento — SE VE — y recién entonces estalla en partículas.
   La imagen se dibuja como textura; las partículas solo existen
   durante el estallido. Esa es la diferencia entre que se
   entienda y que parezca ruido.

   Three.js r128 (UMD) + UnrealBloomPass. El bloom es lo que hace
   que los filamentos resplandezcan en vez de verse como puntos
   planos; a mano serían varios pases de render a textura.

   Three.js se descarga SOLO si el intro va a correr. Quien ya lo
   vio, quien trae Reduce Motion o quien no tiene WebGL no baja
   un byte de librería.
   =========================================================== */

(function () {
  "use strict";

  /* --- diagnóstico ---
     En la consola, antes de recargar:
       window.__introDebug = true   conteos y búfer conservado
       window.__introZoom  = 2.0    acercamiento en vertical
       window.__introBloom = 1.2    fuerza del resplandor
       sessionStorage.removeItem('seda_intro')   para volver a verlo
     Este efecto no se depura leyendo el código: se mide. */
  const DEPURAR = !!window.__introDebug;

  /* Quita la tapa que puso el script del <head>. Se puede llamar de más. */
  function destapar() {
    const h = document.documentElement;
    h.className = h.className.replace(/\s*con-intro\b/, '');
  }

  /* --- razones para no correr, antes de descargar nada --- */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return destapar();
  try {
    if (sessionStorage.getItem('seda_intro') === 'visto') return destapar();
  } catch (e) {}
  const ruta = location.pathname;
  if (ruta !== '/' && ruta !== '/index.html') return destapar();

  // ¿hay WebGL? Si no, ni vale la pena bajar la librería.
  try {
    const prueba = document.createElement('canvas');
    if (!(prueba.getContext('webgl') || prueba.getContext('experimental-webgl'))) {
      return destapar();
    }
  } catch (e) { return destapar(); }

  /* --- ajustes --- */
  const IMAGEN        = '/assets/img/nudo.jpg';
  const LUZ_MINIMA    = 30;    // debajo de esto el píxel es fondo, no partícula
  const ANCHO_MUESTRA = 1288;  // se muestrea en chico y se muestra en grande
  const PASO          = 3;     // cada cuántos píxeles de la muestra sale una partícula
  const chico         = window.innerWidth < 760;
  const PUNTO         = chico ? 2.0 : 2.4;
  // Negro puro, igual que el fondo de la imagen. Si el lienzo es más claro,
  // se ve el rectángulo de la foto recortado contra él — se nota feo en
  // vertical, donde la imagen no llega a las orillas.
  const FONDO         = 0x000000;

  /* Tiempos en milisegundos. La suma es lo que dura el intro. */
  const T_ENTRADA   = 1000;  // la red aparece
  const T_CALMA     = 1600;  // se queda quieta: aquí es donde SE VE
  const T_ESTALLIDO = 1800;  // se desintegra
  const T_FUNDIDO   = 450;   // el lienzo se funde al sitio (--medio del CSS)
  const T_RESCATE   = 12000; // si algo se atora, el intro se quita solo

  let terminado = false;
  let rescate = setTimeout(terminar, T_RESCATE);

  function terminar() {
    if (terminado) return;
    terminado = true;
    clearTimeout(rescate);
    try { sessionStorage.setItem('seda_intro', 'visto'); } catch (e) {}
    // el sitio se destapa mientras el lienzo todavía se funde:
    // así no hay salto, hay cruce
    destapar();
    const l = document.getElementById('seda-intro');
    if (l) {
      l.classList.add('saliendo');
      setTimeout(() => { if (l.parentNode) l.parentNode.removeChild(l); }, T_FUNDIDO + 80);
    }
    document.body.classList.remove('intro-activo');
  }

  /* ===========================================================
     Cargar Three.js solo ahora que sabemos que hace falta
     =========================================================== */

  function cargar(src) {
    return new Promise(function (ok, mal) {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;          // el orden importa: postproceso depende de three
      s.onload = ok;
      s.onerror = function () { mal(new Error('no cargó ' + src)); };
      document.head.appendChild(s);
    });
  }

  cargar('/assets/js/vendor/three.min.js')
    .then(function () { return cargar('/assets/js/vendor/postproceso.js'); })
    .then(cargarImagen)
    .catch(function (e) {
      if (DEPURAR) console.warn('[intro]', e.message);
      terminar();   // si la librería no llega, el sitio abre normal
    });

  /* ===========================================================
     La imagen: textura para mostrar, muestreo para estallar
     =========================================================== */

  function cargarImagen() {
    if (terminado) return;
    return new Promise(function (ok, mal) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = function () { ok(img); };
      img.onerror = function () { mal(new Error('no cargó la imagen')); };
      img.src = IMAGEN;
    }).then(construir);
  }

  function muestrear(img, aspecto) {
    const ma  = Math.min(ANCHO_MUESTRA, img.naturalWidth);
    const mal = Math.round(ma / aspecto);

    const lec = document.createElement('canvas');
    lec.width = ma; lec.height = mal;
    const c2 = lec.getContext('2d', { willReadFrequently: true });
    if (!c2) return null;
    c2.drawImage(img, 0, 0, ma, mal);

    let datos;
    try { datos = c2.getImageData(0, 0, ma, mal).data; }
    catch (e) { return null; }

    const pos = [], col = [], sem = [];
    const altoMundo = 2 / aspecto;   // el plano mide 2 de ancho

    for (let y = 0; y < mal; y += PASO) {
      for (let x = 0; x < ma; x += PASO) {
        const i = (y * ma + x) * 4;
        const r = datos[i], g = datos[i + 1], b = datos[i + 2];
        if (0.2126 * r + 0.7152 * g + 0.0722 * b < LUZ_MINIMA) continue;

        // sacudir la rejilla: si no, se ven las hileras del muestreo
        const jx = x + (Math.random() - 0.5) * PASO;
        const jy = y + (Math.random() - 0.5) * PASO;

        pos.push(
          (jx / ma - 0.5) * 2,
          -(jy / mal - 0.5) * altoMundo,
          (Math.random() - 0.5) * 0.06    // un poco de grosor, para que el estallido tenga volumen
        );
        col.push(r / 255, g / 255, b / 255);
        sem.push(Math.random());
      }
    }
    return { pos, col, sem, total: sem.length, ma, mal };
  }

  /* ===========================================================
     Escena
     =========================================================== */

  function construir(img) {
    if (terminado) return;

    const aspecto = img.naturalWidth / img.naturalHeight;
    const m = muestrear(img, aspecto);
    if (!m || !m.total) { terminar(); return; }

    if (DEPURAR) {
      console.log('[intro] ' + m.total + ' partículas, paso ' + PASO +
        ', muestra ' + m.ma + 'x' + m.mal +
        ', textura ' + img.naturalWidth + 'x' + img.naturalHeight +
        ', three ' + THREE.REVISION);
    }

    const lienzo = document.createElement('canvas');
    lienzo.id = 'seda-intro';
    lienzo.setAttribute('aria-hidden', 'true');
    // cuelga de <html>, no de <body>: el body está oculto hasta el final
    document.documentElement.appendChild(lienzo);
    document.body.classList.add('intro-activo');

    let render;
    try {
      render = new THREE.WebGLRenderer({
        canvas: lienzo, antialias: true, alpha: false,
        preserveDrawingBuffer: DEPURAR   // solo para poder capturar al depurar
      });
    } catch (e) { terminar(); return; }

    const pr = Math.min(window.devicePixelRatio || 1, chico ? 1.75 : 2);
    render.setPixelRatio(pr);
    render.setClearColor(FONDO, 1);

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(50, 1, 0.01, 100);

    /* --- la red, como imagen nítida --- */
    const textura = new THREE.Texture(img);
    textura.needsUpdate = true;
    textura.minFilter = THREE.LinearFilter;   // no es potencia de dos
    textura.magFilter = THREE.LinearFilter;
    textura.generateMipmaps = false;

    const plano = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2 / aspecto),
      new THREE.MeshBasicMaterial({
        map: textura,
        transparent: true,
        opacity: 0,
        // mezcla normal, NO aditiva: la imagen ya es brillante y tiene fondo
        // negro. En aditivo todo se pasa del umbral del bloom y se lava.
        blending: THREE.NormalBlending,
        depthWrite: false
      })
    );
    escena.add(plano);

    /* --- las partículas --- */
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3));
    geo.setAttribute('aColor',   new THREE.Float32BufferAttribute(m.col, 3));
    geo.setAttribute('aSemilla', new THREE.Float32BufferAttribute(m.sem, 1));

    const matPuntos = new THREE.ShaderMaterial({
      uniforms: {
        uEstalla: { value: 0 },
        uPunto:   { value: PUNTO * pr }
      },
      vertexShader: `
        attribute vec3  aColor;
        attribute float aSemilla;

        uniform float uEstalla;
        uniform float uPunto;

        varying vec3  vColor;
        varying float vAlfa;

        void main() {
          // Muy escalonado a propósito: unas se van temprano y otras siguen
          // en su sitio hasta el final. Así la red se EROSIONA en vez de
          // inflarse como globo y dejar el centro hueco.
          float s = clamp((uEstalla - aSemilla * 0.55) / 0.45, 0.0, 1.0);
          s = s * s * (3.0 - 2.0 * s);

          vec3 dir = normalize(position + vec3(0.0001));
          float ang = aSemilla * 6.2831853;
          vec3 deriva = vec3(cos(ang), sin(ang * 1.3), sin(ang * 2.3));

          vec3 p = position;
          p += dir * s * (0.10 + aSemilla * 0.40);          // empuje radial suave
          p += deriva * s * s * (0.22 + aSemilla * 0.30);   // dispersión que crece
          p.z += s * s * aSemilla * 0.35;                   // algunas vienen hacia la cámara

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uPunto * (1.0 + aSemilla * 0.7) * (1.0 + s * 0.5)
                         * (1.6 / max(-mv.z, 0.001));

          // entran mientras la imagen se va: los dos cruzan en la misma ventana
          float entra = smoothstep(0.0, 0.28, uEstalla);
          float sale  = 1.0 - smoothstep(0.30, 1.0, s);

          vColor = aColor * 1.30;
          vAlfa  = entra * sale;
        }
      `,
      fragmentShader: `
        precision mediump float;
        varying vec3  vColor;
        varying float vAlfa;
        void main() {
          vec2  c = gl_PointCoord - 0.5;
          float d = dot(c, c);
          if (d > 0.25) discard;
          float a = smoothstep(0.25, 0.015, d);
          gl_FragColor = vec4(vColor, a * vAlfa);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });

    const puntos = new THREE.Points(geo, matPuntos);
    puntos.visible = false;
    escena.add(puntos);

    /* --- postproceso: el bloom es lo que lo hace ver caro --- */
    let compositor = null, bloom = null;
    try {
      compositor = new THREE.EffectComposer(render);
      compositor.addPass(new THREE.RenderPass(escena, camara));
      bloom = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        typeof window.__introBloom === 'number' ? window.__introBloom : 0.45,  // fuerza
        0.35,                          // radio
        0.75                           // umbral alto: solo resplandecen los
                                       // nodos de luz, no todo el filamento
      );
      compositor.addPass(bloom);
    } catch (e) {
      compositor = null;   // sin bloom se ve más plano, pero se ve
      if (DEPURAR) console.warn('[intro] sin bloom:', e.message);
    }

    /* --- encuadre --- */
    function medir() {
      const an = window.innerWidth, al = window.innerHeight;
      render.setSize(an, al);
      if (compositor) compositor.setSize(an, al);

      camara.aspect = an / al;
      // distancia a la que el plano de 2 de ancho llena justo el ancho
      const d = 1 / (Math.tan((camara.fov * Math.PI / 180) / 2) * camara.aspect);
      // en vertical eso deja una banda chica al centro, así que se acerca
      // En vertical se acerca bastante: con la imagen completa queda una
      // banda chica al centro del teléfono. Lo que se sale por los lados
      // son los filamentos de las orillas, los menos densos.
      // En vertical se llena el alto exacto (no una banda al centro). Ese
      // 3.87 no es arbitrario: es el acercamiento al que el plano cubre
      // justo la altura, que es lo mismo que hace el CSS con
      // `background-size: auto 100%`. Si los dos no coinciden, el relevo
      // de la imagen de CSS al lienzo se nota como un salto.
      const llenarAlto = aspecto / (an / al);
      const zoom = window.__introZoom || (an < al ? llenarAlto : 1.0);
      camara.position.z = d / zoom;
      camara.updateProjectionMatrix();
    }
    window.addEventListener('resize', medir, { passive: true });
    medir();

    animar();

    /* =========================================================
       Animación: aparece · se queda quieta · estalla
       ========================================================= */

    function animar() {
      // El reloj NO arranca aquí: arranca cuando el <head> pintó la imagen
      // por CSS. Si Three.js tardó, retomamos la línea de tiempo donde va
      // en vez de hacer esperar al visitante otra vez.
      const inicio = typeof window.__sedaT0 === 'number'
        ? window.__sedaT0
        : performance.now();

      // ...pero el estallido no puede haber pasado ya: si la librería llegó
      // tarde, se corre para que siempre se vea.
      const transcurrido = performance.now() - inicio;
      const retraso = Math.max(0, transcurrido - (T_ENTRADA + T_CALMA) + 400);

      // el lienzo entra encima de la imagen de CSS, que muestra lo mismo
      lienzo.classList.add('listo');

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

      function suave(t) { return t * t * (3 - 2 * t); }

      function cuadro(ahora) {
        if (terminado) { limpiar(); return; }
        // __introPausa congela el reloj en un instante exacto, para poder
        // mirar un cuadro concreto sin pelearse con el tiempo de carga
        const pausado = DEPURAR && typeof window.__introPausa === 'number';
        const ms = pausado ? window.__introPausa : ahora - inicio;

        const entrada = suave(Math.min(ms / T_ENTRADA, 1));
        const msEst   = ms - T_ENTRADA - T_CALMA - retraso;
        const estalla = msEst <= 0 ? 0 : Math.min(msEst / T_ESTALLIDO, 1);

        // la imagen se ve hasta que el estallido la releva
        // la imagen se retira despacio, cruzándose con las partículas
        plano.material.opacity = entrada * (1 - Math.min(estalla / 0.35, 1));
        plano.visible = plano.material.opacity > 0.002;
        // respira apenas mientras está quieta, para que no se sienta congelada
        const r = 1 + Math.sin(ms / 1000 * 0.9) * 0.008 * entrada;
        plano.scale.set(r, r, 1);

        puntos.visible = estalla > 0;
        matPuntos.uniforms.uEstalla.value = estalla;

        if (DEPURAR) {
          window.__introEstado = {
            ms: Math.round(ms), estalla: +estalla.toFixed(3),
            planoVisible: plano.visible,
            planoAlfa: +plano.material.opacity.toFixed(3),
            puntosVisible: puntos.visible,
            camaraZ: +camara.position.z.toFixed(3),
            planoAlto: +(2 / aspecto).toFixed(3),
            bloom: bloom ? bloom.strength : null
          };
        }

        if (compositor) compositor.render();
        else render.render(escena, camara);

        // el fundido arranca antes del final, para cruzar con el sitio
        if (!pausado && msEst > T_ESTALLIDO - T_FUNDIDO) { terminar(); limpiar(); return; }
        requestAnimationFrame(cuadro);
      }

      function limpiar() {
        // soltar la memoria de video: el intro no vuelve en esta sesión
        try {
          geo.dispose();
          matPuntos.dispose();
          plano.geometry.dispose();
          plano.material.dispose();
          textura.dispose();
          if (compositor) compositor.renderTarget1.dispose();
          if (compositor) compositor.renderTarget2.dispose();
          render.dispose();
        } catch (e) {}
      }

      requestAnimationFrame(cuadro);
    }
  }

})();
