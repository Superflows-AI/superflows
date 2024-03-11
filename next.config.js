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
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/([^/]*?)", // Match all non-nested pages
        headers: [{
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "deny"
        },
        {
          key: "Content-Security-Policy",
          value: "frame-ancestors 'none'"
        }
        ]
      },
      {
        source: "/(.*?)", // Match all pages
        headers: [{
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        }]
      },
      {
        source: "/api/(.*)", // All Serverless API endpoints (NOT Edge Functions)
        headers: [{
          key: "Cache-Control",
          value: "no-store"
        }],
      },
      {
        source: "/api/v1/(.*)", // Public endpoints
        // This enables calls to /api/v1 from users' domains
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

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
