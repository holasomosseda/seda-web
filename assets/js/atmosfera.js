/* ===========================================================
   SEDA — atmósfera
   Campo profundo: nebulosas en capas, cúmulos, polvo y cometas.
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

  /* --- estrellas en cuatro profundidades --- */
  const CAPAS = [
    { n: chico ? 110 : 260, r: [0.25, 0.7], alfa: [0.10, 0.28], prof: 0.12 },
    { n: chico ? 60 : 140,  r: [0.5, 1.1],  alfa: [0.16, 0.40], prof: 0.34 },
    { n: chico ? 28 : 64,   r: [0.9, 1.8],  alfa: [0.26, 0.58], prof: 0.62 },
    { n: chico ? 10 : 24,   r: [1.5, 3.0],  alfa: [0.38, 0.78], prof: 0.95 }
  ];

  let estrellas = [];

  function sembrar() {
    estrellas = [];
    const cumulos = [];
    const cuantos = chico ? 3 : 6;
    for (let c = 0; c < cuantos; c++) {
      cumulos.push({ x: Math.random(), y: Math.random(), r: 0.10 + Math.random() * 0.22 });
    }

    CAPAS.forEach((capa, ci) => {
      for (let i = 0; i < capa.n; i++) {
        let x, y;
        if (Math.random() < 0.65 && cumulos.length) {
          const c = cumulos[(Math.random() * cumulos.length) | 0];
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.pow(Math.random(), 2.1) * c.r;
          x = c.x + Math.cos(ang) * dist;
          y = c.y + Math.sin(ang) * dist * 0.72;
        } else {
          x = Math.random();
          y = Math.random();
        }
        const dado = Math.random();
        estrellas.push({
          x, y, capa: ci,
          r: capa.r[0] + Math.random() * (capa.r[1] - capa.r[0]),
          a: capa.alfa[0] + Math.random() * (capa.alfa[1] - capa.alfa[0]),
          fase: Math.random() * Math.PI * 2,
          titila: 0.4 + Math.random() * 2.4,
          tono: dado < 0.18 ? '212,180,131'      // dorada
              : dado < 0.30 ? '150,190,255'      // azul caliente
              : dado < 0.36 ? '200,160,255'      // violeta
              : '238,229,209'                     // crema
        });
      }
    });
  }

  /* --- nebulosas: dos capas por mancha para que tengan cuerpo --- */
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
  function lanzarCometa() {
    if (lento) return;
    const desdeArriba = Math.random() < 0.5;
    cometas.push({
      x: desdeArriba ? Math.random() * 0.4 : 1.1,
      y: desdeArriba ? -0.05 : Math.random() * 0.4,
      vx: 0.0028 + Math.random() * 0.0030,
      vy: 0.0016 + Math.random() * 0.0022,
      largo: 90 + Math.random() * 150,
      vida: 1
    });
    if (cometas.length > 3) cometas.shift();
  }
  setInterval(() => { if (Math.random() < 0.55) lanzarCometa(); }, 4200);
  setTimeout(lanzarCometa, 1800);

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
    ctx.globalCompositeOperation = 'lighter';

    /* 1. nebulosas */
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

      const parpadeo = 0.68 + 0.32 * Math.sin(t * e.titila * 24 + e.fase);
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
      if (c.x > 1.25 || c.y > 1.25) { cometas.splice(i, 1); continue; }

      const px = c.x * an, py = c.y * al;
      const ang = Math.atan2(c.vy * al, c.vx * an);
      const ex = px - Math.cos(ang) * c.largo;
      const ey = py - Math.sin(ang) * c.largo;

      const estela = ctx.createLinearGradient(px, py, ex, ey);
      estela.addColorStop(0, 'rgba(238,229,209,0.55)');
      estela.addColorStop(0.4, 'rgba(212,180,131,0.14)');
      estela.addColorStop(1, 'rgba(212,180,131,0)');
      ctx.strokeStyle = estela;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const cab = ctx.createRadialGradient(px, py, 0, px, py, 7);
      cab.addColorStop(0, 'rgba(255,250,240,0.75)');
      cab.addColorStop(1, 'rgba(255,250,240,0)');
      ctx.fillStyle = cab;
      ctx.fillRect(px - 7, py - 7, 14, 14);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  girar();
})();
