/* ===========================================================
   SEDA — textos del sitio en español e inglés
   Para cambiar una frase, cámbiala aquí. En un solo lugar.
   =========================================================== */

const TEXTOS = {
  es: {
    "meta.titulo": "SEDA — Automatización inteligente para negocios",
    "meta.desc": "Construimos automatizaciones, bots y sistemas a la medida para negocios en Querétaro.",

    "nav.inicio": "Inicio",
    "nav.automatizacion": "Automatización",
    "nav.sitios": "Sitios y tiendas",
    "nav.contacto": "Contacto",

    "hero.marca": "Sistemas y Educación Digital Automatizada",
    "hero.titulo": "Automatización inteligente para negocios que quieren crecer",
    "hero.bajada": "Diagnosticamos, diseñamos y acompañamos — para que tu negocio atienda mejor y se vea mejor.",
    "hero.cta": "Hablemos",

    "que.titulo": "Qué hace SEDA",
    "que.p1": "Hay problemas de negocio que no se resuelven con más horas de trabajo. Atender los mismos mensajes todos los días, perder ventas porque nadie contestó a tiempo, no saber qué hay en inventario cuando el cliente pregunta.",
    "que.p2": "SEDA es un estudio de automatización en Querétaro. Trabajamos directo con el dueño del negocio, configuramos todo por su cuenta y damos soporte después. El cliente nunca tiene que aprender a usar una herramienta nueva.",

    "serv.titulo": "En qué trabajamos",

    "serv.atencion.titulo": "Atención automatizada",
    "serv.atencion.desc": "Bots que atienden, responden y califican clientes las 24 horas sobre las plataformas que tu negocio ya usa: Instagram, WhatsApp, Facebook. Se implementa en días.",
    "serv.atencion.ejemplo": "Una marca de ropa que recomienda talla sola a partir de las medidas de la clienta, y pasa la conversación a una persona cuando hace falta.",

    "serv.medida.titulo": "Sistemas a la medida",
    "serv.medida.desc": "Software propio para un problema que ninguna herramienta del mercado resuelve. Corre en servidores propios y no depende de la plataforma de nadie.",
    "serv.medida.ejemplo": "Un sistema que avisa cuando alguien llegó a casa. Otro que manda recordatorios de pagos solo. Otro que entrega análisis deportivo diario a suscriptores en Canadá.",

    "serv.sitios.titulo": "Sitios y tiendas",
    "serv.sitios.desc": "Sitios web y tiendas en línea hechos a la medida del negocio. Sin plantillas.",

    "serv.ver": "Ver más",

    "cierre.titulo": "¿Tienes un problema que se repite todos los días?",
    "cierre.p": "Cuéntamelo y te digo si se puede automatizar.",
    "cierre.cta": "Escríbeme por WhatsApp",

    "pie.marca": "SEDA — Sistemas y Educación Digital Automatizada",
    "pie.lugar": "Querétaro, México"
  },

  en: {
    "meta.titulo": "SEDA — Smart automation for growing businesses",
    "meta.desc": "We build automations, bots and custom systems for businesses in Querétaro, Mexico.",

    "nav.inicio": "Home",
    "nav.automatizacion": "Automation",
    "nav.sitios": "Websites & stores",
    "nav.contacto": "Contact",

    "hero.marca": "Automated Digital Systems & Education",
    "hero.titulo": "Smart automation for businesses that want to grow",
    "hero.bajada": "We diagnose, design and stay with you — so your business responds better and looks better.",
    "hero.cta": "Let's talk",

    "que.titulo": "What SEDA does",
    "que.p1": "Some business problems don't go away by working longer hours. Answering the same messages every day, losing sales because nobody replied in time, not knowing what's in stock when a customer asks.",
    "que.p2": "SEDA is an automation studio based in Querétaro, Mexico. We work directly with the owner, handle every bit of setup ourselves, and support it afterwards. Clients never have to learn a new tool.",

    "serv.titulo": "What we work on",

    "serv.atencion.titulo": "Automated customer service",
    "serv.atencion.desc": "Bots that answer, respond and qualify customers around the clock, on the platforms your business already uses: Instagram, WhatsApp, Facebook. Live within days.",
    "serv.atencion.ejemplo": "A clothing brand whose bot recommends the right size from a customer's measurements, and hands the chat to a human when it matters.",

    "serv.medida.titulo": "Custom-built systems",
    "serv.medida.desc": "Software built from scratch for a problem no off-the-shelf tool solves. It runs on our own servers and doesn't depend on anyone else's platform.",
    "serv.medida.ejemplo": "A system that confirms someone got home safely. Another that sends payment reminders on its own. Another that delivers daily sports analysis to subscribers in Canada.",

    "serv.sitios.titulo": "Websites & stores",
    "serv.sitios.desc": "Websites and online stores built around the business. No templates.",

    "serv.ver": "Learn more",

    "cierre.titulo": "Is there a problem that repeats every single day?",
    "cierre.p": "Tell me about it and I'll say whether it can be automated.",
    "cierre.cta": "Message me on WhatsApp",

    "pie.marca": "SEDA — Automated Digital Systems & Education",
    "pie.lugar": "Querétaro, Mexico"
  }
};

/* ===========================================================
   Lógica: decide el idioma y rellena la página
   =========================================================== */

function idiomaInicial() {
  const url = new URLSearchParams(location.search).get("lang");
  if (url === "es" || url === "en") return url;

  try {
    const guardado = localStorage.getItem("seda_idioma");
    if (guardado === "es" || guardado === "en") return guardado;
  } catch (e) {}

  return navigator.language.startsWith("en") ? "en" : "es";
}

function aplicarIdioma(lang) {
  const t = TEXTOS[lang];
  if (!t) return;

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-t]").forEach(el => {
    const clave = el.getAttribute("data-t");
    if (t[clave]) el.textContent = t[clave];
  });

  document.title = t["meta.titulo"];
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", t["meta.desc"]);

  document.querySelectorAll("[data-lang-btn]").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.langBtn === lang));
  });

  try { localStorage.setItem("seda_idioma", lang); } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
  aplicarIdioma(idiomaInicial());

  document.querySelectorAll("[data-lang-btn]").forEach(b => {
    b.addEventListener("click", () => aplicarIdioma(b.dataset.langBtn));
  });
});
