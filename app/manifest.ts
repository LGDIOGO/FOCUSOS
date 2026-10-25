import type { MetadataRoute } from 'next'

// Manifest do PWA. Antes o layout apontava para /manifest.json, que não existia (404):
// o Chrome Android não oferecia instalar e o app instalado abria sem tema nem ícone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FocusOS',
    short_name: 'FocusOS',
    description: 'O sistema operacional para sua rotina: hábitos, metas e agenda.',
    // Abre direto no app; quem não estiver logado cai no login.
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'pt-BR',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
