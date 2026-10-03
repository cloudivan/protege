/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Production builds write to their own directory so `npm run build` can
  // never corrupt the running dev server's .next state.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Share one mongoose instance across API-route bundles in dev (avoids
  // model-recompile errors on HMR).
  serverExternalPackages: ["mongoose", "mongodb"],
};

module.exports = nextConfig;
