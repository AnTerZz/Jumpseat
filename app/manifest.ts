import type { MetadataRoute } from 'next';
import { APP_NAME } from '@/lib/constants';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Pronostique l'embarquement GP de tes collègues.",
    start_url: '/',
    display: 'standalone',
    background_color: '#0E1420',
    theme_color: '#0E1420',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
