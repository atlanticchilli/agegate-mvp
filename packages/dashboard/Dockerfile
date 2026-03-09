FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/dashboard/package*.json packages/dashboard/
COPY packages/shared/package*.json packages/shared/
RUN npm ci

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=packages/dashboard

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /app/packages/dashboard/.next/standalone ./
COPY --from=build /app/packages/dashboard/.next/static ./packages/dashboard/.next/static
COPY --from=build /app/packages/dashboard/public ./packages/dashboard/public
EXPOSE 8080
CMD ["node", "packages/dashboard/server.js"]
