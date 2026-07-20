import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  /**
   * i18n country-based routing.
   * Each slug maps to a URL prefix:
   *   example.com/us  → United States
   *   example.com/in  → India
   *   example.com/eu  → Europe
   *   example.com/uk  → United Kingdom
   *   ... etc.
   * 'default' is the locale for Global (no country prefix).
   */
  i18n: {
    locales: ['default', 'us', 'in', 'eu', 'uk', 'au', 'ca', 'de', 'fr', 'jp', 'br'],
    defaultLocale: 'default',
    localeDetection: false,
  },
};

export default nextConfig;
