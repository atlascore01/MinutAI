"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Trash2, UserPlus, Shield, Edit, AlertTriangle, Key } from 'lucide-react';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState([]);
  const [fetching, setFetching] = useState(true);
  
  // Register form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [area, setArea] = useState('IT');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit modal states
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', full_name: '', area: '', role: '', resetPassword: '' });

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [user, loading, router]);

  const fetchUsers = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('minutai_token');
      const res = await fetch(`${apiUrl}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('minutai_token');
      const res = await fetch(`${apiUrl}/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        alert('Error al eliminar usuario');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('minutai_token');
      const res = await fetch(`${apiUrl}/api/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, password, area })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccess(`Usuario ${username} creado exitosamente.`);
      setUsername('');
      setPassword('');
      fetchUsers(); // Refresh list
    } catch (err) {
      setError(err.message || 'Error al registrar usuario');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('minutai_token');
      const res = await fetch(`${apiUrl}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Error al modificar usuario');
    }
  };

  if (loading || fetching) return <div style={{ textAlign: 'center', padding: '4rem' }}>Cargando panel de administración...</div>;

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Shield size={32} color="var(--accent-color)" />
        <h1>Gestión de Usuarios</h1>
      </div>

      <div className="admin-grid">
        
        {/* Formulario de Alta */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
            <UserPlus size={20} color="var(--accent-color)" /> Crear Nuevo Usuario
          </h2>
          
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}
          {success && <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{success}</div>}
 
          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label>Usuario</label>
              <input type="text" className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Contraseña</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Área</label>
              <select className="select" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="IT">IT</option>
                <option value="T&C">T&C</option>
                <option value="SEC">SEC</option>
                <option value="DEV">DEV</option>
                <option value="BS">BS</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Crear Usuario</button>
          </form>
        </div>

        {/* Lista de Usuarios */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 0 }}>Usuarios Registrados</h2>
            <input 
              type="text" 
              className="input" 
              placeholder="Buscar usuario..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: '200px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            />
          </div>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Área</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td style={{ fontWeight: '500', color: 'white' }}>{u.username}</td>
                    <td>{u.full_name || '-'}</td>
                    <td>{u.area}</td>
                    <td><span className={`badge ${u.role === 'ADMIN' ? 'high' : 'low'}`}>{u.role}</span></td>
                    <td>
                      {(() => {
                        if (u.password_changed) return <span className="badge high" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>Activo</span>;
                        const issued = new Date(u.pwd_issued_at || u.created_at);
                        const diffHours = (new Date() - issued) / (1000 * 60 * 60);
                        if (diffHours > 48) return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}><AlertTriangle size={12} /> Suspendido</span>;
                        return <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}><Key size={12} /> Pendiente</span>;
                      })()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => { setEditingUser(u); setEditForm({ username: u.username, full_name: u.full_name || '', area: u.area, role: u.role, resetPassword: '' }); }} style={{ color: 'var(--accent-color)', background: 'rgba(32, 114, 104, 0.1)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}>
                          <Edit size={16} />
                        </button>
                        {u.role !== 'ADMIN' && (
                          <button onClick={() => handleDelete(u.id)} style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                      {users.length === 0 ? 'No hay usuarios' : 'No se encontraron usuarios coincidentes'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit size={20} color="var(--accent-color)" /> Modificar Usuario
            </h3>
            <form onSubmit={handleEditSubmit}>
              <div className="input-group">
                <label>Usuario</label>
                <input type="text" className="input" value={editForm.username} onChange={(e) => setEditForm({...editForm, username: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Nombre Completo</label>
                <input type="text" className="input" value={editForm.full_name} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} placeholder="Ej. Juan Perez" />
              </div>
              <div className="input-group">
                <label>Área</label>
                <select className="select" value={editForm.area} onChange={(e) => setEditForm({...editForm, area: e.target.value})}>
                  <option value="IT">IT</option>
                  <option value="T&C">T&C</option>
                  <option value="SEC">SEC</option>
                  <option value="DEV">DEV</option>
                  <option value="BS">BS</option>
                </select>
              </div>
              <div className="input-group">
                <label>Rol</label>
                <select className="select" value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              
              <div className="input-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                <label style={{ color: 'var(--danger)' }}>Resetear Contraseña Provisional (Opcional)</label>
                <input type="password" className="input" placeholder="Nueva contraseña provisional..." value={editForm.resetPassword} onChange={(e) => setEditForm({...editForm, resetPassword: e.target.value})} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Si escribes algo aquí, el usuario deberá cambiarla en 48hs o será suspendido nuevamente.</span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
