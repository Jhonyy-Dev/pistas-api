FROM node:18

# Use working directory in app
WORKDIR /app

# Copy package.json and index.js from root directory
COPY package.json index.js /app/

# Copy all directories from api directory
COPY api/config /app/config
COPY api/database /app/database
COPY api/middlewares /app/middlewares
COPY api/models /app/models
COPY api/routes /app/routes
COPY api/scripts /app/scripts
COPY api/src /app/src
COPY api/utils /app/utils

# Copy environment variables file
COPY api/.env.production /app/.env

# Install dependencies
RUN npm install

# Environment variables
ENV PORT=8081
ENV NODE_ENV=production

# Debug - list files to verify index.js is there
RUN ls -la

# Expose port
EXPOSE 8081

# Start API
CMD ["node", "index.js"]
