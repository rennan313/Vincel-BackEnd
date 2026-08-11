# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
RUN yarn prisma generate
RUN yarn build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/main"]
