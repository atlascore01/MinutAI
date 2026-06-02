import './globals.css';
import Link from 'next/link';
import { Bot } from 'lucide-react';

export const metadata = {
  title: 'MinutAI',
  description: 'Generador Automático de Minutas Corporativas',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <header className="header">
          <Link href="/" className="logo">
            <Bot size={28} color="var(--accent-color)" />
            <span>MinutAI</span>
          </Link>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/" className="btn btn-secondary">
              Historial
            </Link>
            <Link href="/upload" className="btn btn-primary">
              Nueva Minuta
            </Link>
          </nav>
        </header>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
