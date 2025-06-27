FROM node:18

# Use working directory in app
WORKDIR /app

# Copy all files
COPY . .

# Debug - show comprehensive directory structure
RUN echo "==== DIRECTORY STRUCTURE BEFORE SETUP ===="
RUN ls -la
RUN ls -la api/ || echo "API directory not found!"
RUN find . -name "index.js" -type f || echo "No index.js files found!"

# Set up proper directory structure for the app
RUN echo "==== SETTING UP PROPER DIRECTORY STRUCTURE ===="

# Create a setup script to organize files correctly
RUN echo '#!/bin/sh

# Make sure api directory exists
mkdir -p /app/api_temp

# If index.js exists at root, move it to api directory
if [ -f "/app/index.js" ]; then
  echo "Found index.js in root, moving to proper location"
  mv /app/index.js /app/api_temp/
fi

# If utils directory exists in api, copy it to api_temp
if [ -d "/app/api/utils" ]; then
  echo "Found utils directory, copying..."
  cp -r /app/api/utils /app/api_temp/
fi

# Copy all required directories from api to api_temp
# This ensures everything is in the right place
for dir in config database middlewares models routes scripts src utils; do
  if [ -d "/app/api/$dir" ]; then
    echo "Copying $dir directory"
    cp -r "/app/api/$dir" "/app/api_temp/"
  fi
done

# Copy package.json and other important files
if [ -f "/app/api/package.json" ]; then
  cp /app/api/package.json /app/api_temp/
fi

if [ -f "/app/api/.env.production" ]; then
  cp /app/api/.env.production /app/api_temp/.env
fi

# Replace api with api_temp
rm -rf /app/api
mv /app/api_temp /app/api

# Show final structure
echo "==== FINAL DIRECTORY STRUCTURE ===="
find /app -type d | sort
ls -la /app/api/
' > /app/setup.sh

# Execute the setup script
RUN chmod +x /app/setup.sh
RUN /app/setup.sh

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
