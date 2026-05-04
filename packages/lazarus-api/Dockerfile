FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY config ./config
COPY prompts ./prompts

RUN npm run build

# ---

FROM node:20-alpine AS runner

RUN addgroup -S lazarus && adduser -S lazarus -G lazarus

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY config ./config
COPY prompts ./prompts

RUN chown -R lazarus:lazarus /app

USER lazarus

EXPOSE 8000

CMD ["node", "dist/index.js"]
