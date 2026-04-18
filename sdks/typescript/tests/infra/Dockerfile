# syntax=docker/dockerfile:1.7

# Stage 1: Build & Deploy Isolate
FROM node:22-slim AS builder
WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PNPM_STORE_DIR=/pnpm/store
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy full workspace
COPY . .

# Install all dependencies (we need this to properly resolve monorepo deps)
RUN --mount=type=cache,target=/pnpm/store,id=liop-pnpm-store \
    pnpm install --no-frozen-lockfile

# Build the SDK
WORKDIR /app/sdks/typescript
RUN pnpm run build

# Deploy isolated directory with all required monorepo deps injected as regular node_modules
WORKDIR /app
RUN --mount=type=cache,target=/pnpm/store,id=liop-pnpm-store \
    pnpm deploy --legacy --filter @nekzus/liop /app/deploy

# Stage 2: Runtime (lean image)
FROM node:22-slim AS runtime
WORKDIR /app

# iproute2: tc for chaos testing | curl: for healthchecks
RUN apt-get update \
    && apt-get install -y --no-install-recommends iproute2 curl \
    && rm -rf /var/lib/apt/lists/*

# Install tsx and vitest globally since pnpm deploy strips devDependencies
RUN npm install -g tsx vitest

# Copy deployed standalone app (only includes dist, node_modules)
COPY --from=builder /app/deploy ./

# Manually copy source and test files ignored by package.json 'files' registry
COPY --from=builder /app/sdks/typescript/src/ ./src/
COPY --from=builder /app/sdks/typescript/tests/infra/ ./tests/infra/
COPY --from=builder /app/sdks/typescript/tests/crossnet/ ./tests/crossnet/

# Manually place the proto file matching PROD_PROTO_PATH resolution relative to /src/rpc
COPY --from=builder /app/protocol/proto/liop_core.proto ./src/protocol/liop_core.proto

WORKDIR /app
ENV LIOP_LOG_LEVEL=info
ENV LIOP_GRPC_PORT=50051

EXPOSE 3000 4001 50051

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:3000/health || exit 1
