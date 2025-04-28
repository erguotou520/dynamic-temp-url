FROM oven/bun:alpine AS base
WORKDIR /app

FROM base AS build
COPY index.ts .
COPY package.json .
RUN bun install && bun run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=build /app/index.js .
COPY --from=build /app/package.json .
COPY index.html .
ENV NODE_ENV=production

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "index.js" ]