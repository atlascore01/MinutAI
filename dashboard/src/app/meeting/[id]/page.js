"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Users, Briefcase, MapPin, Copy, Mail, AlertTriangle, CheckCircle, Target, BookOpen } from 'lucide-react';

export default function MeetingPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/api/minutes/${id}`)
      .then(res => res.json())
      .then(data => {
        setMeeting(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const copyToClipboard = () => {
    if (!meeting) return;
    
    const emailContent = `
Estimados,

Comparto la minuta correspondiente a la reunión realizada el día ${meeting.date}.

**Resumen:**
${meeting.summary}

**Temas Tratados:**
${meeting.topics ? meeting.topics.map(t => '- ' + t).join('\\n') : ''}

**Decisiones:**
${meeting.decisions ? meeting.decisions.map(d => '- ' + d).join('\\n') : ''}

**Próximos Pasos:**
${meeting.action_items ? meeting.action_items.map(a => '- ' + a.action + ' (Resp: ' + a.owner + ', Fecha: ' + a.due_date + ')').join('\\n') : ''}

Saludos.
`;
    navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Cargando minuta...</div>;
  if (!meeting || meeting.error) return <div style={{ textAlign: 'center', padding: '4rem' }}>Minuta no encontrada</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <span className="badge" style={{ marginBottom: '1rem', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-color)' }}>
            Estilo: {meeting.style}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={copyToClipboard} className="btn btn-primary">
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
            {copied ? '¡Copiado!' : 'Copiar para Correo'}
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="card" style={{ padding: '3rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', background: 'none', WebkitTextFillColor: 'initial', color: 'white' }}>
          {meeting.title}
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar color="var(--accent-color)" />
            <div>
              <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Fecha</p>
              <p style={{ color: 'white', fontWeight: '500' }}>{meeting.date}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users color="var(--accent-color)" />
            <div>
              <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Participantes</p>
              <p style={{ color: 'white', fontWeight: '500' }}>{meeting.participants}</p>
            </div>
          </div>
          {(meeting.area || meeting.business_unit) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Briefcase color="var(--accent-color)" />
              <div>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Área / Unidad</p>
                <p style={{ color: 'white', fontWeight: '500' }}>{meeting.area} {meeting.business_unit ? `| ${meeting.business_unit}` : ''}</p>
              </div>
            </div>
          )}
          {meeting.client && meeting.client !== 'No especificado en la reunión.' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MapPin color="var(--accent-color)" />
              <div>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Cliente</p>
                <p style={{ color: 'white', fontWeight: '500' }}>{meeting.client}</p>
              </div>
            </div>
          )}
        </div>

        {/* Resumen Ejecutivo */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)' }}>
            <Target size={24} /> Resumen Ejecutivo
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#e2e8f0', lineHeight: '1.8' }}>
            {meeting.summary}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
          
          {/* Temas Tratados */}
          {meeting.topics && meeting.topics.length > 0 && (
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.2rem' }}>
                <BookOpen size={20} color="var(--accent-color)" /> Temas Tratados
              </h3>
              <ul style={{ listStylePosition: 'inside', color: 'var(--text-secondary)' }}>
                {meeting.topics.map((t, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Decisiones */}
          {meeting.decisions && meeting.decisions.length > 0 && (
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.2rem' }}>
                <CheckCircle size={20} color="var(--success)" /> Decisiones Tomadas
              </h3>
              <ul style={{ listStylePosition: 'inside', color: 'var(--text-secondary)' }}>
                {meeting.decisions.map((d, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>{d}</li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Riesgos */}
        {meeting.risks && meeting.risks.length > 0 && (
          <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--danger)' }}>
              <AlertTriangle size={20} /> Riesgos y Bloqueos
            </h3>
            <ul style={{ listStylePosition: 'inside', color: 'var(--danger)' }}>
              {meeting.risks.map((r, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>{r}</li>
              ))}
            </ul>
          </div>
        )}

      </div>

      {/* Action Items Table */}
      {meeting.action_items && meeting.action_items.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>Próximos Pasos (Acciones)</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Responsable</th>
                  <th>Fecha</th>
                  <th>Prioridad</th>
                </tr>
              </thead>
              <tbody>
                {meeting.action_items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ color: 'white', fontWeight: '500' }}>{item.action}</td>
                    <td>{item.owner}</td>
                    <td>{item.due_date}</td>
                    <td>
                      <span className={`badge ${item.priority?.toLowerCase() === 'alta' ? 'high' : item.priority?.toLowerCase() === 'media' ? 'medium' : 'low'}`}>
                        {item.priority || 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
    </div>
  );
}
