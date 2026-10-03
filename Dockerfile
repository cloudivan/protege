FROM node:20-bookworm-slim

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

# BuildKit cache mount persists npm's tarball cache on the build host, so
# lockfile changes unpack from local cache instead of re-downloading.
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
ENV NODE_ENV=production
ENV PORT=3002
# Builds write to .next-build (never the dev server's .next). ENV persists into
# the running container, so `next start` reads the same dir.
ENV NEXT_DIST_DIR=.next-build

# No env vars needed at build time: pages are static shells and all DB and
# API-key access happens inside API routes at request time.
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

# Run as non-root. Only the build dir and public/frames (captured screen
# moments) must be writable at runtime.
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nextjs && \
    mkdir -p public/frames && \
    chown -R nextjs:nodejs .next-build public/frames
USER nextjs

EXPOSE 3002
CMD ["npm", "run", "start"]
