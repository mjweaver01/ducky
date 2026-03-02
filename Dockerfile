FROM node:25-alpine AS builder
WORKDIR /app

# Copy full monorepo so npm workspaces resolve (avoids "No workspaces found" when Railway context differs)
COPY package.json package-lock.json tsconfig.json ./
COPY packages/ ./packages/
RUN npm cache clean --force && npm ci

RUN npm run build -w @ducky.wtf/shared && npm run build -w @ducky.wtf/database && npm run build -w @ducky.wtf/server

FROM node:25-alpine

WORKDIR /app

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/package.json ./

RUN npm install --omit=dev

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV TUNNEL_DOMAIN=localhost

CMD ["node", "packages/server/dist/index.js"]
