FROM node:18

# Use working directory in app
WORKDIR /app

# Copy all files
COPY . .

# Debug - show directory structure
RUN echo "==== DIRECTORY STRUCTURE BEFORE SETUP ===="
RUN ls -la
RUN ls -la api || echo "API directory not found!"
RUN find . -name "index.js" -type f || echo "No index.js files found!"

# Create temporary directory for api setup
RUN mkdir -p /app/api_temp

# Copy index.js from root to api_temp if exists
RUN if [ -f "/app/index.js" ]; then cp /app/index.js /app/api_temp/ && echo "Copied index.js from root"; fi

# Copy utils directory if exists
RUN if [ -d "/app/api/utils" ]; then cp -r /app/api/utils /app/api_temp/ && echo "Copied utils directory"; fi

# Copy all directories from api to api_temp
RUN if [ -d "/app/api/config" ]; then cp -r /app/api/config /app/api_temp/ && echo "Copied config directory"; fi
RUN if [ -d "/app/api/database" ]; then cp -r /app/api/database /app/api_temp/ && echo "Copied database directory"; fi
RUN if [ -d "/app/api/middlewares" ]; then cp -r /app/api/middlewares /app/api_temp/ && echo "Copied middlewares directory"; fi
RUN if [ -d "/app/api/models" ]; then cp -r /app/api/models /app/api_temp/ && echo "Copied models directory"; fi
RUN if [ -d "/app/api/routes" ]; then cp -r /app/api/routes /app/api_temp/ && echo "Copied routes directory"; fi
RUN if [ -d "/app/api/scripts" ]; then cp -r /app/api/scripts /app/api_temp/ && echo "Copied scripts directory"; fi
RUN if [ -d "/app/api/src" ]; then cp -r /app/api/src /app/api_temp/ && echo "Copied src directory"; fi

# Copy package.json and env files
RUN if [ -f "/app/api/package.json" ]; then cp /app/api/package.json /app/api_temp/ && echo "Copied package.json"; fi
RUN if [ -f "/app/api/.env.production" ]; then cp /app/api/.env.production /app/api_temp/.env && echo "Copied .env.production"; fi

# Remove old api directory and replace with new one
RUN rm -rf /app/api || echo "No api directory to remove"
RUN mv /app/api_temp /app/api

# Show final directory structure
RUN echo "==== FINAL DIRECTORY STRUCTURE ===="
RUN find /app -type d | sort
RUN ls -la /app/api/

# Install dependencies
RUN cd /app/api && npm install

# Environment variables
ENV PORT=8081
ENV NODE_ENV=production

# Expose port
EXPOSE 8081

# Start API from api directory
WORKDIR /app/api
CMD ["node", "index.js"]
