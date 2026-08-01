# GitPath

GitPath es una plataforma educativa para aprender Git resolviendo situaciones que aparecen en un equipo real: cambios sin guardar, ramas de trabajo, incidentes en producción, conflictos de merge y recuperación con `reflog`.

La inspiración conceptual es [Learn Git Branching](https://github.com/pcottle/learnGitBranching), pero el enfoque de GitPath está orientado a la toma de decisiones: cada comando aparece dentro de un incidente, muestra su efecto y explica el riesgo de usarlo mal.

## Qué existe hoy

- Ruta de cinco escenarios, desde el primer commit hasta un rescate con `reflog`.
- Laboratorio interactivo con comandos guiados, transcript de terminal y visualización del repositorio.
- Estado simulado para ramas, `HEAD`, staging, conflictos y commits.
- Feedback contextual cuando el comando no resuelve el paso actual.
- Progreso persistido localmente con `localStorage`, sin enviar datos personales.
- Casos de fallo con síntoma, riesgo y comando de rescate.
- Build reproducible con Docker, Nginx, GitHub Actions, GHCR y promoción GitOps hacia K3s.
- Suite de comportamiento con Node test runner para validar el orden y el resultado de los comandos.

## Arquitectura actual

```text
React + TypeScript + Vite
  ├── src/data/lessons.ts       catálogo de contenido
  ├── src/lib/git-simulator.ts  motor determinista de prácticas
  ├── src/App.tsx               navegación, laboratorio y progreso
  └── src/index.css             sistema visual responsive

CI/CD
  GitHub Actions → imagen multi-arquitectura en GHCR
                → PR de promoción en K3s-Cortex
                → Argo CD → K3s
```

El simulador es deliberadamente determinista y local en esta primera etapa. Eso permite practicar sin credenciales, sin riesgo para repositorios reales y sin depender de una API durante la lección.

## Cómo se usa la ruta

1. Elige una guía en **Fundamentos** o **Ramas y PRs** para entender el contexto antes de abrir la terminal.
2. En el **Laboratorio**, lee el escenario y prueba el comando que creas correcto. El panel muestra qué paso sigue y por qué.
3. Si te bloqueas, puedes usar el comando sugerido como punto de partida y modificarlo antes de ejecutarlo. No sustituye la explicación ni completa la misión por ti.
4. Al completar una misión, el avance se guarda únicamente en `localStorage` del navegador. Puedes retomar la siguiente práctica desde Inicio o Progreso.

La navegación mantiene las rutas visibles también en móvil, de modo que se puede cambiar de contexto sin perder la práctica actual.

## Desarrollo local

```bash
npm ci
npm run dev
```

Para validar el build de producción:

```bash
npm run build
```

## CI/CD

Cada pull request hacia `main` instala las dependencias, ejecuta el audit de producción, los tests del simulador y valida el build de frontend y la imagen Docker.

Al hacer merge a `main`, GitHub Actions publica una imagen multi-arquitectura (`amd64` y `arm64`) en GHCR con un tag inmutable basado en el SHA del commit. Después abre un PR en `K3s-Cortex` para que Argo CD sincronice el nuevo estado deseado.

## Roadmap

1. Añadir tests del motor de comandos y un modo de evaluación con comandos alternativos.
2. Separar contenido, motor y UI para poder publicar nuevas rutas sin tocar el frontend.
3. Servir el catálogo versionado desde OCI Object Storage y mantener fallback local.
4. Añadir autenticación opcional y sincronización de progreso mediante una API.
5. Incorporar accesibilidad, telemetría anónima y métricas de aprendizaje: tasa de finalización, intentos y errores por escenario.

La estrategia para OCI está documentada en [`docs/oci-storage-plan.md`](docs/oci-storage-plan.md).

## Cómo presentarlo en el CV

> Construí GitPath, una plataforma interactiva de aprendizaje de Git con simulación determinista de ramas, staging, conflictos y recuperación con `reflog`; automatizé su entrega multi-arquitectura con GitHub Actions, GHCR, GitOps, Argo CD y K3s sobre OCI.
