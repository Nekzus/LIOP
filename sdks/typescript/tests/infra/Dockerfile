# Stage 1: Build (discarded in final image)
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml* ./
COPY sdks/typescript/package.json ./sdks/typescript/
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm install --frozen-lockfile

# We only need to build the TypeScript SDK
COPY . .
WORKDIR /app/sdks/typescript
RUN pnpm run build

# Stage 2: Runtime (lean image)
FROM node:20-slim AS runtime
WORKDIR /app

# iproute2: tc for chaos testing | curl: for healthchecks
RUN apt-get update \
    && apt-get install -y --no-install-recommends iproute2 curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/sdks/typescript/dist ./dist
COPY --from=builder /app/sdks/typescript/node_modules ./node_modules
COPY --from=builder /app/sdks/typescript/package.json ./
# Entrypoints will be mounted or copied here, we mount them or copy them from the build context
COPY sdks/typescript/tests/infra/entrypoints/ ./entrypoints/

ENV LIOP_LOG_LEVEL=info
ENV LIOP_GRPC_PORT=50051

EXPOSE 3000 4001 50051

HEALTHCHECK --interval=5s --timeout=3s --start_period=15s --retries=10 \
  CMD curl -sf http://localhost:3000/health || exit 1
