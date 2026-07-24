import './globals.css';
import ClientWrapper from '../components/ClientWrapper';

export const metadata = {
  title: 'MinutAI',
  description: 'Generador Automático de Minutas Corporativas',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'MinutAI',
    description: 'Generador Automático de Minutas Corporativas',
    images: [
      {
        url: '/atlascore_firma.png',
        width: 400,
        height: 400,
        alt: 'MinutAI',
      },
    ],
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
