/* ===========================================================
   SEDA — atmósfera
   Campo profundo: nebulosas, cúmulos y polvo estelar.
   Todo se reorganiza conforme bajas.
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

  /* --- tres capas de estrellas, cada una con su profundidad --- */
  const CAPAS = [
    { n: chico ? 70 : 150, r: [0.3, 0.8],  alfa: [0.10, 0.26], prof: 0.18 },
    { n: chico ? 34 : 72,  r: [0.7, 1.5],  alfa: [0.18, 0.42], prof: 0.45 },
    { n: chico ? 14 : 30,  r: [1.2, 2.6],  alfa: [0.30, 0.62], prof: 0.85 }
  ];

  let estrellas = [];

  /* --- cúmulos: zonas donde las estrellas se agrupan --- */
  function sembrar() {
    estrellas = [];
    const cumulos = [];
    const cuantos = chico ? 2 : 4;
    for (let c = 0; c < cuantos; c++) {
      cumulos.push({ x: Math.random(), y: Math.random(), r: 0.12 + Math.random() * 0.2 });
    }

    CAPAS.forEach((capa, ci) => {
      for (let i = 0; i < capa.n; i++) {
        let x, y;
        // 60% de las estrellas nacen dentro de un cúmulo, el resto dispersas
        if (Math.random() < 0.6 && cumulos.length) {
          const c = cumulos[(Math.random() * cumulos.length) | 0];
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.pow(Math.random(), 1.8) * c.r;
          x = c.x + Math.cos(ang) * dist;
          y = c.y + Math.sin(ang) * dist * 0.75;
        } else {
          x = Math.random();
          y = Math.random();
        }
        estrellas.push({
          x, y, capa: ci,
          r: capa.r[0] + Math.random() * (capa.r[1] - capa.r[0]),
          a: capa.alfa[0] + Math.random() * (capa.alfa[1] - capa.alfa[0]),
          fase: Math.random() * Math.PI * 2,
          titila: 0.5 + Math.random() * 2.2,
          calida: Math.random() < 0.22      // algunas tiran a dorado
        });
      }
    });
  }

  /* --- nebulosas: manchas suaves de color --- */
  const NEBULOSAS = [
    { x: 0.22, y: 0.18, r: 0.60, col: '212,180,131', a: 0.055, vel: 0.30 },
    { x: 0.78, y: 0.42, r: 0.72, col: '38,140,160',  a: 0.065, vel: 0.52 },
    { x: 0.45, y: 0.80, r: 0.80, col: '238,229,209', a: 0.030, vel: 0.78 },
    { x: 0.10, y: 0.95, r: 0.55, col: '212,180,131', a: 0.045, vel: 1.05 }
  ];

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
    despSuave += (desp - despSuave) * 0.06;

    ctx.clearRect(0, 0, an, al);
    ctx.globalCompositeOperation = 'lighter';

    /* 1. nebulosas: cada una sube a distinta velocidad con el scroll */
    for (const n of NEBULOSAS) {
      const nx = (n.x + Math.sin(t * 0.7 + n.vel * 3) * 0.05
                     + (suave.x - 0.5) * 0.06 * n.vel) * an;
      const ny = (n.y - despSuave * n.vel * 1.4
                     + Math.cos(t * 0.5 + n.vel * 2) * 0.04) * al;
      const rad = n.r * Math.max(an, al);

      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
      g.addColorStop(0,    `rgba(${n.col},${n.a})`);
      g.addColorStop(0.35, `rgba(${n.col},${n.a * 0.45})`);
      g.addColorStop(1,    `rgba(${n.col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, an, al);
    }

    /* 2. resplandor del cursor */
    const gx = suave.x * an, gy = suave.y * al;
    const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(an, al) * 0.45);
    halo.addColorStop(0, 'rgba(212,180,131,0.055)');
    halo.addColorStop(1, 'rgba(212,180,131,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, an, al);

    /* 3. estrellas con parallax por capa */
    for (const e of estrellas) {
      const p = CAPAS[e.capa].prof;
      const x = (e.x + (suave.x - 0.5) * 0.05 * p) * an;
      let y = (e.y - despSuave * p * 1.6) * al;

      // las que salen por arriba reaparecen por abajo
      const alto = al * (1 + p * 1.6);
      y = ((y % alto) + alto) % alto;

      if (y < -10 || y > al + 10) continue;

      const parpadeo = 0.72 + 0.28 * Math.sin(t * e.titila * 22 + e.fase);
      const alfa = e.a * parpadeo;
      const color = e.calida ? '212,180,131' : '238,229,209';

      ctx.beginPath();
      ctx.arc(x, y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${alfa.toFixed(3)})`;
      ctx.fill();

      // halo en las más grandes
      if (e.r > 1.6) {
        const h = ctx.createRadialGradient(x, y, 0, x, y, e.r * 5);
        h.addColorStop(0, `rgba(${color},${(alfa * 0.3).toFixed(3)})`);
        h.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = h;
        ctx.fillRect(x - e.r * 5, y - e.r * 5, e.r * 10, e.r * 10);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  girar();
})();
