FROM node:18

# Crear directorio de la aplicación
WORKDIR /app

# Copiar archivos de package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . ./

# Variables de entorno
ENV PORT=8081
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 8081

# Iniciar la API
CMD ["node", "index.js"]
