// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // This enables calls to /api/watch from the chrome extension
  async headers() {
    return [];
  }
};
