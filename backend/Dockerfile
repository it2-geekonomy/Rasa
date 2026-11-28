# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl
RUN npm install -g pnpm@9
WORKDIR /app/backend

COPY backend/package.json backend/pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

COPY backend/ ./
# Copy read-only seed inputs referenced by backend/prisma/seed.ts
COPY frontend/public/data/artists.json /app/frontend/public/data/artists.json
COPY frontend/lib/rasa/img-map.ts /app/frontend/lib/rasa/img-map.ts

RUN npx prisma generate
RUN pnpm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
RUN npm install -g pnpm@9

WORKDIR /app/backend
ENV NODE_ENV=production

COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/tsconfig.json ./tsconfig.json
COPY --from=builder /app/frontend/public/data/artists.json /app/frontend/public/data/artists.json
COPY --from=builder /app/frontend/lib/rasa/img-map.ts /app/frontend/lib/rasa/img-map.ts

EXPOSE 6060

CMD ["sh", "-c", "npx prisma db push --skip-generate && if [ \"$RUN_SEED\" = \"true\" ]; then npx ts-node -r tsconfig-paths/register prisma/seed.ts; fi && if [ -f dist/main.js ]; then exec node dist/main.js; else exec node dist/src/main.js; fi"]
