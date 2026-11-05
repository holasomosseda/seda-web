# Graph Report - seda-web  (2026-11-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 41 nodes · 62 edges · 6 communities (5 shown, 1 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0912c974`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- demo-tallas.js
- contacto.js
- atmosfera.js
- intro.js
- sitio.js
- idioma.js

## God Nodes (most connected - your core abstractions)
1. `responder()` - 7 edges
2. `responder()` - 6 edges
3. `preguntar()` - 4 edges
4. `procesar()` - 4 edges
5. `resultado()` - 4 edges
6. `cerrar()` - 4 edges
7. `gasEn()` - 4 edges
8. `terminar()` - 4 edges
9. `arrancar()` - 3 edges
10. `arrancar()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (6 total, 1 thin omitted)

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

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cerrar()` connect `contacto.js` to `sitio.js`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._