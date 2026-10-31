/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@bizbox/ui', '@bizbox/pos-core', '@bizbox/offline'],
  reactStrictMode: true,
};

module.exports = nextConfig;

