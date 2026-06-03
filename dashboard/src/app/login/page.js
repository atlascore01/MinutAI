"use client";

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [area, setArea] = useState('IT');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="login-wrapper">
      <div style={{ maxWidth: '350px', width: '100%', padding: '1.5rem' }} className="card">
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <img src="/logo%20(2).png" alt="MinutAI Logo" style={{ height: '90px', objectFit: 'contain' }} />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          Iniciar Sesión
        </h2>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: '0.8rem' }}>
            <label style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>Usuario</label>
            <input 
              type="text" 
              className="input" 
              style={{ padding: '0.6rem', fontSize: '0.95rem' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>Contraseña</label>
            <input 
              type="password" 
              className="input" 
              style={{ padding: '0.6rem', fontSize: '0.95rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', fontSize: '1rem' }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
