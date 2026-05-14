FROM public.ecr.aws/docker/library/node:20-slim AS builder

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

FROM public.ecr.aws/docker/library/node:20-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      curl \
      git \
      jq \
      poppler-utils \
      python3 \
      python3-pip \
      python3-venv \
      sqlite3 \
      tesseract-ocr \
      unzip \
      wget \
      zip \
    && rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN python3 -m venv "$VIRTUAL_ENV" \
 && pip install --no-cache-dir \
      beautifulsoup4 \
      lxml \
      markitdown \
      numpy \
      openpyxl \
      pandas \
      pdf2image \
      pdfminer.six \
      pdfplumber \
      pillow \
      pypdf \
      pypdfium2 \
      pytesseract \
      python-dateutil \
      PyYAML \
      reportlab \
      requests

# Match existing on-disk ownership (uid 100 / gid 101 used by every workspace VM's restored data).
RUN if getent group  101 >/dev/null; then groupdel "$(getent group  101 | cut -d: -f1)"; fi \
 && if getent passwd 100 >/dev/null; then userdel  "$(getent passwd 100 | cut -d: -f1)"; fi \
 && groupadd --system --gid 101 lazarus \
 && useradd  --system --uid 100 --gid 101 --shell /bin/bash --home-dir /mnt/sdc lazarus

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && pnpm store prune

COPY --from=builder /app/dist ./dist
COPY config ./config
COPY prompts ./prompts

RUN chown -R lazarus:lazarus /app /opt/venv

USER lazarus

ENV SHELL=/bin/bash
EXPOSE 8000

CMD ["node", "dist/index.js"]
