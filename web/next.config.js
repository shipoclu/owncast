const withLess = require('next-with-less');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const runtimeCaching = require('next-pwa/cache');

const withPWA = require('next-pwa')({
  dest: 'public',
  runtimeCaching: [
    ...runtimeCaching,
    {
      urlPattern: /\.(?:ts|m3u8)$/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^\/admin\/.*$/,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^\/api\/.*$/,
      handler: 'NetworkOnly',
    },
  ],
  register: true,
  skipWaiting: true,
  disableDevLogs: true,
  publicExcludes: ['!img/platformlogos/**/*', '!styles/admin/**/*'],
  buildExcludes: [/chunks\/pages\/admin.*/, '!**/admin/**/*'],
  sourcemap: process.env.NODE_ENV === 'development',
  disable: process.env.NODE_ENV === 'development',
});

const port = 9008;

async function rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: `http://localhost:${port}/api/:path*`, // Proxy to Backend to work around CORS.
    },
    {
      source: '/hls/:path*',
      destination: `http://localhost:${port}/hls/:path*`, // Proxy to Backend to work around CORS.
    },
    {
      source: '/img/:path*',
      destination: `http://localhost:${port}/img/:path*`, // Proxy to Backend to work around CORS.
    },
    {
      source: '/logo',
      destination: `http://localhost:${port}/logo`, // Proxy to Backend to work around CORS.
    },
    {
      source: '/thumbnail.jpg',
      destination: `http://localhost:${port}/thumbnail.jpg`, // Proxy to Backend to work around CORS.
    },
    {
      source: '/customjavascript',
      destination: `http://localhost:${port}/customjavascript`, // Proxy to Backend to work around CORS.
    },
  ];
}

module.exports = async phase => {
  /**
   * @type {import('next').NextConfig}
   */
  let nextConfig = withPWA(
    withBundleAnalyzer(
      withLess({
        productionBrowserSourceMaps: process.env.SOURCE_MAPS === 'true',
        trailingSlash: true,
        reactStrictMode: true,
        images: {
          unoptimized: true,
        },
        swcMinify: true,
        transpilePackages: [
          'antd',
          '@ant-design',
          'rc-util',
          'rc-pagination',
          'rc-picker',
          'rc-notification',
          'rc-tooltip',
          'rc-tree',
          'rc-table',
        ],
        webpack(config) {
          config.module.rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            use: ['@svgr/webpack'],
          });

          return config;
        },
        pageExtensions: ['tsx'],
      }),
    ),
  );

  if (phase === PHASE_DEVELOPMENT_SERVER) {
    nextConfig = {
      ...nextConfig,
      rewrites,
      poweredByHeader: false,
      serverRuntimeConfig: {
        trustProxy: true,
      },
    };
  } else {
    nextConfig = {
      ...nextConfig,
      output: 'export',
    };
  }
  return nextConfig;
};
