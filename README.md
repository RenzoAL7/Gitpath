# GitPath

Aprende Git desde cero mediante rutas prácticas y ejercicios interactivos.

## Estado

En construcción.

## Desarrollo local

```bash
npm install
npm run dev
```

Para validar el build de producción:

```bash
npm run build
```

## CI/CD

Cada pull request hacia `main` instala las dependencias, ejecuta el build y valida la imagen Docker.
Al hacer merge a `main`, GitHub Actions publica una imagen multi-arquitectura (`amd64` y `arm64`) en GHCR con un tag inmutable basado en el SHA del commit.
