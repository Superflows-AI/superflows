// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

/** @type {import('next').NextConfig} */
const headers = [
  { key: "Access-Control-Allow-Credentials", value: "true" },
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "OPTIONS,POST" },
  {
    key: "Access-Control-Allow-Headers",
    value: "Content-Type, Authorization, Accept",
  },
];

module.exports = {
  reactStrictMode: true,
  // This enables calls to /api/v1 from users' domains
  async headers() {
    return [
      {
        source: "/api/v1/answers",
        headers: headers,
      },
      {
        source: "/api/v1/confirm",
        headers: headers,
      },
      {
        source: "/api/v1/feedback",
        headers: headers,
      },
      {
        source: "/api/v1/follow-ups",
        headers: headers,
      },
    ];
  },
};

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,

    org: "learney",
    project: "superflows-ai-copilot",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  },
);
