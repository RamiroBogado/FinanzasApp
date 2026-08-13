# Etapa 1: build del frontend
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Etapa 2: dependencias de produccion del backend
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Etapa 3: imagen final
FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src ./src
COPY backend/seed.js ./
COPY --from=frontend /app/frontend/dist ./public

EXPOSE 3001
ENV PORT=3001

CMD ["node", "src/server.js"]