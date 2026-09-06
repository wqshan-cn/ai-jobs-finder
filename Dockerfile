FROM node:20-slim

# Chromium 供 puppeteer-core 使用；中文字体保证抓取页面正常渲染
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-noto-cjk ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    NODE_ENV=production \
    PORT=3001

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/

RUN cd server && npm ci --omit=dev \
    && cd ../client && npm ci

COPY client ./client
RUN cd client && npm run build

COPY server ./server

EXPOSE 3001
CMD ["node", "server/index.js"]
