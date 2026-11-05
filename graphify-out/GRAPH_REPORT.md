# Graph Report - seda-web  (2026-11-04)

## Corpus Check
- 9 files · ~12,257 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .css 4, (none) 1)

## Summary
- 75 nodes · 110 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ddafcacf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- demo-tallas.js
- contacto.js
- atmosfera.js
- intro.js
- sitio.js
- idioma.js
- verificar.js
- agente.js
- revisarEstatico

## God Nodes (most connected - your core abstractions)
1. `responder()` - 7 edges
2. `revisarEstatico()` - 6 edges
3. `revisarNavegador()` - 6 edges
4. `responder()` - 6 edges
5. `pintar()` - 4 edges
6. `arrancar()` - 4 edges
7. `preguntar()` - 4 edges
8. `procesar()` - 4 edges
9. `resultado()` - 4 edges
10. `cerrar()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (9 total, 1 thin omitted)

### Community 0 - "demo-tallas.js"
Cohesion: 0.42
Nodes (8): arrancar(), burbuja(), escribiendo(), preguntar(), procesar(), responder(), resultado(), tallaDe()

### Community 1 - "contacto.js"
Cohesion: 0.44
Nodes (8): armarMensaje(), arrancar(), burbuja(), cerrar(), escribiendo(), ponerBoton(), preguntar(), responder()

### Community 2 - "atmosfera.js"
Cohesion: 0.48
Nodes (4): encuadre(), gasEn(), girar(), sembrar()

### Community 3 - "intro.js"
Cohesion: 0.60
Nodes (5): destapar(), programarFundido(), saltar(), terminar(), traza()

### Community 4 - "sitio.js"
Cohesion: 0.40
Nodes (4): btnMenu, encabezado, navSitio, porAparecer

### Community 6 - "verificar.js"
Cohesion: 0.12
Nodes (11): args, { execFileSync }, fs, http, linea, PAGINAS, path, soloPagina (+3 more)

### Community 7 - "agente.js"
Cohesion: 0.39
Nodes (6): arrancar(), cuadro(), medir(), parar(), pintar(), rendirse()

### Community 8 - "revisarEstatico"
Cohesion: 0.36
Nodes (8): aviso(), esperar(), falla(), leerDiccionario(), ok(), revisarEstatico(), revisarNavegador(), titulo()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cerrar()` connect `contacto.js` to `sitio.js`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `verificar.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._