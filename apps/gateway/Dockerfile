# Gateway Server Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 gateway

# Copy built application
COPY --from=builder --chown=gateway:nodejs /app/dist ./dist
COPY --from=builder --chown=gateway:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=gateway:nodejs /app/package*.json ./

USER gateway

EXPOSE 35000

ENV PORT=35000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "dist/index.js"]


