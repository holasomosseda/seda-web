/* ===========================================================
   SEDA — atmósfera
   Fondo vivo en toda la página. Tenue a propósito:
   acompaña, no protagoniza.
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
  let raton = { x: 0.5, y: 0.4 };
  let suave = { x: 0.5, y: 0.4 };
  let desplazamiento = 0;

  /* --- partículas: pocas, grandes, muy tenues --- */
  const CANTIDAD = window.innerWidth < 760 ? 26 : 54;
  const puntos = [];

  function sembrar() {
    puntos.length = 0;
    for (let i = 0; i < CANTIDAD; i++) {
      puntos.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.6 + Math.random() * 1.9,
        vel: 0.00004 + Math.random() * 0.00012,
        fase: Math.random() * Math.PI * 2,
        capa: Math.random()           // profundidad: define cuánto se mueve
      });
    }
  }

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
    desplazamiento = max > 0 ? window.scrollY / max : 0;
  }, { passive: true });

  let t = 0;
  let vivo = true;
  document.addEventListener('visibilitychange', () => {
    vivo = !document.hidden;
    if (vivo) girar();
  });

  function girar() {
    if (!vivo) return;
    requestAnimationFrame(girar);

    t += lento ? 0 : 0.0022;
    suave.x += (raton.x - suave.x) * 0.035;
    suave.y += (raton.y - suave.y) * 0.035;

    ctx.clearRect(0, 0, an, al);

    /* 1. resplandor que sigue al cursor */
    const gx = suave.x * an;
    const gy = suave.y * al;
    const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(an, al) * 0.55);
    halo.addColorStop(0, 'rgba(38, 255, 206, 0.055)');
    halo.addColorStop(0.45, 'rgba(38, 255, 206, 0.016)');
    halo.addColorStop(1, 'rgba(38, 255, 206, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, an, al);

    /* 2. dos nebulosas lentas que se desplazan con el scroll */
    for (let n = 0; n < 2; n++) {
      const nx = an * (0.25 + 0.5 * n) + Math.sin(t * (0.6 + n * 0.3) + n) * an * 0.14;
      const ny = al * (0.3 + 0.4 * n) - desplazamiento * al * (0.35 + n * 0.25)
               + Math.cos(t * (0.45 + n * 0.25)) * al * 0.1;
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, Math.max(an, al) * 0.42);
      g.addColorStop(0, n === 0 ? 'rgba(38,255,206,0.030)' : 'rgba(238,229,209,0.022)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, an, al);
    }

    /* 3. partículas: parallax por capa, el cursor las empuja */
    for (const p of puntos) {
      p.y -= p.vel * (0.4 + p.capa);
      if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }

      const deriva = Math.sin(t * 1.6 + p.fase) * 0.012 * (0.3 + p.capa);
      const empuje = (suave.x - 0.5) * 0.05 * p.capa;
      const subeScroll = desplazamiento * 0.18 * p.capa;

      const x = (p.x + deriva + empuje) * an;
      const y = (p.y + subeScroll) * al;

      const brillo = 0.10 + p.capa * 0.22 + Math.sin(t * 2.2 + p.fase) * 0.05;
      ctx.beginPath();
      ctx.arc(x, y, p.r * (0.6 + p.capa * 0.8), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(238, 229, 209, ${Math.max(brillo, 0).toFixed(3)})`;
      ctx.fill();
    }
  }

  girar();
})();
