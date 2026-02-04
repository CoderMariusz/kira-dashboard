import type { MetadataRoute } from 'next';

/**
 * PWA Web App Manifest (Next.js metadata route).
 *
 * Generates `/manifest.webmanifest` with app metadata, icons, and display config.
 * Required for PWA installability (Lighthouse PWA audit).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/Manifest
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kira Family Dashboard',
    short_name: 'Kira Dashboard',
    description: 'Family task and shopping management with AI assistant',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3B82F6',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
