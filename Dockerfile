FROM node:20.19.0-alpine as builder

# Security updates and scanning
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# Vulnerability scanning
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin && \
    trivy filesystem --exit-code 1 --no-progress --severity HIGH,CRITICAL /

WORKDIR /app

# Copy package files and TypeScript config
COPY package*.json tsconfig.json ./

# Install dependencies with strict security
RUN npm ci --audit=true --production=false && \
    npm audit fix --force && \
    npm prune --production

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM node:20.19.0-alpine

# Security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files and assets
COPY --from=builder /app/dist ./dist
COPY public ./public

# Set up uploads directory with correct permissions
RUN mkdir -p public/uploads && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Enhanced security hardening
ENV NODE_ENV=production \
    NPM_CONFIG_AUDIT=true \
    NODE_OPTIONS='--max-old-space-size=2048 --security-revert=CVE-2023-46809' \
    PATH=/app/node_modules/.bin:$PATH

# Additional security measures
RUN echo "fs.file-max = 65535" >> /etc/sysctl.conf && \
    echo "kernel.unprivileged_userns_clone = 1" >> /etc/sysctl.conf

EXPOSE 3000

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
