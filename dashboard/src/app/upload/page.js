"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, Settings, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [style, setStyle] = useState('Estilo Algeiba IT');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !text.trim()) return;

    setLoading(true);

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (text.trim()) {
      formData.append('text', text);
    }
    if (additionalNotes.trim()) {
      formData.append('additionalNotes', additionalNotes);
    }
    formData.append('style', style);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('minutai_token');
      const res = await fetch(`${apiUrl}/api/process`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
      });

      if (!res.ok) {
        let errMessage = 'Hubo un error procesando la minuta.';
        try {
           const errData = await res.json();
           if (errData.error) errMessage = errData.error;
        } catch(e) {}
        throw new Error(errMessage);
      }

      const data = await res.json();
      router.push(`/meeting/${data.id}`);
    } catch (error) {
      console.error(error);
      alert(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <Sparkles size={32} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
        <h1>Generar Nueva Minuta</h1>
        <p>Sube tu transcripción, audio, documento, o pega el texto directamente. MinutAI se encargará del resto.</p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        
        <div className="input-group" style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} /> Estilo de la Minuta
          </label>
          <select 
            className="select" 
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            <option value="Estilo Algeiba IT">Estilo Algeiba IT (Formato Corporativo {user?.area || 'IT'})</option>
            <option value="Operativo Profesional">Operativo Profesional</option>
            <option value="Ejecutivo">Ejecutivo (Orientado a Gerencia)</option>
            <option value="Operativo">Operativo (Orientado a Equipos Técnicos)</option>
            <option value="RRHH">Recursos Humanos (Institucional y Claro)</option>
            <option value="Comercial">Comercial (Orientado a Clientes y Valor)</option>
          </select>
        </div>

        <div className="input-group">
          <label>
            Opciones de Entrada
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--accent-color)', marginTop: '0.3rem', fontWeight: 'normal', fontStyle: 'italic' }}>
              Tener en cuenta agregar en "Notas adicionales para minuta" la fecha de la transcripción por si la minuta no tiene esa info.
            </span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            
            {/* Opción 1: Archivo */}
            <div 
              className={`upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleChange}
                accept=".txt,.pdf,.docx"
              />
              <UploadCloud className="upload-icon" style={{ margin: '0 auto 1rem' }} />
              {file ? (
                <div>
                  <h4 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem' }}>Archivo seleccionado:</h4>
                  <p>{file.name}</p>
                </div>
              ) : (
                <div>
                  <h4>Subir Archivo</h4>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Arrastra y suelta tu archivo TXT, PDF o DOCX aquí, o haz clic para buscar.</p>
                </div>
              )}
            </div>

            {/* Opción 2: Texto Directo */}
            <div>
              <textarea 
                className="textarea" 
                placeholder="...O pega la transcripción manualmente aquí (Ingreso Manual)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ height: '100%', minHeight: '200px' }}
              ></textarea>
            </div>

          </div>
        </div>

        <div className="input-group" style={{ marginTop: '2rem' }}>
          <label>Notas adicionales para minuta</label>
          <textarea 
            className="textarea" 
            placeholder="Añade contexto extra como: detalles del cliente, fecha de la reunión, nombres mal pronunciados, etc."
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            style={{ minHeight: '100px', marginTop: '0.5rem' }}
          ></textarea>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={(!file && !text.trim()) || loading}
            style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}
          >
            {loading ? (
              <>
                <Loader2 className="spinner" size={20} />
                Procesando con IA...
              </>
            ) : (
              <>
                <FileText size={20} />
                Generar Minuta
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
