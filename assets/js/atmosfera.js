/* ===========================================================
   SEDA — atmósfera
   Campo profundo: nebulosa, cúmulos, polvo y cometas.

   La nebulosa es una imagen por página. No se dibuja y ya: se
   MUESTREA, y de esa densidad salen tres cosas que hacen que el
   cielo se sienta uno solo en vez de dos capas encimadas —
   dónde nacen los cúmulos de estrellas, de qué color se tiñen,
   y cuánto se encienden los cometas al cruzar el gas.

   Si no hay imagen (o no carga), vuelven las 8 manchas de
   gradiente de siempre. Nada se rompe.
   =========================================================== */

(function () {
  "use strict";

  const lento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lienzo = document.createElement('canvas');
  lienzo.id = 'seda-atmosfera';
  document.body.prepend(lienzo);
  const ctx = lienzo.getContext('2d');
  if (!ctx) return;

  let an = 0, al = 0, pr = 1;
  const raton = { x: 0.5, y: 0.4 };
  const suave = { x: 0.5, y: 0.4 };
  let desp = 0, despSuave = 0;

  const chico = window.innerWidth < 760;

  /* ===========================================================
     Nebulosa de esta página
     =========================================================== */

  /* Cada página su nebulosa. x/y es dónde queda el centro de la nube
     en la pantalla: lejos de la columna de texto, que va a la izquierda. */
  const NEBULOSAS_IMG = {
    inicio: {
      src: '/assets/img/nebulosa-inicio.jpg',
      opacidad: 0.90,
      escala: 1.5,     // más grande que la pantalla, para que tenga de dónde moverse
      x: 0.68, y: 0.42,
      vel: 0.45        // qué tanto la arrastra el scroll (es la capa más lejana)
    },
    automatizacion: {
      src: '/assets/img/nebulosa-automatizacion.jpg',
      opacidad: 0.90,
      escala: 1.5,
      x: 0.70, y: 0.45,
      vel: 0.45
    },
    sitios: {
      src: '/assets/img/nebulosa-sitios.jpg',
      opacidad: 0.90,
      escala: 1.5,
      x: 0.72, y: 0.44,
      vel: 0.45
    },
    contacto: {
      src: '/assets/img/nebulosa-contacto.jpg',
      opacidad: 0.90,
      escala: 1.55,
      x: 0.74, y: 0.46,
      vel: 0.45
    }
  };

  const cual = document.body.getAttribute('data-nebulosa');
  const CONF = cual ? NEBULOSAS_IMG[cual] : null;

  let neb = null;          // la imagen, ya cargada
  const MAPA = 180;        // resolución del mapa de densidad
  let mapa = null;         // Uint8ClampedArray del mapa

  /* Dónde cae la imagen en pantalla, en píxeles. Una sola fuente de
     verdad: la usa el dibujo Y el muestreo, así no se desalinean. */
  function encuadre() {
    const t = Math.max(an, al) * CONF.escala;
    return {
      t: t,
      x: CONF.x * an - t / 2 + (suave.x - 0.5) * 26,
      y: CONF.y * al - t / 2 - despSuave * CONF.vel * al
    };
  }

  /* Densidad y color del gas en un punto de la pantalla.
     Devuelve null si ese punto cae fuera de la imagen. */
  function gasEn(sx, sy) {
    if (!mapa) return null;
    const e = encuadre();
    const u = (sx - e.x) / e.t, v = (sy - e.y) / e.t;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
    const i = ((v * MAPA | 0) * MAPA + (u * MAPA | 0)) * 4;
    const r = mapa[i], g = mapa[i + 1], b = mapa[i + 2];
    // el fondo de la imagen ES el fondo del sitio, así que lo que
    // sobresale de él es gas. Eso es la densidad.
    const d = Math.max(0, (0.2126 * r + 0.7152 * g + 0.0722 * b - 42)) / 150;
    return { d: Math.min(1, d), r: r, g: g, b: b };
  }

  if (CONF) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      neb = img;
      // muestreo una sola vez a un lienzo chico: leer píxeles por cuadro
      // sería carísimo, y la nebulosa no cambia nunca
      const c = document.createElement('canvas');
      c.width = c.height = MAPA;
      const cc = c.getContext('2d', { willReadFrequently: true });
      if (cc) {
        cc.drawImage(img, 0, 0, MAPA, MAPA);
        try { mapa = cc.getImageData(0, 0, MAPA, MAPA).data; } catch (e) { mapa = null; }
      }
      sembrar();   // re-sembrar las estrellas, ahora sabiendo dónde hay gas
    };
    img.src = CONF.src;
  }

  /* --- estrellas en cuatro profundidades --- */
  const CAPAS = [
    { n: chico ? 110 : 260, r: [0.25, 0.7], alfa: [0.16, 0.38], prof: 0.12 },
    { n: chico ? 60 : 140,  r: [0.5, 1.1],  alfa: [0.24, 0.52], prof: 0.34 },
    { n: chico ? 28 : 64,   r: [0.9, 1.8],  alfa: [0.36, 0.72], prof: 0.62 },
    { n: chico ? 10 : 24,   r: [1.5, 3.0],  alfa: [0.50, 0.95], prof: 0.95 }
  ];

  let estrellas = [];

  function sembrar() {
    estrellas = [];

    // Sin mapa, los cúmulos van al azar, como siempre.
    const cumulos = [];
    if (!mapa) {
      const cuantos = chico ? 3 : 6;
      for (let c = 0; c < cuantos; c++) {
        cumulos.push({ x: Math.random(), y: Math.random(), r: 0.10 + Math.random() * 0.22 });
      }
    }

    CAPAS.forEach((capa, ci) => {
      for (let i = 0; i < capa.n; i++) {
        let x, y, gas = null;

        if (mapa) {
          /* Las estrellas nacen donde hay gas. Se tira al azar y se
             acepta con probabilidad según la densidad; a los 12 intentos
             se acepta lo que haya, para que el vacío no quede pelón. */
          for (let intento = 0; intento < 12; intento++) {
            x = Math.random(); y = Math.random();
            gas = gasEn(x * an, y * al);
            const p = gas ? 0.14 + gas.d * 0.86 : 0.14;
            if (Math.random() < p) break;
          }
        } else if (cumulos.length) {
          if (Math.random() < 0.65) {
            const c = cumulos[(Math.random() * cumulos.length) | 0];
            const ang = Math.random() * Math.PI * 2;
            const dist = Math.pow(Math.random(), 2.1) * c.r;
            x = c.x + Math.cos(ang) * dist;
            y = c.y + Math.sin(ang) * dist * 0.72;
          } else { x = Math.random(); y = Math.random(); }
        } else { x = Math.random(); y = Math.random(); }

        const dado = Math.random();
        let tono = dado < 0.18 ? [212, 180, 131]      // dorada
                 : dado < 0.30 ? [150, 190, 255]      // azul caliente
                 : dado < 0.36 ? [200, 160, 255]      // violeta
                 : [238, 229, 209];                   // crema

        /* Teñir: una estrella dentro del gas toma su color. Es lo que
           más vende que estén DENTRO de la nube y no encima. */
        if (gas && gas.d > 0.05) {
          const m = Math.min(0.55, gas.d * 0.7);
          tono = [
            tono[0] + (gas.r - tono[0]) * m,
            tono[1] + (gas.g - tono[1]) * m,
            tono[2] + (gas.b - tono[2]) * m
          ];
        }

        estrellas.push({
          x, y, capa: ci,
          r: capa.r[0] + Math.random() * (capa.r[1] - capa.r[0]),
          a: capa.alfa[0] + Math.random() * (capa.alfa[1] - capa.alfa[0]),
          fase: Math.random() * Math.PI * 2,
          titila: 0.4 + Math.random() * 2.4,
          tono: tono[0].toFixed(0) + ',' + tono[1].toFixed(0) + ',' + tono[2].toFixed(0)
        });
      }
    });
  }

  /* --- nebulosas de respaldo: si no hay imagen, las de siempre --- */
  const NEBULOSAS = [
    { x: 0.20, y: 0.12, r: 0.52, col: '70,110,220',  a: 0.10, vel: 0.28, def: 1.0 },
    { x: 0.26, y: 0.16, r: 0.26, col: '140,170,255', a: 0.09, vel: 0.30, def: 1.7 },
    { x: 0.80, y: 0.38, r: 0.60, col: '120,70,190',  a: 0.095, vel: 0.50, def: 1.0 },
    { x: 0.74, y: 0.42, r: 0.28, col: '190,150,255', a: 0.075, vel: 0.53, def: 1.8 },
    { x: 0.45, y: 0.72, r: 0.66, col: '30,130,165',  a: 0.095, vel: 0.76, def: 1.0 },
    { x: 0.52, y: 0.76, r: 0.30, col: '120,220,235', a: 0.065, vel: 0.80, def: 1.9 },
    { x: 0.12, y: 0.92, r: 0.50, col: '212,180,131', a: 0.075, vel: 1.02, def: 1.0 },
    { x: 0.88, y: 1.08, r: 0.56, col: '90,60,170',   a: 0.085, vel: 1.26, def: 1.0 }
  ];

  /* --- cometas: aparecen de vez en cuando --- */
  const cometas = [];

  /* OJO: antes el que entraba por la derecha arrancaba en x = 1.1 pero con
     velocidad positiva, así que se iba hacia afuera y nunca se veía. La
     mitad de los cometas se perdían. Ahora la dirección se decide primero
     y de ahí sale por dónde entra. */
  function lanzarCometa() {
    if (lento) return;

    const haciaIzquierda = Math.random() < 0.5;
    const porArriba = Math.random() < 0.55;
    const signo = haciaIzquierda ? -1 : 1;

    cometas.push({
      x: porArriba
           ? (haciaIzquierda ? 0.62 + Math.random() * 0.45 : Math.random() * 0.38)
           : (haciaIzquierda ? 1.07 : -0.07),
      y: porArriba ? -0.05 : Math.random() * 0.38,
      vx: (0.0028 + Math.random() * 0.0030) * signo,
      vy: 0.0016 + Math.random() * 0.0022,
      largo: 90 + Math.random() * 150,
      vida: 1
    });
    if (cometas.length > 5) cometas.shift();
  }

  // window.__atmDebug = true antes de cargar, para poder contarlos
  if (window.__atmDebug) { window.__atmCometas = cometas; window.__atmEstrellas = () => estrellas; }

  setInterval(() => { if (Math.random() < 0.72) lanzarCometa(); }, 2600);
  setTimeout(lanzarCometa, 1200);
  setTimeout(lanzarCometa, 3400);

  function medir() {
    pr = Math.min(window.devicePixelRatio || 1, 2);
    an = window.innerWidth;
    al = window.innerHeight;
    lienzo.width = an * pr;
    lienzo.height = al * pr;
    lienzo.style.width = an + 'px';
    lienzo.style.height = al + 'px';
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
  }

  window.addEventListener('resize', () => { medir(); sembrar(); }, { passive: true });
  medir();
  sembrar();

  window.addEventListener('pointermove', (e) => {
    raton.x = e.clientX / an;
    raton.y = e.clientY / al;
  }, { passive: true });

  window.addEventListener('scroll', () => {
    const max = document.body.scrollHeight - al;
    desp = max > 0 ? window.scrollY / max : 0;
  }, { passive: true });

  let t = 0, vivo = true;
  document.addEventListener('visibilitychange', () => {
    vivo = !document.hidden;
    if (vivo) girar();
  });

  function girar() {
    if (!vivo) return;
    requestAnimationFrame(girar);

    t += lento ? 0 : 0.0016;
    suave.x += (raton.x - suave.x) * 0.03;
    suave.y += (raton.y - suave.y) * 0.03;
    despSuave += (desp - despSuave) * 0.055;

    ctx.clearRect(0, 0, an, al);

    /* 1. la nebulosa */
    if (neb) {
      // source-over, no 'lighter': la imagen ya trae el fondo del sitio.
      // Sumarla lo aclararía y el tinta dejaría de ser tinta.
      const e = encuadre();
      // __nebOpacidad en consola para calibrar sin tocar el archivo
      ctx.globalAlpha = typeof window.__nebOpacidad === 'number'
        ? window.__nebOpacidad : CONF.opacidad;
      ctx.drawImage(neb, e.x, e.y, e.t, e.t);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
    } else {
      ctx.globalCompositeOperation = 'lighter';
      for (const n of NEBULOSAS) {
        const nx = (n.x + Math.sin(t * 0.6 + n.vel * 4) * 0.045
                       + (suave.x - 0.5) * 0.07 * n.vel) * an;
        const ny = (n.y - despSuave * n.vel * 1.5
                       + Math.cos(t * 0.42 + n.vel * 3) * 0.035) * al;
        const rad = n.r * Math.max(an, al);
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
        g.addColorStop(0,    `rgba(${n.col},${n.a})`);
        g.addColorStop(0.28, `rgba(${n.col},${n.a * 0.55})`);
        g.addColorStop(0.62, `rgba(${n.col},${n.a * 0.16})`);
        g.addColorStop(1,    `rgba(${n.col},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, an, al);
      }
    }

    /* 2. resplandor del cursor */
    const gx = suave.x * an, gy = suave.y * al;
    const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(an, al) * 0.4);
    halo.addColorStop(0, 'rgba(212,180,131,0.05)');
    halo.addColorStop(1, 'rgba(212,180,131,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, an, al);

    /* 3. estrellas */
    for (const e of estrellas) {
      const p = CAPAS[e.capa].prof;
      const x = (e.x + (suave.x - 0.5) * 0.055 * p) * an;
      let y = (e.y - despSuave * p * 1.7) * al;
      const alto = al * (1 + p * 1.7);
      y = ((y % alto) + alto) % alto;
      if (y < -12 || y > al + 12) continue;

      // antes 0.68 + 0.32: el parpadeo apenas se notaba. Más recorrido y
      // un poco más rápido, para que el cielo se sienta vivo.
      const parpadeo = 0.56 + 0.44 * Math.sin(t * e.titila * 29 + e.fase);
      const alfa = e.a * parpadeo;

      ctx.beginPath();
      ctx.arc(x, y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${e.tono},${alfa.toFixed(3)})`;
      ctx.fill();

      if (e.r > 1.3) {
        const h = ctx.createRadialGradient(x, y, 0, x, y, e.r * 6);
        h.addColorStop(0, `rgba(${e.tono},${(alfa * 0.34).toFixed(3)})`);
        h.addColorStop(1, `rgba(${e.tono},0)`);
        ctx.fillStyle = h;
        ctx.fillRect(x - e.r * 6, y - e.r * 6, e.r * 12, e.r * 12);
      }
    }

    /* 4. cometas */
    for (let i = cometas.length - 1; i >= 0; i--) {
      const c = cometas[i];
      c.x += c.vx; c.y += c.vy;
      // ahora también hay que recogerlos por la izquierda
      if (c.x > 1.3 || c.x < -0.3 || c.y > 1.3) { cometas.splice(i, 1); continue; }

      const px = c.x * an, py = c.y * al;

      // al cruzar gas denso, el cometa se enciende
      const g = gasEn(px, py);
      const fuego = 1 + (g ? g.d * 1.5 : 0);

      const ang = Math.atan2(c.vy * al, c.vx * an);
      const ex = px - Math.cos(ang) * c.largo;
      const ey = py - Math.sin(ang) * c.largo;

      const estela = ctx.createLinearGradient(px, py, ex, ey);
      estela.addColorStop(0, `rgba(238,229,209,${(0.55 * fuego).toFixed(3)})`);
      estela.addColorStop(0.4, `rgba(212,180,131,${(0.14 * fuego).toFixed(3)})`);
      estela.addColorStop(1, 'rgba(212,180,131,0)');
      ctx.strokeStyle = estela;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const rc = 7 * fuego;
      const cab = ctx.createRadialGradient(px, py, 0, px, py, rc);
      cab.addColorStop(0, `rgba(255,250,240,${Math.min(1, 0.75 * fuego).toFixed(3)})`);
      cab.addColorStop(1, 'rgba(255,250,240,0)');
      ctx.fillStyle = cab;
      ctx.fillRect(px - rc, py - rc, rc * 2, rc * 2);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  girar();
})();
