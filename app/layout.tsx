import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Snake Tycoon Arena',
  description: 'A 3D snake-style tycoon game with resource collection, growth mechanics, and AI combat.',
  openGraph: {
    title: 'Snake Tycoon Arena',
    description: 'A 3D snake-style tycoon game with resource collection, growth mechanics, and AI combat.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snake Tycoon Arena',
    description: 'A 3D snake-style tycoon game with resource collection, growth mechanics, and AI combat.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
