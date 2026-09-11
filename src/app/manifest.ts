import type { MetadataRoute } from 'next'
import { APP_NAME } from '@/lib/utils'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — Fermentation Batch Manager`,
    short_name: APP_NAME,
    description: 'Track fermentation batches, gravity, additions, transfers, packaging, and tastings.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0c11',
    theme_color: '#0a0c11',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
