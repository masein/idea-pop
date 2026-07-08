# ---- builder ----
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Baked at build time (standalone output): API_URL is the server-side
# destination of the /api/* rewrite; NEXT_PUBLIC_* land in the client bundle.
ARG API_URL=http://localhost:8080
ENV API_URL=$API_URL
ARG NEXT_PUBLIC_MISSION_HELPER=false
ENV NEXT_PUBLIC_MISSION_HELPER=$NEXT_PUBLIC_MISSION_HELPER
RUN npm run build

# ---- runtime ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN useradd --create-home --user-group app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
