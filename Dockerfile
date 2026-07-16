FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
# VITE_* vars are compile-time (baked into the client bundle) → build args.
ARG VITE_CHILD_NAME
ARG VITE_APP_NAME
ARG VITE_APP_DESCRIPTION
ARG VITE_STORY_LABEL
# env.ts validates server secrets at import time; skip during build.
RUN SKIP_ENV_VALIDATION=1 bun run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3009
COPY --from=build /app/.output ./.output
EXPOSE 3009
CMD ["node", ".output/server/index.mjs"]
