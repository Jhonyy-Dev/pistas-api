FROM node:18 AS build

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package.json y package-lock.json
COPY web/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY web/ ./

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM node:18-slim

WORKDIR /app

# Copiar archivos de construcción desde la etapa anterior
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules

# Variables de entorno
ENV PORT=3000
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 3000

# Iniciar la aplicación
CMD ["npm", "run", "preview"]
