"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Lock, Upload, Save, CheckCircle, AlertTriangle, Camera } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPreviewUrl(user.profile_picture_url || '');
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  if (!user) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Cargando perfil...</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (password && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('minutai_token');
      
      // Handle picture upload if any
      let uploadedUrl = user.profile_picture_url;
      if (profilePic) {
        const formData = new FormData();
        formData.append('file', profilePic);
        
        const uploadRes = await fetch(`${apiUrl}/api/upload_avatar`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Error al subir imagen');
        uploadedUrl = uploadData.url;
      }

      const res = await fetch(`${apiUrl}/api/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          full_name: fullName,
          profile_picture_url: uploadedUrl,
          password: password || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update auth context with new token
      if (data.token && data.user) {
        updateUser(data.token, data.user);
      }

      setSuccess('Perfil actualizado correctamente.');
      setPassword('');
      setConfirmPassword('');
      setProfilePic(null);
      
    } catch (err) {
      setError(err.message || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />
        <div 
          onClick={() => fileInputRef.current.click()}
          style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            background: 'var(--accent-color)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 'bold', overflow: 'hidden',
            cursor: 'pointer', position: 'relative'
          }}
          title="Cambiar foto de perfil"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (user.full_name || user.username).charAt(0).toUpperCase()
          )}
          <div style={{ position: 'absolute', bottom: 0, background: 'rgba(0,0,0,0.5)', width: '100%', height: '30%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Camera size={14} color="#fff" />
          </div>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Mi Perfil</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>@{user.username} | {user.area}</p>
        </div>
      </div>

      {!user.password_changed && (
        <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertTriangle color="#eab308" />
          <div>
            <h4 style={{ margin: 0, color: '#eab308' }}>Cambio de Contraseña Obligatorio</h4>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Estás utilizando una contraseña provisional. Debes cambiarla para evitar que tu cuenta sea suspendida a las 48hs de su creación.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={18} /> {success}</div>}

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre Completo</label>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="textarea" 
              style={{ minHeight: 'auto', paddingLeft: '2.5rem' }}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Nicolas France"
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nueva Contraseña (Opcional)</label>
          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              className="textarea" 
              style={{ minHeight: 'auto', paddingLeft: '2.5rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Escribe tu nueva contraseña"
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              className="textarea" 
              style={{ minHeight: 'auto', paddingLeft: '2.5rem' }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirma tu nueva contraseña"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
        </button>
      </form>
    </div>
  );
}
