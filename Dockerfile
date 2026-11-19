# Production image for self-hosting (homelab k3s "shipyard"): static Angular build served by unprivileged nginx on :8080.
# Build: docker build -t aniranker .   Run: docker run -p 8080:8080 aniranker
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && mkdir /out && cp -r dist/*/browser/. /out/ && test -f /out/index.html

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out /usr/share/nginx/html
EXPOSE 8080
