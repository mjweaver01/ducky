FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/

RUN npm install

COPY tsconfig.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package*.json ./packages/shared/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package*.json ./packages/server/
COPY --from=builder /app/package*.json ./

RUN npm install --omit=dev

EXPOSE 3000 4000

ENV NODE_ENV=production
ENV PORT=3000
ENV TUNNEL_PORT=4000
ENV TUNNEL_DOMAIN=localhost

CMD ["node", "packages/server/dist/index.js"]
