FROM node:20-alpine3.19

# Create app directory and set ownership
WORKDIR /app

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files and install as root
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Set ownership of app files
RUN chown -R appuser:appgroup /app

# Create uploads directory
RUN mkdir -p public/uploads && chown -R appuser:appgroup public/uploads

# Switch to non-root user
USER appuser

# Security hardening
ENV NODE_ENV=production
ENV NPM_CONFIG_AUDIT=true

EXPOSE 3000

CMD ["npm", "start"]
