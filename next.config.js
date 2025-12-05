const withPWA = require("next-pwa")({
  dest: "public",
  disable: false,
  register: false,
  skipWaiting: true,
  swSrc: "service-worker.js",
});

const withNextIntl = require("next-intl/plugin")("./src/i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Простая конфигурация для стабильности
};

module.exports = withPWA(withNextIntl(nextConfig));
