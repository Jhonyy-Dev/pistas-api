FROM node:18

# Use working directory in app
WORKDIR /app

# Copy entire api folder contents
COPY api /app

# Install dependencies
RUN npm install

# Environment variables
ENV PORT=8081
ENV NODE_ENV=production

# Expose port
EXPOSE 8081

# Start API
CMD ["node", "index.js"]
