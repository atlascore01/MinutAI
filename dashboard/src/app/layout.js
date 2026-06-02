import './globals.css';
import ClientWrapper from '../components/ClientWrapper';

export const metadata = {
  title: 'MinutAI',
  description: 'Generador Automático de Minutas Corporativas',
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
