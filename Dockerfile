FROM node:18

# Use working directory in app
WORKDIR /app

# Copy all files
COPY . .

# Debug - show directory structure
RUN ls -la
RUN find . -type d | sort

# Install dependencies
RUN cd api && npm install

# Environment variables
ENV PORT=8081
ENV NODE_ENV=production

# Expose port
EXPOSE 8081

# Start API - Change to api directory first
WORKDIR /app/api
CMD ["node", "index.js"]
