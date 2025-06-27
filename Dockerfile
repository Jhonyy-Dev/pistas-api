FROM node:18

# Use working directory in app
WORKDIR /app

# Copy package.json from root directory
COPY package.json /app/

# Install dependencies
RUN npm install

# Copy entire api folder contents (except package.json, which we already copied)
COPY api /app

# Environment variables
ENV PORT=8081
ENV NODE_ENV=production

# Expose port
EXPOSE 8081

# Start API
CMD ["node", "index.js"]
