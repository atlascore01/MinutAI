"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Users, Briefcase, MapPin, Copy, Mail, AlertTriangle, CheckCircle, Target, BookOpen, Download, FileText } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function MeetingPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  
  const [showNameModal, setShowNameModal] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'copy' or 'pdf'
  const [itName, setItName] = useState('');
  
  const contentRef = useRef(null);

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

  const getAreaColor = (area) => {
    switch (area) {
      case 'T&C': return '#043942';
      case 'DEV': return '#27ED7A';
      case 'SEC': return '#0088FF';
      case 'BS': return '#AD23F0';
      case 'IT': return '#C3ED05';
      default: return '#3b82f6';
    }
  };
  
  const getTextColor = (area) => {
    return (area === 'DEV' || area === 'IT') ? '#111' : '#fff';
  };

  const getLogoFile = (area) => {
    switch (area) {
      case 'T&C': return '01_Atnc_negro.png';
      case 'BS': return '03_Abs_color.png';
      case 'DEV': return '03_Adev_color.png';
      case 'SEC': return '03_Asec_color.png';
      case 'IT': return 'logo-it.png';
      default: return 'logo-it.png';
    }
  };

  const handleAction = (type) => {
    if (type === 'copy') {
      executeCopy();
      return;
    }
    if (user?.area === 'IT' || meeting?.style?.startsWith('Estilo Algeiba')) {
      setActionType(type);
      setShowNameModal(true);
    } else {
      if (type === 'pdf') executePdf();
    }
  };

  const getItStyleHTML = (name, isPdf = false) => {
    const areaColor = getAreaColor(meeting?.area);
    const areaTextColor = getTextColor(meeting?.area);

    return `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <style>
          li, p, div, ul { page-break-inside: avoid; }
        </style>
        <p><strong>Estimados, ¿Cómo se encuentran? ¡Esperamos que muy bien!</strong></p>
        <p>Ante todo, les agradecemos el tiempo que nos brindaron en la reunión del día <strong>${meeting.date}</strong>. A continuación les compartimos una breve minuta de lo conversado y sus próximos accionables.</p>
        
        <div style="border: 1px solid #ccc; padding: 10px; margin: 20px 0;">
          <strong>Nota:</strong> Por favor siéntanse libre de agregar / modificar cualquier punto en pos de estar 100% sincronizados.
        </div>

        <div style="background-color: ${areaColor}; color: ${areaTextColor}; padding: 5px 10px; margin-bottom: 10px;">
          <strong>Participantes</strong>
        </div>
        <ul style="list-style-type: none; padding-left: 20px;">
          ${meeting.client && meeting.client !== 'No especificado en la reunión.' ? `<li><strong>${meeting.client}</strong> [CLIENTE]</li>` : ''}
          ${meeting.participants ? meeting.participants.split(',').map(p => `<li>- ${p.trim()}</li>`).join('') : ''}
        </ul>

        <div style="background-color: ${areaColor}; color: ${areaTextColor}; padding: 5px 10px; margin: 20px 0 10px 0;">
          <strong>Temas tratados</strong>
        </div>
        <ul>
          ${meeting.topics ? meeting.topics.map(t => `<li style="margin-bottom: 8px;">${t}</li>`).join('') : '<li>No hay temas específicos.</li>'}
        </ul>

        <div style="background-color: ${areaColor}; color: ${areaTextColor}; padding: 5px 10px; margin: 20px 0 10px 0;">
          <strong>Próximos accionables</strong>
        </div>
        <ul style="list-style-type: none; padding-left: 0;">
          ${meeting.action_items && meeting.action_items.length > 0 ? meeting.action_items.map(a => `
            <li style="margin-bottom: 15px;">
              <strong>${a.action}</strong>
              <ul style="list-style-type: circle; margin-top: 5px;">
                <li>¿Quién? <strong>${a.owner}</strong></li>
                <li>¿Cuándo? ${a.due_date}</li>
              </ul>
            </li>
          `).join('') : '<li>No hay próximos pasos registrados.</li>'}
        </ul>

        ${meeting.custom_notes ? `
        <div style="background-color: ${areaColor}; color: ${areaTextColor}; padding: 5px 10px; margin: 20px 0 10px 0;">
          <strong>Notas y Comentarios Extra</strong>
        </div>
        <p>${meeting.custom_notes.replace(/\n/g, '<br/>')}</p>
        ` : ''}

        <p style="margin-top: 30px;">Desde ya quedamos atentos y agradecidos del feedback que nos puedan dar al respecto. Ante cualquier consulta o comentario, estamos a disposición.</p>

        ${isPdf ? `
        <div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; display: flex; align-items: center; gap: 20px;">
          <div>
            <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/${getLogoFile(meeting?.area)}" alt="Algeiba Logo" style="height: 60px; display: block;" crossorigin="anonymous" />
          </div>
          <div style="border-left: 2px solid #ccc; padding-left: 20px;">
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${name}</p>
            <p style="margin: 2px 0; font-size: 14px; color: #666;">| Algeiba | <a href="http://www.algeiba.com" style="color: ${areaColor}; text-decoration: none;">www.algeiba.com</a></p>
            <p style="margin: 2px 0; font-size: 12px; color: #666;">Phone: +54 11 39885519</p>
            <p style="margin: 2px 0; font-size: 12px; color: #666;">Address: Paraná 771. 2nd Floor. (C1017AAO). Buenos Aires. Argentina</p>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  };

  const getStandardText = () => {
    let baseText = `
Asunto sugerido: ${meeting.email_subject || meeting.title}

Estimados,

Comparto la minuta correspondiente a la reunión realizada el día ${meeting.date}.

**Resumen:**
${meeting.summary}

**Temas Tratados:**
${meeting.topics ? meeting.topics.map(t => '- ' + t).join('\n') : ''}

**Decisiones:**
${meeting.decisions ? meeting.decisions.map(d => '- ' + d).join('\n') : ''}

**Próximos Pasos:**
${meeting.action_items ? meeting.action_items.map(a => '- ' + a.action + ' (Resp: ' + a.owner + ', Fecha: ' + a.due_date + ')').join('\n') : ''}
`;
    if (meeting.custom_notes) {
      baseText += `\n**Notas y Comentarios Extra:**\n${meeting.custom_notes}\n`;
    }
    baseText += `\nSaludos.\n`;
    return baseText;
  }

  const executeCopy = () => {
    if (!meeting) return;
    
    let emailContent = '';
    if (user?.area === 'IT' || meeting?.style?.startsWith('Estilo Algeiba')) {
      const html = getItStyleHTML('', false);
      
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([getStandardText()], { type: 'text/plain' });
      const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      })];
      navigator.clipboard.write(data).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
      return;
    } else {
      emailContent = getStandardText();
      navigator.clipboard.writeText(emailContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const executePdf = async () => {
    if (typeof window !== 'undefined') {
      const html2pdf = (await import('html2pdf.js')).default;
      
      let element;
      let opt = {
        margin:       10,
        filename:     `Minuta_${meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (user?.area === 'IT' || meeting?.style?.startsWith('Estilo Algeiba')) {
        element = document.createElement('div');
        element.innerHTML = getItStyleHTML(itName, true);
      } else {
        element = contentRef.current;
        opt.html2canvas.backgroundColor = '#1a1a2e'; // dark background for dark mode theme
      }

      html2pdf().set(opt).from(element).save();
    }
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    setShowNameModal(false);
    if (actionType === 'copy') executeCopy();
    if (actionType === 'pdf') executePdf();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Cargando minuta...</div>;
  if (!meeting || meeting.error) return <div style={{ textAlign: 'center', padding: '4rem' }}>Minuta no encontrada</div>;

  const areaColor = getAreaColor(meeting.area);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header Actions */}
      <div className="header-actions">
        <div>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: areaColor }}>
            Estilo: {meeting.style}
          </span>
        </div>
        <div className="header-buttons">
          <button onClick={() => setShowResourcesModal(true)} className="btn btn-secondary" style={{ backgroundColor: 'transparent', border: '1px solid ' + areaColor, color: areaColor }}>
            <FileText size={18} /> Recursos
          </button>
          <button onClick={() => handleAction('copy')} className="btn btn-secondary">
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
            {copied ? '¡Copiado!' : 'Copiar para Correo'}
          </button>
          <button onClick={() => handleAction('pdf')} className="btn btn-primary" style={{ backgroundColor: areaColor, color: getTextColor(meeting.area) }}>
            <Download size={18} /> Descargar PDF
          </button>
        </div>
      </div>

      {showNameModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Firma de Minuta</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Por favor ingresa tu nombre completo para la firma Estilo Algeiba IT.</p>
            <form onSubmit={handleModalSubmit}>
              <input 
                type="text" 
                className="textarea" 
                style={{ minHeight: 'auto', padding: '0.8rem', marginBottom: '1.5rem' }}
                placeholder="Ej. Nicolas Daniel France"
                value={itName}
                onChange={(e) => setItName(e.target.value)}
                required
                autoFocus
              />
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNameModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: areaColor, color: getTextColor(meeting.area) }}>Continuar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResourcesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', maxHeight: '80vh', overflowY: 'auto', backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ marginBottom: '1.5rem', color: areaColor }}>Recursos y Opciones de Entrada</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <strong>Estilo Usado:</strong> {meeting.style}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong>Notas Adicionales:</strong>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                {meeting.custom_notes || 'No se agregaron notas manuales'}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong>Entrada Principal (Texto Procesado):</strong>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem' }}>
                {meeting.raw_text?.replace(/--- NOTAS ADICIONALES PARA LA MINUTA[\s\S]*--- CONTENIDO PRINCIPAL DE LA REUNIÓN ---/, '').trim() || 'Texto no disponible'}
              </div>

              {meeting.file_url && (
                <div style={{ marginTop: '1rem' }}>
                  <strong>Archivo Subido:</strong><br />
                  <a href={meeting.file_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: areaColor, color: getTextColor(meeting.area), marginTop: '0.5rem' }}>
                    <Download size={16} /> Ver / Descargar Archivo Original
                  </a>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowResourcesModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div ref={contentRef}>
      <div className="card" style={{ padding: '3rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', background: 'none', WebkitTextFillColor: 'initial', color: 'white' }}>
          {meeting.title}
        </h1>
        {meeting.email_subject && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <strong>Asunto Sugerido:</strong> {meeting.email_subject}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar color={areaColor} />
            <div>
              <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Fecha</p>
              <p style={{ color: 'white', fontWeight: '500' }}>{meeting.date}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users color={areaColor} />
            <div>
              <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Participantes</p>
              <p style={{ color: 'white', fontWeight: '500' }}>{meeting.participants}</p>
            </div>
          </div>
          {(meeting.area || meeting.business_unit) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Briefcase color={areaColor} />
              <div>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Área / Unidad</p>
                <p style={{ color: 'white', fontWeight: '500' }}>{meeting.area} {meeting.business_unit ? `| ${meeting.business_unit}` : ''}</p>
              </div>
            </div>
          )}
          {meeting.client && meeting.client !== 'No especificado en la reunión.' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MapPin color={areaColor} />
              <div>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Cliente</p>
                <p style={{ color: 'white', fontWeight: '500' }}>{meeting.client}</p>
              </div>
            </div>
          )}
        </div>

        {/* Resumen Ejecutivo */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: areaColor }}>
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
                <BookOpen size={20} color={areaColor} /> Temas Tratados
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
                <CheckCircle size={20} color={areaColor} /> Decisiones Tomadas
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

      {/* Notas y Comentarios Extra */}
      {meeting.custom_notes && (
        <div style={{ marginTop: '2rem', marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.2rem', color: areaColor }}>
            <BookOpen size={20} /> Notas y Comentarios Extra
          </h3>
          <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {meeting.custom_notes}
          </p>
        </div>
      )}

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
      
    </div>
  );
}
