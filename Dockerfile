FROM node:18

# Use working directory in app
WORKDIR /app

# Copy all files
COPY . .

# Debug - show detailed directory structure
RUN echo "==== DIRECTORY STRUCTURE BEFORE SETUP ===="
RUN ls -la
RUN ls -la api || echo "API directory not found!"
RUN echo "==== Checking for utils directory ===="
RUN find . -name "utils" -type d || echo "No utils directory found!"
RUN find . -name "validateEnv.js" -type f || echo "No validateEnv.js file found!"
RUN echo "==== Content of api/utils if exists ===="
RUN ls -la api/utils || echo "api/utils directory not accessible"

# Simpler and more direct approach - copy specific folders directly to ensure paths
RUN mkdir -p /app/api/utils
RUN find . -name "validateEnv.js" -type f -exec cp {} /app/api/utils/ \;
RUN find . -name "logger.js" -type f -exec cp {} /app/api/utils/ \;

# Copy index.js directly to api folder
RUN if [ -f "/app/api/index.js" ]; then echo "index.js exists in api folder"; else echo "index.js NOT found in api folder!"; fi
RUN if [ -f "/app/index.js" ]; then cp /app/index.js /app/api/index.js && echo "Copied index.js from root to api"; fi

# Copy all important directories to ensure they exist
RUN mkdir -p /app/api/middlewares /app/api/routes /app/api/models /app/api/config

# Copy specific directories from api to ensure paths
RUN cp -r api/middlewares/* /app/api/middlewares/ || echo "No middlewares to copy"
RUN cp -r api/routes/* /app/api/routes/ || echo "No routes to copy"
RUN cp -r api/models/* /app/api/models/ || echo "No models to copy"
RUN cp -r api/config/* /app/api/config/ || echo "No config to copy"

# Ensure all files needed by index.js are available
RUN cp -r api/utils/* /app/api/utils/ || echo "No utils to copy - this is critical"

# Copy package.json and env files
RUN cp api/package.json /app/api/ || echo "No package.json found in api directory"
RUN if [ -f "api/.env.production" ]; then cp api/.env.production /app/api/.env && echo "Copied .env.production"; fi

# Debug the specific module that's causing problems
RUN echo "==== Checking utils module files after setup ===="
RUN ls -la /app/api/utils/ || echo "Utils directory doesn't exist or is empty!"
RUN cat /app/api/utils/validateEnv.js || echo "validateEnv.js file doesn't exist or is empty!"
RUN cat /app/api/index.js | grep -n "require" || echo "No require statements found in index.js"

# Install dependencies
RUN cd /app/api && npm install

# Environment variables
ENV PORT=8081
ENV NODE_ENV=production
ENV DATABASE_URL="mysql://u487652187_usuario:Yokarique123@srv1847.hstgr.io/u487652187_web_pistas"
ENV CORS_ORIGIN="*"
ENV B2_APPLICATION_KEY="005637a24248f210000000001:K005pGnpw7tRrnTMIAleGDv00UNdPJI"
ENV B2_BUCKET_NAME="pistas"
ENV B2_ENDPOINT="s3.us-east-005.backblazeb2.com"
ENV B2_REGION="us-east-005"

# Expose port
EXPOSE 8081

# Start API from api directory
WORKDIR /app/api
CMD ["node", "index.js"]
