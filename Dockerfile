FROM node:18

# Crear directorio de la aplicación
WORKDIR /app

# DEBUG: Ver los directorios que se copian
RUN ls -la

# Copiar todos los archivos de la API a la raíz
COPY api/ /app/

# DEBUG: Ver los archivos que se copiaron
RUN ls -la

# DEBUG: Ver si existe el package.json
RUN cat package.json || echo "package.json not found"

# Instalar dependencias
RUN npm install

# Variables de entorno
ENV PORT=8081
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 8081

# Iniciar la API
CMD ["node", "index.js"]
