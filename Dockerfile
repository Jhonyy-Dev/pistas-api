FROM node:18

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package.json y package-lock.json de la API
COPY api/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente de la API
COPY api ./

# Variables de entorno
ENV PORT=8081
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 8081

# Iniciar la API
CMD ["node", "src/index.js"]
