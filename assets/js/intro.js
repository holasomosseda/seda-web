/* ===========================================================
   SEDA — intro
   Una red de filamentos se arma en partículas, respira un
   momento y se desintegra, dejando ver el sitio.

   WebGL plano: sin librerías, sin paso de compilación.
   Solo corre en el inicio y una vez por sesión.
   =========================================================== */

(function () {
  "use strict";

  /* --- razones para no correr, en orden de costo --- */

  // 1. el visitante pidió menos movimiento: el intro se salta entero
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 2. ya lo vio en esta sesión
  try {
    if (sessionStorage.getItem('seda_intro') === 'visto') return;
  } catch (e) {}

  // 3. solo el inicio
  const ruta = location.pathname;
  if (ruta !== '/' && ruta !== '/index.html') return;

  /* --- diagnóstico ---
     Dos ganchos para medir sin tener que editar el archivo. En la consola:
       window.__introDebug = true   antes de recargar: imprime el conteo de
                                    partículas y conserva el búfer para poder
                                    leer píxeles con readPixels.
       window.__introZoom  = 2.6    fuerza el acercamiento, para calibrar
                                    el encuadre en vertical.
     Esto existe porque el intro no se depura leyendo el código: se mide. */
  const DEPURAR = !!window.__introDebug;

  /* --- ajustes --- */
  const IMAGEN     = '/assets/img/nudo.jpg';
  const LUZ_MINIMA = 30;        // debajo de esto el píxel es fondo, no partícula
  const chico      = window.innerWidth < 760;
  // El paso es igual en celular: son ~27mil puntos en UN solo dibujado, no le
  // pesan a ningún teléfono, y al acercar en vertical la densidad es justo lo
  // que separa "estructura" de "puntitos".
  const PASO       = 4;              // cada cuántos píxeles sale una partícula
  const PUNTO      = chico ? 1.9 : 2.1;

  /* tiempos en milisegundos. El fundido usa --medio (450ms) del CSS. */
  const T_ENTRADA = 900;
  const T_ESPERA  = 400;
  const T_SALIDA  = 1200;
  const T_FUNDIDO = 450;
  const T_RESCATE = 6000;       // si algo se atora, el intro se quita solo

  /* ===========================================================
     Lienzo
     =========================================================== */

  const lienzo = document.createElement('canvas');
  lienzo.id = 'seda-intro';
  lienzo.setAttribute('aria-hidden', 'true');

  let gl = null;
  try {
    gl = lienzo.getContext('webgl', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: DEPURAR,
      powerPreference: 'low-power'
    }) || lienzo.getContext('experimental-webgl');
  } catch (e) {
    gl = null;
  }
  if (!gl) return;   // sin WebGL el sitio abre normal, sin intro

  document.body.appendChild(lienzo);
  document.body.classList.add('intro-activo');

  let terminado = false;

  /* Quitar el intro. Se puede llamar dos veces sin romper nada. */
  function terminar() {
    if (terminado) return;
    terminado = true;
    try { sessionStorage.setItem('seda_intro', 'visto'); } catch (e) {}
    lienzo.classList.add('saliendo');
    document.body.classList.remove('intro-activo');
    setTimeout(() => {
      if (lienzo.parentNode) lienzo.parentNode.removeChild(lienzo);
    }, T_FUNDIDO + 60);
  }

  // Red de seguridad: pase lo que pase, el sitio no se queda tapado.
  const rescate = setTimeout(terminar, T_RESCATE);

  /* ===========================================================
     Shaders
     =========================================================== */

  const VERT = `
    attribute vec2  aOrigen;    // posición en la imagen, ya centrada
    attribute vec3  aColor;     // el color real de ese píxel
    attribute float aSemilla;   // 0–1, desfasa cada partícula

    uniform float uEntrada;     // 0 -> 1  se arma
    uniform float uSalida;      // 0 -> 1  se desintegra
    uniform float uTiempo;
    uniform float uEscalaY;     // corrige el aspecto de la pantalla
    uniform float uZoom;        // en vertical se acerca para que no quede una banda
    uniform float uPunto;

    varying vec3  vColor;
    varying float vAlfa;

    void main() {
      // cada partícula entra y sale con su propio retraso
      float e = clamp((uEntrada - aSemilla * 0.35) / 0.65, 0.0, 1.0);
      e = e * e * (3.0 - 2.0 * e);

      float s = clamp((uSalida - aSemilla * 0.30) / 0.70, 0.0, 1.0);
      s = s * s * (3.0 - 2.0 * s);

      vec2 base = vec2(aOrigen.x, aOrigen.y * uEscalaY) * uZoom;

      vec2 dir  = normalize(base + vec2(0.0001, 0.0001));
      float ang = aSemilla * 6.2831853;
      vec2 lado = vec2(cos(ang), sin(ang));

      // entra desde afuera y se acomoda
      vec2 pos = base + dir * (1.0 - e) * 0.40 + lado * (1.0 - e) * 0.07;

      // respira mientras está formada
      pos += lado * sin(uTiempo * 1.3 + aSemilla * 6.0) * 0.005 * e * (1.0 - s);

      // se desintegra hacia afuera, cada una a su paso
      pos += dir  * s * (0.55 + aSemilla * 1.5);
      pos += lado * s * 0.28;

      gl_Position  = vec4(pos, 0.0, 1.0);
      gl_PointSize = uPunto * (1.0 + aSemilla * 0.7) * (1.0 - s * 0.35);

      // la mezcla aditiva sobre el fondo lava el crema hacia el azul;
      // se compensa subiendo el color antes de sumarlo
      vColor = aColor * 1.32;
      vAlfa  = e * (1.0 - s);
    }
  `;

  const FRAG = `
    precision mediump float;
    varying vec3  vColor;
    varying float vAlfa;

    void main() {
      // punto redondo con orilla suave
      vec2  c = gl_PointCoord - 0.5;
      float d = dot(c, c);
      if (d > 0.25) discard;
      float a = smoothstep(0.25, 0.015, d);
      gl_FragColor = vec4(vColor, a * vAlfa);
    }
  `;

  function compilar(tipo, fuente) {
    const sh = gl.createShader(tipo);
    gl.shaderSource(sh, fuente);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vs = compilar(gl.VERTEX_SHADER, VERT);
  const fs = compilar(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { clearTimeout(rescate); terminar(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    clearTimeout(rescate); terminar(); return;
  }
  gl.useProgram(prog);

  const uEntrada = gl.getUniformLocation(prog, 'uEntrada');
  const uSalida  = gl.getUniformLocation(prog, 'uSalida');
  const uTiempo  = gl.getUniformLocation(prog, 'uTiempo');
  const uEscalaY = gl.getUniformLocation(prog, 'uEscalaY');
  const uZoom    = gl.getUniformLocation(prog, 'uZoom');
  const uPunto   = gl.getUniformLocation(prog, 'uPunto');

  /* ===========================================================
     Medida del lienzo
     =========================================================== */

  let aspectoImagen = 16 / 9;   // se corrige al cargar la imagen

  function medir() {
    const pr = Math.min(window.devicePixelRatio || 1, chico ? 1.5 : 2);
    const an = window.innerWidth, al = window.innerHeight;
    lienzo.width  = Math.round(an * pr);
    lienzo.height = Math.round(al * pr);
    lienzo.style.width  = an + 'px';
    lienzo.style.height = al + 'px';
    gl.viewport(0, 0, lienzo.width, lienzo.height);
    // la imagen se ajusta al ancho de la pantalla
    gl.uniform1f(uEscalaY, (an / al) / aspectoImagen);
    // en vertical eso dejaría una banda chica al centro, así que se acerca.
    // Lo que se sale por los lados son los filamentos de las orillas, que
    // son los menos densos: se pierde poco y se gana presencia.
    gl.uniform1f(uZoom, window.__introZoom || (an < al ? 2.2 : 1.0));
    gl.uniform1f(uPunto, PUNTO * pr);
  }

  window.addEventListener('resize', medir, { passive: true });

  /* ===========================================================
     Muestrear la imagen y sembrar partículas
     =========================================================== */

  const img = new Image();
  img.decoding = 'async';

  img.onerror = function () { clearTimeout(rescate); terminar(); };

  img.onload = function () {
    if (terminado) return;

    const an = img.naturalWidth, al = img.naturalHeight;
    aspectoImagen = an / al;

    const lec = document.createElement('canvas');
    lec.width = an; lec.height = al;
    const c2 = lec.getContext('2d', { willReadFrequently: true });
    if (!c2) { clearTimeout(rescate); terminar(); return; }
    c2.drawImage(img, 0, 0);

    let datos;
    try {
      datos = c2.getImageData(0, 0, an, al).data;
    } catch (e) {
      clearTimeout(rescate); terminar(); return;   // lienzo contaminado
    }

    const pos = [], col = [], sem = [];

    for (let y = 0; y < al; y += PASO) {
      for (let x = 0; x < an; x += PASO) {
        const i = (y * an + x) * 4;
        const r = datos[i], g = datos[i + 1], b = datos[i + 2];
        const luz = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (luz < LUZ_MINIMA) continue;

        // sacudir la rejilla: si no, se ven las hileras del muestreo
        const jx = x + (Math.random() - 0.5) * PASO;
        const jy = y + (Math.random() - 0.5) * PASO;

        pos.push((jx / an - 0.5) * 2, -(jy / al - 0.5) * 2);
        col.push(r / 255, g / 255, b / 255);
        sem.push(Math.random());
      }
    }

    const total = sem.length;
    if (!total) { clearTimeout(rescate); terminar(); return; }

    if (DEPURAR) {
      console.log('[intro] ' + total + ' partículas, paso ' + PASO +
                  ', imagen ' + an + 'x' + al);
    }

    function buffer(datos, tam, nombre) {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(datos), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, nombre);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, tam, gl.FLOAT, false, 0, 0);
    }

    buffer(pos, 2, 'aOrigen');
    buffer(col, 3, 'aColor');
    buffer(sem, 1, 'aSemilla');

    medir();

    // más oscuro que --tinta a propósito: sobre el tinta lleno, la suma de
    // luz tiñe las partículas de azul. Al fundirse aparece el tinta del sitio.
    gl.clearColor(0.0, 0.075, 0.10, 1.0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);    // suma de luz, igual que la atmósfera

    arrancar(total);
  };

  img.src = IMAGEN;

  /* ===========================================================
     Animación
     =========================================================== */

  function arrancar(total) {
    const inicio = performance.now();
    let saltando = false;

    // Un intro que no puedes saltar envejece mal: cualquier gesto lo acelera.
    function saltar() {
      if (saltando || terminado) return;
      saltando = true;
      window.removeEventListener('pointerdown', saltar);
      window.removeEventListener('keydown', saltar);
      window.removeEventListener('wheel', saltar);
      clearTimeout(rescate);
      terminar();
    }
    window.addEventListener('pointerdown', saltar, { passive: true });
    window.addEventListener('keydown', saltar);
    window.addEventListener('wheel', saltar, { passive: true });

    function suave(t) { return t * t * (3 - 2 * t); }

    function cuadro(ahora) {
      if (terminado) return;
      const ms = ahora - inicio;

      const entrada = suave(Math.min(ms / T_ENTRADA, 1));
      const msSalida = ms - T_ENTRADA - T_ESPERA;
      const salida = msSalida <= 0 ? 0 : suave(Math.min(msSalida / T_SALIDA, 1));

      gl.uniform1f(uEntrada, entrada);
      gl.uniform1f(uSalida, salida);
      gl.uniform1f(uTiempo, ms / 1000);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, total);

      // el fundido arranca antes de que la última partícula se apague,
      // así el corte entre el intro y el sitio no se siente
      if (msSalida > T_SALIDA - T_FUNDIDO) {
        clearTimeout(rescate);
        terminar();
        return;
      }
      requestAnimationFrame(cuadro);
    }

    requestAnimationFrame(cuadro);
  }

})();
