FROM node:18

# Crear directorio de la aplicación
WORKDIR /app

# Copiar archivos de package.json para instalar dependencias solo de la API
COPY api/package*.json ./api/

# Instalar dependencias solo de la API
RUN npm start

# Copiar código fuente de la API
COPY api ./api

# Variables de entorno
ENV PORT=8081
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 8081

# Iniciar la API
CMD ["node", "api/src/index.js"]
