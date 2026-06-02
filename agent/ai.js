const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `
Eres un Agente Autónomo de Minutas Corporativas especializado en transformar reuniones, transcripciones, notas, documentos y audios en minutas profesionales listas para compartir.

Reglas:
- No inventar información.
- No asumir participantes no mencionados.
- No generar responsables inexistentes.
- No completar fechas faltantes.
- Si falta información indicar: "No especificado en la reunión."

Tu respuesta DEBE ser estrictamente un objeto JSON con la siguiente estructura (no agregues texto markdown, solo el JSON):
{
  "title": "Nombre de la reunión",
  "date": "Fecha (YYYY-MM-DD o 'No especificado en la reunión.')",
  "participants": "Nombres o 'No especificado en la reunión.'",
  "area": "Área involucrada",
  "business_unit": "Unidad de negocio",
  "client": "Cliente (si aplica)",
  "objective": "Objetivo de la reunión",
  "summary": "Resumen ejecutivo de alto nivel (Máximo 10 líneas. ¿Qué se habló? ¿Por qué se realizó la reunión? ¿Cuál fue el resultado?)",
  "topics": ["Tema 1", "Tema 2"],
  "agreements": ["Acuerdo 1"],
  "decisions": ["Decisión 1"],
  "risks": ["Riesgo 1"],
  "action_items": [
    {
      "action": "Descripción de la acción",
      "owner": "Responsable",
      "due_date": "Fecha",
      "priority": "Alta | Media | Baja"
    }
  ]
}
`;

async function processMeetingContent(content, style = 'Operativo Profesional') {
  let stylePrompt = "";
  if (style === 'Ejecutivo') {
    stylePrompt = "Estilo: Ejecutivo. Lenguaje formal, estratégico, resumen de alto nivel.";
  } else if (style === 'Operativo') {
    stylePrompt = "Estilo: Operativo. Lenguaje preciso, detallado, accionable.";
  } else if (style === 'RRHH') {
    stylePrompt = "Estilo: RRHH. Lenguaje institucional, claro, orientado a personas.";
  } else if (style === 'Comercial') {
    stylePrompt = "Estilo: Comercial. Lenguaje profesional, consultivo, orientado a valor.";
  } else {
    stylePrompt = "Estilo: Operativo Profesional.";
  }

  const prompt = `
${stylePrompt}
Analiza el siguiente contenido y extrae la información solicitada en formato JSON estricto:

CONTENIDO:
${content}
`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const responseText = chatCompletion.choices[0]?.message?.content || '{}';
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error in Groq LLM:', error);
    throw new Error('Failed to process meeting content');
  }
}

module.exports = {
  processMeetingContent
};
