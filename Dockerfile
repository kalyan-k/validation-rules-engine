FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts
RUN npm run build:site
RUN npm run site:verify

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    VRE_SINGLE_HOST=1 \
    VRE_NO_OPEN=1 \
    VRE_HOST=0.0.0.0 \
    VRE_PORTAL_PORT=8080

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist/apps/portal ./dist/apps/portal
COPY --from=build /app/dist/site ./dist/site

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/apps/portal/server.js", "--single-host"]
