import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  // Sem maximumScale/userScalable=false: bloquear o zoom é falha de acessibilidade (WCAG 1.4.4).
  // O zoom automático do iOS ao focar campos é evitado com fonte ≥16px (globals.css).
};

export const metadata: Metadata = {
  title: "FocusOS | Produtividade & Hábitos com IA",
  description: "O sistema operacional para sua rotina. Gerencie hábitos, metas e agenda em um só lugar — com design minimalista e inteligência artificial.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FocusOS",
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    // iOS não aceita SVG no ícone da tela inicial: precisa de PNG.
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'FocusOS | Produtividade & Hábitos com IA',
    description: 'O sistema operacional para sua rotina. Design minimalista, inteligência artificial e alta performance.',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FocusOS | Produtividade & Hábitos com IA',
    description: 'O sistema operacional para sua rotina.',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
