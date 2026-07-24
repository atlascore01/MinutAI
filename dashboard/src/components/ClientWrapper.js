"use client";

import { AuthProvider, useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { LogOut, AlertTriangle, User as UserIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <>
      {user && !user.password_changed && (
        <div style={{ background: '#eab308', color: '#fff', padding: '0.5rem', textAlign: 'center', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
          <AlertTriangle size={16} /> Atención: Estás usando una contraseña provisional. Actualízala desde tu Perfil para evitar la suspensión de tu cuenta.
        </div>
      )}
      <header className="header" style={{ padding: '0.5rem 2rem' }}>
        <Link href="/" className="logo">
          <img src="/logonuevo.png" alt="Atlascore Logo" style={{ height: '55px', objectFit: 'contain' }} />
        </Link>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <>
              <Link href="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                {user.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {(user.full_name || user.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <span>Hola, {user.full_name || user.username}</span>
              </Link>
              
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
    </>
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
