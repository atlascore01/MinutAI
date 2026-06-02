"use client";

import { AuthProvider, useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { Bot, LogOut } from 'lucide-react';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <Link href="/" className="logo">
        <Bot size={28} color="var(--accent-color)" />
        <span>MinutAI</span>
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
  return (
    <AuthProvider>
      <Navbar />
      <main className="container">
        {children}
      </main>
    </AuthProvider>
  );
}
