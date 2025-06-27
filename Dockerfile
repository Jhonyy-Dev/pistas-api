FROM node:18

# Crear directorio de la aplicación
WORKDIR /app

# Copiar los archivos de la API
COPY api/ .

# Instalar dependencias
RUN npm install

# Variables de entorno
ENV PORT=8081
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 8081

# Iniciar la API
CMD ["node", "index.js"]
