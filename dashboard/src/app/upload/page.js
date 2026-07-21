"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, Settings, Sparkles, Loader2, Mic, MicOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [style, setStyle] = useState('Estilo Algeiba');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isRecordingText, setIsRecordingText] = useState(false);
  const [isRecordingNotes, setIsRecordingNotes] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (user?.area) {
      setStyle(user.area === 'T&C' ? 'Estilo Algeiba T&C' : 'Estilo Algeiba');
    }
  }, [user]);

  const toggleRecording = (target) => {
    if ((target === 'text' && isRecordingText) || (target === 'notes' && isRecordingNotes)) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta la función de micrófono. Usa Chrome o Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      if (target === 'text') setIsRecordingText(true);
      if (target === 'notes') setIsRecordingNotes(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      
      if (finalTranscript) {
        if (target === 'text') {
          setText(prev => (prev + ' ' + finalTranscript).trim());
        } else if (target === 'notes') {
          setAdditionalNotes(prev => (prev + ' ' + finalTranscript).trim());
        }
      }
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      if (target === 'text') setIsRecordingText(false);
      if (target === 'notes') setIsRecordingNotes(false);
    };

    recognition.onend = () => {
      if (target === 'text') setIsRecordingText(false);
      if (target === 'notes') setIsRecordingNotes(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

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
            <option value={user?.area === 'T&C' ? 'Estilo Algeiba T&C' : 'Estilo Algeiba'}>
              {user?.area === 'T&C' ? 'Estilo Algeiba T&C' : 'Estilo Algeiba'} (Formato Corporativo {user?.area || 'IT'})
            </option>
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
          <div className="upload-grid">
            
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
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => toggleRecording('text')}
                  className="btn btn-secondary"
                  style={{ 
                    padding: '0.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    borderColor: isRecordingText ? 'var(--danger)' : 'var(--card-border)',
                    color: isRecordingText ? 'var(--danger)' : 'var(--text-secondary)'
                  }}
                  title={isRecordingText ? 'Detener grabación' : 'Dictar por micrófono'}
                >
                  {isRecordingText ? <><MicOff size={16} /> Grabando...</> : <><Mic size={16} /> Dictar</>}
                </button>
              </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ marginBottom: 0 }}>Notas adicionales para minuta</label>
            <button 
              type="button" 
              onClick={() => toggleRecording('notes')}
              className="btn btn-secondary"
              style={{ 
                padding: '0.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                borderColor: isRecordingNotes ? 'var(--danger)' : 'var(--card-border)',
                color: isRecordingNotes ? 'var(--danger)' : 'var(--text-secondary)'
              }}
              title={isRecordingNotes ? 'Detener grabación' : 'Dictar por micrófono'}
            >
              {isRecordingNotes ? <><MicOff size={16} /> Grabando...</> : <><Mic size={16} /> Dictar</>}
            </button>
          </div>
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
