FROM node:18

# Crear directorio de la aplicación
WORKDIR /app

# Copiar todo el código fuente
COPY . .

# Listar contenido para depuración
RUN echo "==== Contenido de /app ====" && ls -la

# Listar contenido de api para depuración
RUN echo "==== Contenido de /app/api ====" && ls -la api || echo "No existe carpeta api"

# Directorio de trabajo para la API
WORKDIR /app/api

# Listar contenido del directorio actual para depuración
RUN echo "==== Contenido del directorio actual ====" && ls -la

# Instalar dependencias
RUN npm install

# Variables de entorno
ENV PORT=8081
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 8081

# Iniciar la API
CMD ["node", "index.js"]
