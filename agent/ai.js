const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
  "email_subject": "Asunto sugerido para el correo",
  "date": "Fecha (YYYY-MM-DD o 'No especificada')",
  "participants": "Nombres o 'No especificados'",
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
  ],
  "custom_notes": "Cualquier mensaje, solicitud especial o texto que el usuario haya pedido añadir al final de la minuta en las NOTAS ADICIONALES. Si no hay peticiones extra, déjalo vacío."
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
  } else if (style && style.startsWith('Estilo Algeiba')) {
    stylePrompt = "Estilo: Algeiba Corporativo. Lenguaje sumamente profesional, orientado a servicios corporativos. Generar un asunto de correo apropiado para envío de minuta a clientes.";
  } else {
    stylePrompt = "Estilo: Operativo Profesional.";
  }

  const prompt = `
${stylePrompt}
Analiza el siguiente contenido y extrae la información solicitada en formato JSON estricto:

CONTENIDO:
${content}
`;

  const MAX_RETRIES = 3;
  let delay = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_PROMPT,
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (error) {
      console.error(`Error in Gemini LLM (Attempt ${attempt}/${MAX_RETRIES}):`, error.message);
      if (attempt === MAX_RETRIES) {
        throw new Error('Gemini LLM Error: ' + error.message);
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // 2s, 4s, 8s...
    }
  }
}

module.exports = {
  processMeetingContent
};
