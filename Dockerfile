FROM node:18

# Crear directorio para la API
WORKDIR /app/api

# Copiar primero package.json y package-lock.json para aprovechar el caché de Docker
COPY api/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos de la API
COPY api/ ./

# Variables de entorno
ENV PORT=8081
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 8081

# Iniciar la API
CMD ["node", "index.js"]
