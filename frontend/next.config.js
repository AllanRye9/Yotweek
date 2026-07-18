/** @type {import('next').NextConfig} */
const { withIntlayerSync } = require("next-intlayer/server");

const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

module.exports = withIntlayerSync(nextConfig);
