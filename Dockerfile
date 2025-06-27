FROM node:18

# Use working directory in app
WORKDIR /app

# Copy all files
COPY . .

# Debug - show comprehensive directory structure
RUN echo "==== ROOT DIRECTORY ===="
RUN ls -la
RUN echo "==== API DIRECTORY ===="
RUN ls -la api || echo "API directory not found!"
RUN echo "==== FULL DIRECTORY STRUCTURE ===="
RUN find . -type f | grep -i "index.js" || echo "No index.js files found!"

# Create directory if not exists
RUN mkdir -p api

# Copy index.js from root if exists in root
RUN cp index.js api/ 2>/dev/null || echo "No index.js in root to copy"

# Debug - check copied files
RUN echo "==== AFTER COPY ===="
RUN ls -la api/

# Install dependencies
RUN ls -la api/package.json || echo "No package.json found in api/"
RUN cd api && npm install || echo "Failed to install dependencies"

# Environment variables
ENV PORT=8081
ENV NODE_ENV=production

# Expose port
EXPOSE 8081

# Create a wrapper script to find and run the index.js file
RUN echo '#!/bin/sh\nif [ -f "/app/api/index.js" ]; then\n  cd /app/api && node index.js\nelif [ -f "/app/index.js" ]; then\n  cd /app && node index.js\nelse\n  echo "ERROR: Could not find index.js in any location"\n  find / -name "index.js" -type f\n  exit 1\nfi' > /app/start.sh
RUN chmod +x /app/start.sh

# Start API using the wrapper script
CMD ["/app/start.sh"]
