FROM node:18

# Crear directorios necesarios
RUN mkdir -p /app/api
WORKDIR /app

# Copiar solo los archivos necesarios primero
COPY ./api/package*.json /app/api/

# Instalar dependencias
WORKDIR /app/api
RUN npm install

# Copiar todo el resto del código al directorio de trabajo
COPY ./api/ /app/api/

# Asegurarse de que index.js existe
RUN ls -la /app/api/index.js || echo "index.js NO EXISTE!!!"

# Crear script de diagnóstico y arranque
RUN echo '#!/bin/bash\necho "==== Directorio actual: $(pwd) ===="\nls -la\necho "==== Comprobando index.js ===="\nif [ -f "index.js" ]; then\n  echo "index.js encontrado, ejecutando..."\n  node index.js\nelse\n  echo "index.js NO ENCONTRADO!"\n  find /app -name "index.js" -type f\nfi' > /app/api/start.sh

# Hacer ejecutable el script
RUN chmod +x /app/api/start.sh

# Variables de entorno
ENV PORT=8081
ENV NODE_ENV=production

# Exponer puerto
EXPOSE 8081

# Iniciar la API con script de diagnóstico
CMD ["/bin/bash", "/app/api/start.sh"]
