# syntax=docker/dockerfile:1.7

# The frontend build is platform-independent. Keep npm/Vite on the native
# runner architecture so Buildx does not execute Node through QEMU for arm64.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app

# Install dependencies before copying the source to keep Docker layer caching useful.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
