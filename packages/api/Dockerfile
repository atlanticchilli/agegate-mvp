FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/api/package*.json packages/api/
COPY packages/shared/package*.json packages/shared/
RUN npm ci

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY packages/api packages/api
COPY packages/shared packages/shared
# Minimal package.json for workspace resolution (api only needs shared)
COPY packages/dashboard/package.json packages/dashboard/
COPY packages/widget/package.json packages/widget/
COPY data data
RUN npm run build --workspace=packages/shared && npm run build --workspace=packages/api

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV GOOGLE_CLOUD_PROJECT=agegate-mvp
ENV FIREBASE_PROJECT_ID=agegate-mvp
COPY --from=build /app/package*.json ./
COPY --from=build /app/packages/api ./packages/api
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/data ./data
COPY --from=build /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "packages/api/dist/index.js"]