# Stage 1: Dependencies
FROM node:20-alpine AS deps
# Add libc6-compat for Prisma and other native modules
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
# Add openssl for Prisma
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build time
ENV NEXT_TELEMETRY_DISABLED=1
ENV DEMO=true
# Use a placeholder SESSION_SECRET for build time (must be at least 32 chars)
ENV SESSION_SECRET=placeholder_secret_for_build_purposes_only_32_chars
# Use a dummy DATABASE_URL for build if static routes use Prisma
ENV DATABASE_URL=postgresql://localhost:5432/unused
# Prevent background worker from starting during build
ENV SKIP_WORKER=true

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
# Add openssl for Prisma runtime
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV DEMO=true

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]
