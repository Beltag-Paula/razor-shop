# syntax=docker/dockerfile:1

# ---------- Build stage: install dependencies (native modules need compilers if no prebuilt binary exists) ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# git: some Baileys versions pull dependencies from GitHub. python3/make/g++: fallback for better-sqlite3 / sharp builds.
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Runtime stage ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    TRUST_PROXY=true \
    DB_FILE=/app/data/razor.db \
    WHATSAPP_AUTH_DIR=/app/data/whatsapp-auth \
    TZ=Europe/Bucharest
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY . .

# Persistent locations: database + WhatsApp session (/app/data) and customer/admin uploaded images.
RUN mkdir -p /app/data /app/public/uploads \
 && chown -R node:node /app/data /app/public/uploads
VOLUME ["/app/data", "/app/public/uploads"]

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

# Not "npm start": that script needs a .env file inside the image. Settings come from the environment instead.
CMD ["node", "server.js"]
