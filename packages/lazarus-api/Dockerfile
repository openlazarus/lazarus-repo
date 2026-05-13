FROM public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
COPY config ./config
COPY prompts ./prompts

RUN pnpm build

# ---

FROM public.ecr.aws/docker/library/node:20-alpine AS runner

RUN addgroup -S lazarus && adduser -S lazarus -G lazarus
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && pnpm store prune

COPY --from=builder /app/dist ./dist
COPY config ./config
COPY prompts ./prompts

RUN chown -R lazarus:lazarus /app

USER lazarus

EXPOSE 8000

CMD ["node", "dist/index.js"]
