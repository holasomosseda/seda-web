/* ===========================================================
   SEDA — comportamiento del sitio
   =========================================================== */

/* --- el header se vuelve sólido al bajar --- */
const encabezado = document.getElementById('encabezado');

if (encabezado) {
  const revisarScroll = () => {
    encabezado.classList.toggle('pegado', window.scrollY > 40);
  };
  revisarScroll();
  window.addEventListener('scroll', revisarScroll, { passive: true });
}

/* --- las secciones aparecen una vez al entrar en pantalla --- */
const porAparecer = document.querySelectorAll('.aparece');

if (porAparecer.length && 'IntersectionObserver' in window) {
  const vigilante = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visible');
        vigilante.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  porAparecer.forEach((el) => vigilante.observe(el));
} else {
  porAparecer.forEach((el) => el.classList.add('visible'));
}

/* --- el resplandor de las tarjetas sigue al cursor --- */
document.querySelectorAll('.tarjeta').forEach((tarjeta) => {
  tarjeta.addEventListener('pointermove', (e) => {
    const caja = tarjeta.getBoundingClientRect();
    tarjeta.style.setProperty('--mx', `${e.clientX - caja.left}px`);
    tarjeta.style.setProperty('--my', `${e.clientY - caja.top}px`);
  });
});

/* --- menú de hamburguesa en celular --- */
const btnMenu = document.getElementById('abrir-menu');
const navSitio = document.querySelector('.sitio-nav');

if (btnMenu && navSitio) {
  const cerrar = () => {
    document.body.classList.remove('menu-abierto');
    btnMenu.setAttribute('aria-expanded', 'false');
    btnMenu.setAttribute('aria-label', 'Abrir menú');
  };

  btnMenu.addEventListener('click', () => {
    const abierto = document.body.classList.toggle('menu-abierto');
    btnMenu.setAttribute('aria-expanded', String(abierto));
    btnMenu.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
  });

  navSitio.querySelectorAll('a').forEach((a) => a.addEventListener('click', cerrar));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrar();
  });
}
