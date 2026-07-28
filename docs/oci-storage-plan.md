# GitPath + OCI Object Storage

## Objetivo

Usar OCI Object Storage para separar el contenido educativo y los artefactos del estado de ejecución de la aplicación. El bucket complementa el despliegue actual en contenedor; no reemplaza el repositorio Git ni debe convertirse en una base de datos de progreso.

## Qué guardar

| Tipo | Ejemplo de objeto | Acceso recomendado | Motivo |
| --- | --- | --- | --- |
| Catálogo publicado | `content/v1/lessons/index.json` | Lectura pública controlada o API | Permite publicar rutas sin recompilar toda la interfaz. |
| Lección individual | `content/v1/lessons/revert-release.json` | Lectura pública controlada o API | Facilita versionar, cachear y hacer rollback de contenido. |
| Assets | `assets/v1/diagrams/conflict-resolution.svg` | Lectura pública controlada | Evita inflar la imagen Docker con material pesado. |
| Export de progreso | `progress/<user-id>/<yyyy-mm>/session.json` | Privado, solo backend | El progreso puede contener información personal o identificable. |
| Backups y reportes | `reports/<yyyy-mm>/completion-summary.json` | Privado, solo operaciones | Permite analizar el producto sin guardar eventos crudos en el cliente. |

## Separación recomendada

Para producción, usar buckets distintos:

```text
gitpath-content-prod   contenido y assets de lectura
gitpath-progress-prod  progreso y reportes privados
```

El contenido público debe ser inmutable por versión. En lugar de sobrescribir `v1`, se publica `v2` y el frontend cambia el puntero de versión mediante CI. Así un rollback es un cambio pequeño y auditable.

## Flujo futuro

```text
Editor/PR de contenido
  → validación de schema JSON
  → publicación de content/v1 en OCI Object Storage
  → CDN/cache
  → GitPath carga el catálogo versionado

Usuario completa una misión
  → frontend genera un resumen mínimo
  → API autenticada
  → backend escribe progress/<user-id>/...
```

La aplicación actual conserva el catálogo en `src/data/lessons.ts` y el progreso en `localStorage`. Ese fallback permite que el laboratorio siga funcionando si el bucket no está disponible.

## Seguridad

- Nunca incluir `OCI_USER`, claves privadas, fingerprints o tokens en Vite, `localStorage`, el bucket público ni el repositorio.
- El navegador no debe escribir directamente al bucket. La escritura de progreso debe pasar por una API autenticada.
- Para workloads en OCI, preferir dynamic groups e instance principals; si el backend vive fuera de OCI, usar un secreto administrado y permisos mínimos.
- Activar versionado, cifrado administrado por OCI, logs de acceso y reglas de lifecycle para exports.
- Separar políticas de lectura de contenido y escritura de progreso.
- Para assets privados o temporales, usar URLs preautenticadas con expiración corta y alcance de solo lectura.

## Integración con CI/CD

La publicación de contenido debería ser un job separado del release de la imagen:

```text
PR de contenido
  → lint/schema check
  → npm run build
  → oci os object sync --src-dir content --prefix content/v1
  → smoke test del index.json
```

La identidad que publique debe tener permiso únicamente sobre el bucket de contenido. El workflow actual de la aplicación continúa publicando la imagen a GHCR y promoviendo el tag SHA a `K3s-Cortex`.

## Señales de calidad para el CV

Esta separación demuestra diseño de arquitectura y operación, no solo una UI:

- contenido versionado y desacoplado del runtime;
- fallback local para resiliencia;
- permisos mínimos y separación de datos públicos/privados;
- publicación reproducible desde CI;
- rollback por versión de contenido, además del rollback de imagen.
