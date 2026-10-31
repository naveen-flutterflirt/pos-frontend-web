/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@bizbox/ui', '@bizbox/pos-core'],
  reactStrictMode: true,
};

module.exports = nextConfig;

