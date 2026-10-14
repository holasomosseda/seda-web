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
        vigilante.unobserve(entrada.target);   // una sola vez, nunca se repite
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  porAparecer.forEach((el) => vigilante.observe(el));
} else {
  porAparecer.forEach((el) => el.classList.add('visible'));
}
