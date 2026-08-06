FROM node:20-alpine

WORKDIR /app

# Backend dependencies
COPY backend/package*.json ./
RUN npm install

# Backend source (las variables de entorno las define docker-compose.yml)
COPY backend/src ./src
COPY backend/seed.js ./

# Frontend build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Copiar build al backend como estáticos
WORKDIR /app
RUN mkdir -p public && cp -r frontend/dist/* public/

# Seed database
RUN node seed.js

EXPOSE 3001

ENV PORT=3001

CMD ["node", "src/server.js"]
