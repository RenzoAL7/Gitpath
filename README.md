# GitPath

GitPath es una ruta visual en español para aprender Git desde cero. Empieza antes del primer comando —instalación en Windows, macOS o Linux—, explica para qué sirve GitHub Desktop, construye el modelo mental de Git con escenas y termina en un laboratorio donde cada comando mueve un grafo de commits en tiempo real.

## Recorrido

| Etapa | Ruta | Qué aprende la persona |
| --- | --- | --- |
| 1. Preparar | `/instalar` | Cómo instalar y comprobar Git según su sistema, y cómo configurar nombre y correo. |
| 2. Usar una interfaz | `/github-desktop` | Para qué sirve GitHub Desktop y cómo se relacionan Changes, Commit, Push, Pull y Branch. |
| 3. Entender | `/aprender` | Commits, grafos, ramas, `HEAD`, staging, recuperación, rebase y reflog mediante nueve escenas. |
| 4. Practicar | `/ejercicios` | Cinco niveles básicos con commits, ramas, merge, `HEAD` separado y rebase. |
| Progreso | `/progreso` | Checks de preparación, escenas vistas y niveles completados, guardados localmente. |

Las páginas de instalación enlazan a las fuentes oficiales de [Git](https://git-scm.com/install/) y [GitHub Desktop](https://docs.github.com/es/desktop/installing-and-authenticating-to-github-desktop/installing-github-desktop). GitHub Desktop se presenta como aplicación oficialmente disponible para Windows y macOS; en Linux se recomienda continuar con Git en terminal o una interfaz alternativa.

## Laboratorio visual

El laboratorio no toca repositorios reales. Su motor determinista interpreta un conjunto acotado de comandos, actualiza ramas y `HEAD`, crea commits con sus padres y dibuja el resultado:

- `git commit -m "…"`
- `git branch <nombre>`
- `git switch <rama>`
- `git merge <rama>`
- `git switch --detach <commit>`
- `git rebase <rama>`

Cada nivel incluye un objetivo, un modelo mental, pasos, transcript, pistas y reinicio. El nivel de rebase conserva los commits anteriores atenuados y dibuja las copias con hashes nuevos para que la reescritura sea visible.

La estructura por niveles está inspirada en [Learn Git Branching](https://github.com/pcottle/learnGitBranching), de Peter Cottle, publicado bajo licencia MIT. GitPath implementa su propio contenido, motor y sistema visual; la atribución está documentada en [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Arquitectura

```text
React + TypeScript + Vite
  ├── src/data/course.ts                 escenas conceptuales
  ├── src/data/challenges.ts             mundos y niveles del laboratorio
  ├── src/lib/challenge-simulator.ts     motor determinista del grafo
  ├── src/components/GraphBoard.tsx      visualización de commits y punteros
  ├── src/App.tsx                        rutas, onboarding, curso y progreso
  └── src/index.css                      sistema visual responsive

CI/CD
  GitHub Actions → imagen multi-arquitectura en GHCR
                 → promoción y merge automático en K3s-Cortex
                 → Argo CD → rolling update en K3s
```

El progreso usa `localStorage`; no requiere cuenta ni envía datos a un servidor.

## Desarrollo local

```bash
npm ci
npm run dev
```

Validación completa:

```bash
npm test
npm run build
```

Los tests comprueban que una rama nueva no mueva `main`, que merge cree un commit con dos padres y que rebase reproduzca los commits con identificadores nuevos.

## Entrega automática

Cada pull request hacia `main` instala dependencias, ejecuta el audit de producción, las pruebas y el build. Un push a `main` publica la imagen `amd64`/`arm64` en GHCR, actualiza el repositorio GitOps `K3s-Cortex`, fusiona la promoción y deja que Argo CD actualice los pods de K3s.
