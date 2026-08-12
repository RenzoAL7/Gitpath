# GitPath

GitPath es una experiencia educativa visual para entender Git antes de memorizar comandos. El curso explica commits, grafos, ramas, `HEAD`, staging, `rebase` y `reflog` como una presentación breve; después ofrece un laboratorio opcional con situaciones que aparecen en un equipo real.

La inspiración conceptual es [Learn Git Branching](https://github.com/pcottle/learnGitBranching), pero el enfoque de GitPath está orientado a la toma de decisiones: cada comando aparece dentro de un incidente, muestra su efecto y explica el riesgo de usarlo mal.

## Qué existe hoy

- Curso visual de nueve escenas, navegable con botones, indicadores o las flechas del teclado.
- Cuatro capítulos inspirados en el modelo interno de Git: objetos, punteros, selección de cambios y recuperación.
- Laboratorio independiente con cinco escenarios, comandos guiados, transcript de terminal y visualización del repositorio.
- Estado simulado para ramas, `HEAD`, staging, conflictos y commits.
- Feedback contextual cuando el comando no resuelve el paso actual.
- Progreso separado para el curso y las prácticas, persistido localmente con `localStorage`.
- Casos de fallo con síntoma, riesgo y comando de rescate.
- Build reproducible con Docker, Nginx, GitHub Actions, GHCR y promoción GitOps hacia K3s.
- Suite de comportamiento con Node test runner para validar el orden y el resultado de los comandos.

## Arquitectura actual

```text
React + TypeScript + Vite
  ├── src/data/course.ts        contenido del curso visual
  ├── src/data/lessons.ts       catálogo de prácticas
  ├── src/lib/git-simulator.ts  motor determinista de prácticas
  ├── src/App.tsx               navegación, laboratorio y progreso
  └── src/index.css             sistema visual responsive

CI/CD
  GitHub Actions → imagen multi-arquitectura en GHCR
                → PR de promoción y merge automático en K3s-Cortex
                → Argo CD → rolling update en K3s
```

El simulador es deliberadamente determinista y local en esta primera etapa. Eso permite practicar sin credenciales, sin riesgo para repositorios reales y sin depender de una API durante la lección.

## Cómo se usa la ruta

1. Empieza en **Curso visual** y avanza por una idea a la vez. Cada escena combina una explicación corta con un modelo gráfico.
2. Cuando quieras probar lo aprendido, abre el **Laboratorio**, elige un escenario y escribe el comando que creas correcto.
3. Si te bloqueas, puedes usar el comando sugerido como punto de partida y modificarlo antes de ejecutarlo. No sustituye la explicación ni completa la misión por ti.
4. Las escenas vistas y las misiones completadas se guardan únicamente en `localStorage`. Puedes retomar ambas rutas desde Inicio o Progreso.

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

Al hacer merge a `main`, GitHub Actions publica una imagen multi-arquitectura (`amd64` y `arm64`) en GHCR con un tag inmutable basado en el SHA del commit. Después abre o actualiza el PR de promoción en `K3s-Cortex`, verifica su commit exacto y lo fusiona automáticamente. Argo CD detecta el cambio y ejecuta el rolling update sin comandos manuales sobre el Deployment.

## Roadmap

1. Añadir tests del motor de comandos y un modo de evaluación con comandos alternativos.
2. Separar contenido, motor y UI para poder publicar nuevas rutas sin tocar el frontend.
3. Servir el catálogo versionado desde OCI Object Storage y mantener fallback local.
4. Añadir autenticación opcional y sincronización de progreso mediante una API.
5. Incorporar accesibilidad, telemetría anónima y métricas de aprendizaje: tasa de finalización, intentos y errores por escenario.

La estrategia para OCI está documentada en [`docs/oci-storage-plan.md`](docs/oci-storage-plan.md).

## Cómo presentarlo en el CV

> Construí GitPath, una plataforma interactiva de aprendizaje de Git con simulación determinista de ramas, staging, conflictos y recuperación con `reflog`; automatizé su entrega multi-arquitectura con GitHub Actions, GHCR, GitOps, Argo CD y K3s sobre OCI.
