# Multi-stage build for production optimization
FROM oven/bun:1-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY tsconfig.json ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Development stage
FROM base AS development
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["bun", "run", "dev"]

# Build stage
FROM base AS build
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:1-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S memory -u 1001

# Install production dependencies only
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy built application
COPY --from=build --chown=memory:nodejs /app/dist ./dist

# Create logs directory
RUN mkdir -p logs && chown memory:nodejs logs

# Switch to non-root user
USER memory

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000

CMD ["bun", "run", "dist/server.js"]