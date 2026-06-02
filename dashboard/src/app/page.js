"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [minutes, setMinutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/api/minutes`)
      .then((res) => res.json())
      .then((data) => {
        setMinutes(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching minutes:', err);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (e, id) => {
    e.preventDefault(); // prevent Link navigation
    e.stopPropagation();
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta minuta permanentemente?')) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('minutai_token');
      const res = await fetch(`${apiUrl}/api/minutes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setMinutes(minutes.filter(m => m.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar la minuta');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Minutas Corporativas</h1>
          <p>Gestiona y revisa todas tus reuniones anteriores.</p>
        </div>
        <Link href="/upload" className="btn btn-primary">
          Crear Minuta
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p>Cargando minutas...</p>
        </div>
      ) : minutes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <FileText size={48} color="var(--text-secondary)" style={{ margin: '0 auto 1rem' }} />
          <h2>Aún no hay minutas</h2>
          <p style={{ marginBottom: '2rem' }}>Genera tu primera minuta subiendo una transcripción o audio.</p>
          <Link href="/upload" className="btn btn-primary">
            Subir Archivo
          </Link>
        </div>
      ) : (
        <div className="minutas-grid">
          {minutes.map((m) => (
            <Link href={`/meeting/${m.id}`} key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', textDecoration: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#fff' }}>{m.title}</h3>
                {(user?.role === 'ADMIN' || user?.id === m.user_id) && (
                  <button 
                    onClick={(e) => handleDelete(e, m.id)}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.4rem', borderRadius: '6px' }}
                    title="Eliminar minuta"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Calendar size={16} />
                <span>{m.date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Users size={16} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.participants}</span>
              </div>
              
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-color)', fontSize: '0.9rem', fontWeight: '600' }}>
                  Ver Detalle <ChevronRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
