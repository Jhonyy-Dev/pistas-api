FROM node:18

# Use working directory in app
WORKDIR /app

# Copy package.json from root directory
COPY package.json /app/

# Install dependencies
RUN npm install

# Copy individual files and folders from api directory
COPY api/index.js /app/
COPY api/config /app/config
COPY api/database /app/database
COPY api/middlewares /app/middlewares
COPY api/models /app/models
COPY api/routes /app/routes
COPY api/scripts /app/scripts
COPY api/src /app/src
COPY api/utils /app/utils
COPY api/.env.production /app/.env

# Environment variables
ENV PORT=8081
ENV NODE_ENV=production

# Expose port
EXPOSE 8081

# Start API
CMD ["node", "index.js"]
