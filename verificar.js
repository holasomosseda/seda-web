#!/usr/bin/env node
/* ===========================================================
   SEDA — verificación del sitio

   Corre el §15 del documento maestro de un golpe y escupe texto, no
   capturas. La idea es que validar un cambio salga casi gratis y que
   nada llegue a producción sin pasar por aquí.

   Uso:
     node verificar.js                 (levanta el servidor solo)
     node verificar.js --pagina sitios.html
     node verificar.js --ver           (además guarda capturas en .verificar/)

   Qué revisa:
     1. Paridad de claves ES/EN en idioma.js
     2. Que toda clave data-t / data-t-ph del HTML exista en el diccionario
     3. Que toda clave del diccionario se use en algún lado
     4. node --check en cada JS
     5. Que cada página declare su nebulosa y que el archivo exista
     6. Los <title> de las cuatro páginas (que no sean el mismo)
     7. Por cada página y cada ancho: errores de consola, desbordamiento
        horizontal con culpable, y si el primer botón queda bajo el pliegue

   Lo que NO puede revisar, y hay que hacer a mano:
     - Safari e iOS de verdad (este Chromium no trae H.264, así que la
       ruta MP4 de los videos nunca se ejecuta aquí)
     - somosseda.com en vivo (el dominio no está en la lista blanca)
     - Cómo se ve. Esto mide, no opina.
   =========================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { execFileSync } = require('child_process');

const RAIZ = __dirname;
const PUERTO = 8777;
const PAGINAS = ['index.html', 'automatizacion.html', 'sitios.html', 'contacto.html'];

/* Los anchos del §15, más dos teléfonos chicos que sí existen allá afuera. */
const VISTAS = [
  [1500, 900], [1440, 1080], [1366, 768], [1280, 720],
  [414, 896], [390, 844], [375, 812], [360, 640], [320, 568]
];

/* Ruido del entorno de pruebas, no del sitio: aquí la red no deja salir
   a Google Fonts. */
const RUIDO = /ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|fonts\.googleapis|fonts\.gstatic/;

const args = process.argv.slice(2);
const VER = args.includes('--ver');
const soloPagina = (() => {
  const i = args.indexOf('--pagina');
  return i >= 0 ? args[i + 1] : null;
})();
const paginas = soloPagina ? [soloPagina] : PAGINAS;

let fallas = 0;
let avisos = 0;
const linea = [];

function ok(t)    { linea.push('  OK    ' + t); }
function falla(t) { linea.push('  FALLA ' + t); fallas++; }
function aviso(t) { linea.push('  aviso ' + t); avisos++; }
function titulo(t){ linea.push('\n' + t); }

/* ---------- 1 a 6: lo que no necesita navegador ---------- */

function leerDiccionario() {
  const s = fs.readFileSync(path.join(RAIZ, 'assets/js/idioma.js'), 'utf8');
  const m = s.match(/const TEXTOS\s*=\s*\{[\s\S]*?\n\};/);
  if (!m) return null;
  const caja = {};
  new Function('exports', m[0].replace('const TEXTOS', 'exports.TEXTOS'))(caja);
  return caja.TEXTOS;
}

function revisarEstatico() {
  titulo('Diccionario');
  const T = leerDiccionario();
  if (!T) { falla('no se pudo leer TEXTOS de idioma.js'); return; }

  const es = Object.keys(T.es), en = Object.keys(T.en);
  const faltaEn = es.filter(k => !(k in T.en));
  const faltaEs = en.filter(k => !(k in T.es));
  if (es.length === en.length && !faltaEn.length && !faltaEs.length) {
    ok(`paridad ES/EN — ${es.length} claves en cada idioma`);
  } else {
    falla(`paridad rota — ES ${es.length}, EN ${en.length}` +
      (faltaEn.length ? ` · faltan en EN: ${faltaEn.join(', ')}` : '') +
      (faltaEs.length ? ` · faltan en ES: ${faltaEs.join(', ')}` : ''));
  }

  /* Claves que el HTML pide y el diccionario no tiene. Con el puente de
     window.SEDA una clave ausente se imprime tal cual en pantalla, así
     que esto se ve en vivo si se escapa. */
  const usadas = new Set();
  for (const p of PAGINAS) {
    const h = fs.readFileSync(path.join(RAIZ, p), 'utf8');
    for (const m2 of h.matchAll(/data-t(?:-ph)?="([^"]+)"/g)) usadas.add(m2[1]);
  }
  const huerfanas = [...usadas].filter(k => !(k in T.es));
  if (!huerfanas.length) ok(`las ${usadas.size} claves del HTML existen en el diccionario`);
  else falla(`el HTML pide claves que no existen: ${huerfanas.join(', ')}`);

  /* Al revés: claves que ya nadie usa. No es error — los bots y los
     metadatos las leen desde JS — pero vale verlas. */
  const desdeJs = new Set();
  for (const f of fs.readdirSync(path.join(RAIZ, 'assets/js'))) {
    const s = fs.readFileSync(path.join(RAIZ, 'assets/js', f), 'utf8');
    for (const m3 of s.matchAll(/["'`]((?:bot|meta|demo|cont|sit|hero|que|serv|cierre|pie|nav|auto)\.[a-zA-Z0-9._]+)["'`]/g)) desdeJs.add(m3[1]);
  }
  const sinUsar = Object.keys(T.es).filter(k => !usadas.has(k) && !desdeJs.has(k));
  if (sinUsar.length) aviso(`${sinUsar.length} clave(s) sin uso aparente: ${sinUsar.slice(0, 8).join(', ')}${sinUsar.length > 8 ? '…' : ''}`);
  else ok('ninguna clave huérfana');

  titulo('Sintaxis');
  let malos = 0;
  for (const f of fs.readdirSync(path.join(RAIZ, 'assets/js'))) {
    if (!f.endsWith('.js')) continue;
    try { execFileSync(process.execPath, ['--check', path.join(RAIZ, 'assets/js', f)], { stdio: 'pipe' }); }
    catch (e) { falla(`${f} no compila — ${String(e.stderr).split('\n')[1] || ''}`); malos++; }
  }
  if (!malos) ok('node --check pasa en todos los JS');

  titulo('Páginas');
  const titulos = {};
  for (const p of PAGINAS) {
    const h = fs.readFileSync(path.join(RAIZ, p), 'utf8');

    const neb = (h.match(/data-nebulosa="([^"]+)"/) || [])[1];
    if (!neb) falla(`${p} no declara nebulosa`);
    else if (!fs.existsSync(path.join(RAIZ, 'assets/img', `nebulosa-${neb}.jpg`)))
      falla(`${p} pide la nebulosa "${neb}" y el archivo no existe`);

    const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1];
    titulos[p] = t;

    /* Todo lo que el HTML referencia con ruta absoluta debe existir. */
    for (const m4 of h.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
      const rel = m4[1].replace(/^\//, '');
      if (!fs.existsSync(path.join(RAIZ, rel))) falla(`${p} apunta a ${m4[1]} y no existe`);
    }
  }
  const unicos = new Set(Object.values(titulos));
  if (unicos.size === PAGINAS.length) ok('las cuatro páginas tienen <title> distinto');
  else aviso(`<title> repetido entre páginas (${unicos.size} distintos de ${PAGINAS.length}) — Google las ve iguales`);
  ok('las nebulosas declaradas existen en disco');
}

/* ---------- 7: lo que sí necesita navegador ---------- */

function servidor() {
  const s = spawn(process.execPath, ['-e', `
    const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');
    const tipos={'.html':'text/html','.css':'text/css','.js':'application/javascript',
      '.jpg':'image/jpeg','.png':'image/png','.webm':'video/webm','.mp4':'video/mp4','.svg':'image/svg+xml'};
    http.createServer((req,res)=>{
      let p=decodeURIComponent(url.parse(req.url).pathname);
      if(p==='/')p='/index.html';
      const f=path.join(${JSON.stringify(RAIZ)},p);
      fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end('no');return;}
        res.writeHead(200,{'Content-Type':tipos[path.extname(f)]||'application/octet-stream'});res.end(d); });
    }).listen(${PUERTO});
  `], { stdio: 'ignore' });
  return s;
}

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

async function revisarNavegador() {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { titulo('Navegador'); aviso('playwright no está instalado — se omiten las pruebas de navegador'); return; }

  const nav = await chromium.launch();
  if (VER) fs.mkdirSync(path.join(RAIZ, '.verificar'), { recursive: true });

  for (const pag of paginas) {
    titulo(`${pag}`);
    for (const [w, h] of VISTAS) {
      const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      const errores = [];
      p.on('console', m => { if (m.type() === 'error' && !RUIDO.test(m.text())) errores.push(m.text()); });
      p.on('pageerror', e => errores.push('JS: ' + e.message));
      /* El intro tapa todo si no se salta. */
      await p.addInitScript(() => { try { sessionStorage.setItem('seda_intro', 'visto'); } catch (e) {} });

      await p.goto(`http://localhost:${PUERTO}/${pag}`, { waitUntil: 'networkidle' }).catch(() => {});
      await esperar(1400);

      const r = await p.evaluate(() => {
        const fuera = [];
        document.querySelectorAll('*').forEach(el => {
          const b = el.getBoundingClientRect();
          if (b.width > 0 && b.right > window.innerWidth + 0.5) {
            const n = el.tagName.toLowerCase() +
              (el.className && typeof el.className === 'string' && el.className.trim()
                ? '.' + el.className.trim().split(/\s+/)[0] : '');
            fuera.push(n + ' (+' + Math.round(b.right - window.innerWidth) + 'px)');
          }
        });
        /* Solo el CTA del hero. Un .boton cualquiera de medio documento
           no dice nada: tiene que estar bajo el pliegue, ahí vive. */
        const cta = document.querySelector('.hero .boton');
        /* En las páginas con bot el criterio del §15 es otro: que el
           campo de escritura se alcance a ver sin hacer scroll. Que el
           bot saliera cortado fue la queja original. */
        const campo = document.querySelector('.pagina-bot .chat-forma');
        return {
          fuera: [...new Set(fuera)].slice(0, 4),
          ctaAbajo: cta ? Math.round(cta.getBoundingClientRect().bottom) : null,
          campoAbajo: campo ? Math.round(campo.getBoundingClientRect().bottom) : null,
          scrollW: document.documentElement.scrollWidth
        };
      }).catch(() => null);

      if (!r) { falla(`${w}x${h} — la página no cargó`); await ctx.close(); continue; }

      const libreCta   = r.ctaAbajo   === null ? null : h - r.ctaAbajo;
      const libreCampo = r.campoAbajo === null ? null : h - r.campoAbajo;

      const partes = [];
      if (libreCta !== null)   partes.push(`CTA ${libreCta >= 0 ? '+' + libreCta : libreCta}px`);
      if (libreCampo !== null) partes.push(`campo del bot ${libreCampo >= 0 ? '+' + libreCampo : libreCampo}px`);
      if (r.fuera.length) partes.push(`se desborda: ${r.fuera.join(', ')}`);
      if (errores.length) partes.push(`${errores.length} error(es): ${errores[0].slice(0, 70)}`);

      const cortado = (libreCta !== null && libreCta < 0) || (libreCampo !== null && libreCampo < 0);
      const mal = r.fuera.length || errores.length;
      const texto = `${String(w + 'x' + h).padEnd(9)} ${partes.join('  ·  ') || 'limpio'}`;
      if (mal) falla(texto);
      else if (cortado) aviso(texto + '  ← queda bajo el pliegue');
      else ok(texto);

      if (VER) await p.screenshot({ path: path.join(RAIZ, '.verificar', `${pag.replace('.html','')}-${w}x${h}.png`) });
      await ctx.close();
    }
  }
  await nav.close();
}

/* ---------- arranque ---------- */

(async () => {
  revisarEstatico();
  const s = servidor();
  await esperar(700);
  try { await revisarNavegador(); }
  finally { s.kill(); }

  console.log(linea.join('\n'));
  console.log('\n' + '─'.repeat(60));
  if (fallas) console.log(`${fallas} falla(s)` + (avisos ? ` y ${avisos} aviso(s)` : '') + '. No subas esto.');
  else if (avisos) console.log(`Sin fallas. ${avisos} aviso(s) — revísalos y decide.`);
  else console.log('Todo limpio.');
  console.log('A mano todavía: Safari real, iPhone real, y mirar si se ve bien.');
  process.exit(fallas ? 1 : 0);
})();
