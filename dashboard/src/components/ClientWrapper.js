"use client";

import { AuthProvider, useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="header" style={{ padding: '0.5rem 2rem' }}>
      <Link href="/" className="logo">
        <img src="/logo%20(2).png" alt="MinutAI Logo" style={{ height: '55px', objectFit: 'contain' }} />
      </Link>
      <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {user ? (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>
              Hola, {user.username} ({user.area})
            </span>
            <Link href="/" className="btn btn-secondary">
              Historial
            </Link>
            {user.role === 'ADMIN' && (
              <Link href="/admin" className="btn btn-secondary" style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}>
                Gestión
              </Link>
            )}
            <Link href="/upload" className="btn btn-primary">
              Nueva Minuta
            </Link>
            <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary">
            Iniciar Sesión
          </Link>
        )}
      </nav>
    </header>
  );
}

export default function ClientWrapper({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  return (
    <AuthProvider>
      {!isLogin && <Navbar />}
      <main className="container">
        {children}
      </main>
    </AuthProvider>
  );
}
