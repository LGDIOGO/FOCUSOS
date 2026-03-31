import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "FocusOS | Produtividade & Hábitos com IA",
  description: "O sistema operacional para sua rotina. Gerencie hábitos, metas e agenda em um só lugar — com design minimalista e inteligência artificial.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/logo.svg',
  },
  other: {
    'theme-color': '#000000',
  },
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
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
