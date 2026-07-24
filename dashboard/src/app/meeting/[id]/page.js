"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Users, Briefcase, MapPin, Copy, Mail, AlertTriangle, CheckCircle, Target, BookOpen, Download, FileText, File } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { HEADER_LOGO_BASE64, SIGNATURE_LOGO_BASE64 } from '../../../utils/logos';

export default function MeetingPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  
  const contentRef = useRef(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = localStorage.getItem('minutai_token');
    fetch(`${apiUrl}/api/minutes/${id}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    })
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
    } else if (type === 'pdf') {
      executePdf();
    } else if (type === 'docx') {
      executeDocx();
    }
  };

  const getGenericStyleHTML = (isPdf = false) => {
    const headerHTML = `
      <table width="100%" border="0" cellspacing="0" cellpadding="12" style="margin-bottom: 20px;">
        <tr bgcolor="#ffffff">
          <td style="border-bottom: 2px solid #ccc;">
            <h2 style="margin: 0; color: #333; font-family: Arial, sans-serif;">Minuta de Reunión</h2>
          </td>
        </tr>
      </table>
    `;

    const footerHTML = (pageNum) => `
      <div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: flex-end; font-family: Arial, sans-serif; font-size: 11px; color: #666;">
        <span>Página ${pageNum}</span>
      </div>
    `;

    const sectionHeaderHTML = (title) => `
      <br/>
      <table width="100%" border="0" cellspacing="0" cellpadding="8" style="margin-bottom: 12px;">
        <tr bgcolor="#f0f0f0">
          <td style="border-left: 4px solid #666;">
            <h3 style="color: #333; margin: 0; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif; text-transform: uppercase;">${title}</h3>
          </td>
        </tr>
      </table>
    `;

    const infoTableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 14px;">
        <tr style="border-bottom: 1px solid #ccc;">
          <td bgcolor="#f9f9f9" style="color: #333; font-weight: bold; padding: 10px; width: 25%; border: 1px solid #ddd;">Fecha</td>
          <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${meeting.date}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ccc;">
          <td bgcolor="#f9f9f9" style="color: #333; font-weight: bold; padding: 10px; border: 1px solid #ddd;">Participantes</td>
          <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${meeting.participants || 'No especificados'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ccc;">
          <td bgcolor="#f9f9f9" style="color: #333; font-weight: bold; padding: 10px; border: 1px solid #ddd;">Área / Rol</td>
          <td style="padding: 10px; border: 1px solid #ddd; color: #333;">
            ${meeting.area || 'General'} ${meeting.business_unit ? ` | ${meeting.business_unit}` : ''}
          </td>
        </tr>
        <tr>
          <td bgcolor="#f9f9f9" style="color: #333; font-weight: bold; padding: 10px; border: 1px solid #ddd;">Cliente</td>
          <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${meeting.client || 'No especificado'}</td>
        </tr>
      </table>
    `;

    const actionItemsTableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-family: Arial, sans-serif; font-size: 13px;">
        <thead>
          <tr bgcolor="#f0f0f0" style="color: #333; text-align: left;">
            <th style="padding: 10px; border: 1px solid #ddd; width: 65%;">Acciones</th>
            <th style="padding: 10px; border: 1px solid #ddd; width: 20%;">Responsable</th>
            <th style="padding: 10px; border: 1px solid #ddd; width: 15%;">Prioridad</th>
          </tr>
        </thead>
        <tbody>
          ${meeting.action_items && meeting.action_items.length > 0 ? meeting.action_items.map((a, i) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${a.action}</td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${a.owner || 'No asignado'}</td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${a.priority || 'Media'}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #666;">No hay acciones registradas.</td>
            </tr>
          `}
        </tbody>
      </table>
    `;

    if (isPdf) {
      return `
        <div style="background-color: #ffffff; color: #333; font-family: Arial, sans-serif; line-height: 1.5; font-size: 14px; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
          <style>li, p, div, ul, tr { page-break-inside: avoid; }</style>
          <div style="page-break-after: always; padding: 15mm; box-sizing: border-box; height: 296mm; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              ${headerHTML}
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #333; font-size: 22px; font-weight: bold; margin: 0 0 8px 0; text-transform: uppercase;">MINUTA DE REUNIÓN</h1>
                <h2 style="color: #666; font-size: 18px; font-weight: normal; margin: 0;">${meeting.title}</h2>
              </div>
              ${infoTableHTML}
              ${sectionHeaderHTML('Resumen Ejecutivo')}
              <p style="text-align: justify; margin-bottom: 15px; font-size: 14px; line-height: 1.6;">${meeting.summary || 'No se especificó resumen.'}</p>
              
              ${meeting.topics && meeting.topics.length > 0 ? `
                ${sectionHeaderHTML('Temas Tratados')}
                <ul style="padding-left: 20px; margin-bottom: 15px;">
                  ${meeting.topics.map(t => `<li style="margin-bottom: 6px;">${t}</li>`).join('')}
                </ul>
              ` : ''}
              
              ${meeting.decisions && meeting.decisions.length > 0 ? `
                ${sectionHeaderHTML('Decisiones')}
                <ul style="padding-left: 20px; margin-bottom: 15px;">
                  ${meeting.decisions.map(d => `<li style="margin-bottom: 6px;">${d}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
            ${footerHTML(1)}
          </div>
          <div style="padding: 15mm; box-sizing: border-box; height: 296mm; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              ${headerHTML}
              ${meeting.risks && meeting.risks.length > 0 ? `
                ${sectionHeaderHTML('Riesgos')}
                <ul style="padding-left: 20px; margin-bottom: 20px;">
                  ${meeting.risks.map(r => `<li style="margin-bottom: 6px;">${r}</li>`).join('')}
                </ul>
              ` : ''}
              ${meeting.custom_notes ? `
                ${sectionHeaderHTML('Notas y Comentarios Extra')}
                <p style="text-align: justify; margin-bottom: 20px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${meeting.custom_notes}</p>
              ` : ''}
              ${sectionHeaderHTML('Plan de Acción')}
              ${actionItemsTableHTML}
            </div>
            ${footerHTML(2)}
          </div>
        </div>
      `;
    } else {
      return `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          ${headerHTML}
          <p><strong>Estimados,</strong></p>
          <p>A continuación compartimos la minuta correspondiente a la reunión del día <strong>${meeting.date}</strong>.</p>
          <br/>
          ${infoTableHTML}
          ${sectionHeaderHTML('Resumen Ejecutivo')}
          <p style="text-align: justify; margin-bottom: 15px;">${meeting.summary}</p>
          
          ${sectionHeaderHTML('Temas Tratados')}
          <ul style="padding-left: 20px; margin-bottom: 15px;">
            ${meeting.topics ? meeting.topics.map(t => `<li style="margin-bottom: 8px;">${t}</li>`).join('') : '<li>No hay temas específicos.</li>'}
          </ul>
          
          ${sectionHeaderHTML('Plan de Acción')}
          ${actionItemsTableHTML}

          ${meeting.custom_notes ? `
          ${sectionHeaderHTML('Notas y Comentarios Extra')}
          <p style="white-space: pre-wrap;">${meeting.custom_notes}</p>
          ` : ''}
        </div>
      `;
    }
  };

  const getItStyleHTML = (name, isPdf = false) => {
    const areaColor = '#0b3a42'; // Dark teal used in the design
    const headerHTML = `
      <table width="100%" border="0" cellspacing="0" cellpadding="12" style="margin-bottom: 20px;">
        <tr bgcolor="#0b3a42">
          <td style="border-bottom: 3px solid #207268;">
            <img src="${HEADER_LOGO_BASE64}" alt="Atlascore Logo" width="160" height="32" style="display: block;" />
          </td>
        </tr>
      </table>
    `;

    const footerHTML = (pageNum) => `
      <div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: flex-end; font-family: Arial, sans-serif; font-size: 11px; color: #666;">
        <span>Atlascore - Minuta | Página ${pageNum}</span>
      </div>
    `;

    const sectionHeaderHTML = (title) => `
      <br/>
      <table width="100%" border="0" cellspacing="0" cellpadding="8" style="margin-bottom: 12px;">
        <tr bgcolor="#e9f7f5">
          <td style="border: 1px solid #a3dacf;">
            <h3 style="color: #1d6d63; margin: 0; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">${title}</h3>
          </td>
        </tr>
      </table>
    `;

    // 1. Metadata Info Table
    const infoTableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 14px;">
        <tr style="border-bottom: 1px solid #ccc;">
          <td bgcolor="#0b3a42" style="color: white; font-weight: bold; padding: 10px; width: 25%; border: 1px solid #ccc;">Fecha</td>
          <td style="padding: 10px; border: 1px solid #ccc; background-color: #ffffff; color: #333;">${meeting.date}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ccc;">
          <td bgcolor="#0b3a42" style="color: white; font-weight: bold; padding: 10px; border: 1px solid #ccc;">Participantes</td>
          <td style="padding: 10px; border: 1px solid #ccc; background-color: #ffffff; color: #333;">${meeting.participants || 'No especificados'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ccc;">
          <td bgcolor="#0b3a42" style="color: white; font-weight: bold; padding: 10px; border: 1px solid #ccc;">Área</td>
          <td style="padding: 10px; border: 1px solid #ccc; background-color: #ffffff; color: #333;">
            ${meeting.area || 'IT'} ${meeting.business_unit ? ` | ${meeting.business_unit}` : ''}
          </td>
        </tr>
        <tr>
          <td bgcolor="#0b3a42" style="color: white; font-weight: bold; padding: 10px; border: 1px solid #ccc;">Cliente</td>
          <td style="padding: 10px; border: 1px solid #ccc; background-color: #ffffff; color: #333;">${meeting.client || 'No especificado'}</td>
        </tr>
      </table>
    `;

    // 2. Action Items Table for PDF
    const actionItemsTableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-family: Arial, sans-serif; font-size: 13px;">
        <thead>
          <tr bgcolor="#0b3a42" style="color: white; text-align: left;">
            <th style="padding: 10px; border: 1px solid #ccc; width: 65%;">Acciones</th>
            <th style="padding: 10px; border: 1px solid #ccc; width: 20%;">Responsable</th>
            <th style="padding: 10px; border: 1px solid #ccc; width: 15%;">Prioridad</th>
          </tr>
        </thead>
        <tbody>
          ${meeting.action_items && meeting.action_items.length > 0 ? meeting.action_items.map((a, i) => `
            <tr bgcolor="${i % 2 === 0 ? '#ffffff' : '#f9f9f9'}">
              <td style="padding: 10px; border: 1px solid #ccc; color: #333;">${a.action}</td>
              <td style="padding: 10px; border: 1px solid #ccc; color: #333; font-weight: 500;">${a.owner || 'No asignado'}</td>
              <td style="padding: 10px; border: 1px solid #ccc; color: #333; font-weight: 500;">${a.priority || 'Media'}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="3" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay acciones registradas.</td>
            </tr>
          `}
        </tbody>
      </table>
    `;

    const signatureBlockHTML = `
      <br/>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; max-width: 600px;">
        <tr>
          <td width="140" align="center" valign="middle">
            <img src="${SIGNATURE_LOGO_BASE64}" alt="Atlascore Logo" width="110" height="110" style="display: block;" />
          </td>
          <td width="20" align="center" valign="middle">
            <div style="border-left: 2px solid #0b3a42; height: 95px;"></div>
          </td>
          <td valign="middle" style="font-size: 12px; color: #333; line-height: 1.5; text-align: left;">
            <p style="margin: 0; font-weight: bold; font-size: 13px; color: #0b3a42; text-transform: uppercase;">ATLASCORE IT SERVICES S.A.S.</p>
            <p style="margin: 2px 0;">CUIT: 30-71905817-1</p>
            <p style="margin: 2px 0;">Matrícula: 44300-A</p>
            <p style="margin: 2px 0;">Domicilio legal: Córdoba, Argentina</p>
            <p style="margin: 2px 0;">contacto@atlascore.com.ar</p>
            <p style="margin: 2px 0; font-weight: bold;"><a href="https://www.atlascore.com.ar" style="color: #207268; text-decoration: none;">www.atlascore.com.ar</a></p>
          </td>
        </tr>
      </table>
    `;

    if (isPdf) {
      return `
        <div style="background-color: #f4f6f8; color: #333; font-family: Arial, sans-serif; line-height: 1.5; font-size: 14px; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
          <style>
            li, p, div, ul, tr { page-break-inside: avoid; }
          </style>
          
          <!-- PAGE 1 -->
          <div style="page-break-after: always; padding: 15mm; box-sizing: border-box; height: 296mm; display: flex; flex-direction: column; justify-content: space-between; background-color: #f4f6f8;">
            <div>
              ${headerHTML}
              
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #0b3a42; font-size: 22px; font-weight: bold; margin: 0 0 8px 0; font-family: Arial, sans-serif; letter-spacing: 0.5px; text-transform: uppercase;">MINUTA DE REUNIÓN</h1>
                <h2 style="color: #0b3a42; font-size: 18px; font-weight: normal; margin: 0; font-family: Arial, sans-serif;">${meeting.title}</h2>
              </div>
              
              ${infoTableHTML}
              
              ${sectionHeaderHTML('Resumen Ejecutivo')}
              <p style="text-align: justify; margin-bottom: 15px; font-size: 14px; color: #333; line-height: 1.6;">
                ${meeting.summary || 'No se especificó resumen.'}
              </p>
              
              ${meeting.topics && meeting.topics.length > 0 ? `
                ${sectionHeaderHTML('Temas Tratados')}
                <ul style="padding-left: 20px; margin-bottom: 15px;">
                  ${meeting.topics.map(t => `<li style="margin-bottom: 6px; color: #333;">${t}</li>`).join('')}
                </ul>
              ` : ''}
              
              ${meeting.decisions && meeting.decisions.length > 0 ? `
                ${sectionHeaderHTML('Decisiones')}
                <ul style="padding-left: 20px; margin-bottom: 15px;">
                  ${meeting.decisions.map(d => `<li style="margin-bottom: 6px; color: #333;">${d}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
            
            ${footerHTML(1)}
          </div>
          
          <!-- PAGE 2 -->
          <div style="padding: 15mm; box-sizing: border-box; height: 296mm; display: flex; flex-direction: column; justify-content: space-between; background-color: #f4f6f8;">
            <div>
              ${headerHTML}
              
              ${meeting.risks && meeting.risks.length > 0 ? `
                ${sectionHeaderHTML('Riesgos')}
                <ul style="padding-left: 20px; margin-bottom: 20px;">
                  ${meeting.risks.map(r => `<li style="margin-bottom: 6px; color: #333;">${r}</li>`).join('')}
                </ul>
              ` : ''}
              
              ${meeting.custom_notes ? `
                ${sectionHeaderHTML('Notas y Comentarios Extra')}
                <p style="text-align: justify; margin-bottom: 20px; font-size: 14px; color: #333; line-height: 1.6; white-space: pre-wrap;">${meeting.custom_notes}</p>
              ` : ''}
              
              <div style="text-align: center; margin-top: 20px; margin-bottom: 15px;">
                <h2 style="color: #0b3a42; font-size: 20px; font-weight: bold; margin: 0; font-family: Arial, sans-serif; letter-spacing: 0.5px;">Plan de Acción</h2>
              </div>
              
              ${actionItemsTableHTML}
              
              ${signatureBlockHTML}
            </div>
            
            ${footerHTML(2)}
          </div>
          
        </div>
      `;
    } else {
      return `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f4f6f8; border-radius: 8px;">
          ${headerHTML}
          
          <p><strong>Estimados, ¿Cómo se encuentran? ¡Esperamos que muy bien!</strong></p>
          <p>Ante todo, les agradecemos el tiempo que nos brindaron en la reunión del día <strong>${meeting.date}</strong>. A continuación les compartimos una breve minuta de lo conversado y sus próximos accionables.</p>
          
          <div style="border: 1px solid #ccc; padding: 10px; margin: 20px 0; background-color: #ffffff; border-radius: 4px;">
            <strong>Nota:</strong> Por favor siéntanse libres de agregar / modificar cualquier punto en pos de estar 100% sincronizados.
          </div>

          <br/>
          <table width="100%" border="0" cellspacing="0" cellpadding="8" style="margin-bottom: 10px;">
            <tr bgcolor="#0b3a42">
              <td><b style="color: white;">Participantes</b></td>
            </tr>
          </table>
          <ul style="padding-left: 20px; margin-bottom: 20px;">
            ${meeting.client && meeting.client !== 'No especificado en la reunión.' ? `<li><strong>${meeting.client}</strong> [CLIENTE]</li>` : ''}
            ${meeting.participants ? meeting.participants.split(',').map(p => `<li>${p.trim()}</li>`).join('') : ''}
          </ul>

          <br/>
          <table width="100%" border="0" cellspacing="0" cellpadding="8" style="margin-bottom: 10px;">
            <tr bgcolor="#0b3a42">
              <td><b style="color: white;">Temas tratados</b></td>
            </tr>
          </table>
          <ul style="padding-left: 20px; margin-bottom: 20px;">
            ${meeting.topics ? meeting.topics.map(t => `<li style="margin-bottom: 8px;">${t}</li>`).join('') : '<li>No hay temas específicos.</li>'}
          </ul>

          <br/>
          <table width="100%" border="0" cellspacing="0" cellpadding="8" style="margin-bottom: 10px;">
            <tr bgcolor="#0b3a42">
              <td><b style="color: white;">Próximos accionables</b></td>
            </tr>
          </table>
          <ul style="list-style-type: none; padding-left: 0; margin-bottom: 20px;">
            ${meeting.action_items && meeting.action_items.length > 0 ? meeting.action_items.map(a => `
              <li style="margin-bottom: 15px; border-left: 3px solid #207268; padding-left: 10px;">
                <strong>${a.action}</strong>
                <ul style="list-style-type: circle; margin-top: 5px; padding-left: 20px;">
                  <li>¿Quién? <strong>${a.owner}</strong></li>
                  <li>¿Cuándo? ${a.due_date}</li>
                </ul>
              </li>
            `).join('') : '<li>No hay próximos pasos registrados.</li>'}
          </ul>

          ${meeting.custom_notes ? `
          <br/>
          <table width="100%" border="0" cellspacing="0" cellpadding="8" style="margin-bottom: 10px;">
            <tr bgcolor="#0b3a42">
              <td><b style="color: white;">Notas y Comentarios Extra</b></td>
            </tr>
          </table>
          <p style="white-space: pre-wrap;">${meeting.custom_notes}</p>
          ` : ''}

          <p style="margin-top: 30px;">Desde ya quedamos atentos y agradecidos del feedback que nos puedan dar al respecto. Ante cualquier consulta o comentario, estamos a disposición.</p>

          <br/>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px;">
            <tr>
              <td width="60" align="center" valign="middle">
                <img src="${SIGNATURE_LOGO_BASE64}" alt="Atlascore Logo" width="50" height="50" style="display: block;" />
              </td>
              <td width="20" align="center" valign="middle">
                <div style="border-left: 2px solid #0b3a42; height: 40px;"></div>
              </td>
              <td valign="middle">
                <p style="margin: 0; font-weight: bold; font-size: 14px; color: #0b3a42;">${name}</p>
                <p style="margin: 2px 0; font-size: 12px; color: #666;">| Atlascore | <a href="https://www.atlascore.com.ar" style="color: #207268; text-decoration: none;">www.atlascore.com.ar</a></p>
              </td>
            </tr>
          </table>
        </div>
      `;
    }
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
    const isAtlascoreStyle = meeting?.style?.includes('Atlascore');
    
    if (isAtlascoreStyle) {
      const html = getItStyleHTML(user?.full_name || '', false);
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([getStandardText()], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
      navigator.clipboard.write(data).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
      return;
    } else {
      const html = getGenericStyleHTML(false);
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([getStandardText()], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
      navigator.clipboard.write(data).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
      return;
    }
  };

  const executeDocx = async () => {
    if (!meeting) return;
    const isAtlascoreStyle = meeting?.style?.includes('Atlascore');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('minutai_token');
      
      const response = await fetch(`${apiUrl}/api/export/docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ meeting, userName: user?.full_name || '', isAtlascoreStyle })
      });

      if (!response.ok) {
        throw new Error('Error en el servidor al generar DOCX');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Minuta_${meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Error al generar el documento Word. Por favor intente nuevamente.');
    }
  };

  const executePdf = async () => {
    if (typeof window !== 'undefined') {
      const html2pdf = (await import('html2pdf.js')).default;
      
      let element;
      let opt = {
        margin:       0,
        filename:     `Minuta_${meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const isAtlascoreStyle = meeting?.style?.includes('Atlascore');

      if (isAtlascoreStyle) {
        element = document.createElement('div');
        element.innerHTML = getItStyleHTML(user?.full_name || '', true);
      } else {
        element = document.createElement('div');
        element.innerHTML = getGenericStyleHTML(true);
      }

      html2pdf().set(opt).from(element).save();
    }
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
            <FileText size={18} /> PDF
          </button>
          <button onClick={() => handleAction('docx')} className="btn btn-primary" style={{ backgroundColor: areaColor, color: getTextColor(meeting.area) }}>
            <File size={18} /> DOCX
          </button>
        </div>
      </div>

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
