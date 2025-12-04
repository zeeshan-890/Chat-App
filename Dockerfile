# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-build

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci

# Copy client source code
COPY client/ ./

# Build the React app
RUN npm run build

# Stage 2: Production server
FROM node:22-alpine AS production

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy server source code
COPY server/ ./

# Copy built frontend from previous stage
COPY --from=frontend-build /app/client/dist ./client/dist

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the server
CMD ["node", "index.js"]
