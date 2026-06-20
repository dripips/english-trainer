# ---------- Stage 1: build the web (PWA) ----------
FROM node:24-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY web/ ./
RUN npm run build

# ---------- Stage 2: runtime (Fastify + node:sqlite) ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# server deps only
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev --no-audit --no-fund

# app code + content
COPY server/ ./server/
COPY content/ ./content/
COPY --from=web /web/dist ./web/dist

ENV CONTENT_DIR=/app/content \
    WEB_DIST=/app/web/dist \
    DATA_DIR=/app/data \
    PORT=3000
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "--experimental-sqlite", "--disable-warning=ExperimentalWarning", "server/src/index.js"]
