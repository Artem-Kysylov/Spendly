const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: false, // Отключаем авто-регистрацию
  skipWaiting: true,
  swSrc: 'service-worker.js', // кастомный источник воркера
})

const withNextIntl = require('next-intl/plugin')('./src/i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Простая конфигурация для стабильности
}

module.exports = withPWA(withNextIntl(nextConfig))
