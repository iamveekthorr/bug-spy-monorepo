# Use official Node.js image optimized for ARM64
FROM node:20-bullseye AS base

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install system dependencies and Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    curl \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install pnpm
RUN npm install -g pnpm@latest

# Create app user for security
RUN groupadd -r nodeuser && useradd -r -g nodeuser -G audio,video nodeuser \
    && mkdir -p /home/nodeuser/Downloads \
    && chown -R nodeuser:nodeuser /home/nodeuser

WORKDIR /app

# Development stage
FROM base AS development

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Change ownership
RUN chown -R nodeuser:nodeuser /app

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "start:dev"]

# Production stage
FROM base AS production

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Install ALL dependencies first (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY . .
RUN pnpm run build

# Remove devDependencies after build to reduce image size
RUN pnpm prune --prod

# Clean up unnecessary files
RUN rm -rf src test *.md tsconfig*.json jest.config.js .eslint* .prettier* node_modules/.cache \
    && chown -R nodeuser:nodeuser /app

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/capture-metrics/health || exit 1

# Start production server
CMD ["node", "dist/main.js"]
