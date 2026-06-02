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
    
    if (isLogin) {
      try {
        await login(username, password);
      } catch (err) {
        setError(err.message || 'Error al iniciar sesión');
      }
    } else {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, area })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        // Auto login after register
        await login(username, password);
      } catch (err) {
        setError(err.message || 'Error al registrarse');
      }
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem' }} className="card">
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
      </h2>
      
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group" style={{ marginBottom: '1rem' }}>
          <label>Usuario</label>
          <input 
            type="text" 
            className="textarea" 
            style={{ minHeight: 'auto', padding: '0.8rem' }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div className="input-group" style={{ marginBottom: '1rem' }}>
          <label>Contraseña</label>
          <input 
            type="password" 
            className="textarea" 
            style={{ minHeight: 'auto', padding: '0.8rem' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {!isLogin && (
          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label>Área</label>
            <select 
              className="select" 
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              <option value="IT">IT</option>
              <option value="T&C">T&C</option>
              <option value="SEC">SEC</option>
              <option value="DEV">DEV</option>
              <option value="DATA">DATA</option>
            </select>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>
          {isLogin ? 'Ingresar' : 'Crear Cuenta'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
        <button 
          onClick={() => setIsLogin(!isLogin)}
          style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', marginLeft: '0.5rem', textDecoration: 'underline' }}
        >
          {isLogin ? 'Regístrate' : 'Inicia Sesión'}
        </button>
      </p>
    </div>
  );
}
