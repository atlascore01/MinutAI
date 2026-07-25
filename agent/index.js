require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { processMeetingContent } = require('./ai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { put, del } = require('@vercel/blob');
const { startDiscordBot } = require('./discord_bot');
const { generateDocx } = require('./docxGenerator');

const app = express();
const port = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize DB on start
db.initDB();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const JWT_SECRET = process.env.JWT_SECRET || 'minutai_secret_key';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de Administrador' });
  }
  next();
};

app.post('/api/register', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, password, area } = req.body;
    if (!username || !password || !area) {
      return res.status(400).json({ error: 'Username, password and area are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, password, area) VALUES ($1, $2, $3) RETURNING id, username, area',
      [username, hashedPassword, area]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.password_changed) {
      const issuedAt = new Date(user.pwd_issued_at || user.created_at);
      const diffHours = (new Date() - issuedAt) / (1000 * 60 * 60);
      if (diffHours > 48) {
        return res.status(403).json({ error: 'Cuenta suspendida por seguridad. Pasaron 48hs sin cambiar la contraseña provisional. Contacte al administrador.' });
      }
    }

    const payload = { 
      id: user.id, 
      username: user.username, 
      area: user.area, 
      role: user.role,
      full_name: user.full_name,
      profile_picture_url: user.profile_picture_url,
      password_changed: user.password_changed
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: payload });
  } catch (error) {
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.use('/api/process', authMiddleware);
app.use('/api/minutes', authMiddleware);

app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, profile_picture_url, password } = req.body;
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET full_name=$1, profile_picture_url=$2, password=$3, password_changed=TRUE WHERE id=$4',
        [full_name, profile_picture_url, hashedPassword, userId]
      );
    } else {
      await db.query(
        'UPDATE users SET full_name=$1, profile_picture_url=$2 WHERE id=$3',
        [full_name, profile_picture_url, userId]
      );
    }
    
    // Fetch updated user to return new token
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    const payload = { 
      id: user.id, 
      username: user.username, 
      area: user.area, 
      role: user.role,
      full_name: user.full_name,
      profile_picture_url: user.profile_picture_url,
      password_changed: user.password_changed
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ success: true, token, user: payload });
  } catch (error) {
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.post('/api/upload_avatar', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    
    const blobOptions = {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    };
    
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobResult = await put(`avatars/${Date.now()}_${safeName}`, req.file.buffer, blobOptions);
    
    res.json({ url: blobResult.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/api/export/docx', authMiddleware, async (req, res) => {
  try {
    const { meeting, userName, isAtlascoreStyle } = req.body;
    if (!meeting) {
      return res.status(400).json({ error: 'Falta el objeto meeting' });
    }

    const docxBuffer = await generateDocx(meeting, userName, isAtlascoreStyle);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="minuta.docx"');
    res.send(docxBuffer);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    res.status(500).json({ error: 'Error generating DOCX' });
  }
});

app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, username, full_name, profile_picture_url, area, role, password_changed, pwd_issued_at, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.put('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, area, role, resetPassword } = req.body;
    
    if (resetPassword) {
      const hashedPassword = await bcrypt.hash(resetPassword, 10);
      await db.query(
        'UPDATE users SET username=$1, full_name=$2, area=$3, role=$4, password=$5, password_changed=FALSE, pwd_issued_at=CURRENT_TIMESTAMP WHERE id=$6',
        [username, full_name, area, role, hashedPassword, id]
      );
    } else {
      await db.query(
        'UPDATE users SET username=$1, full_name=$2, area=$3, role=$4 WHERE id=$5',
        [username, full_name, area, role, id]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.delete('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.post('/api/process', upload.single('file'), async (req, res) => {
  try {
    let content = req.body.text || '';
    let additionalNotes = req.body.additionalNotes || '';
    let style = req.body.style || 'Operativo Profesional';
    let fileUrl = null;

    if (req.file) {
      let fileText = '';
      if (req.file.mimetype === 'text/plain') {
        fileText = req.file.buffer.toString('utf-8');
      } else if (req.file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(req.file.buffer);
        fileText = pdfData.text;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || req.file.originalname.endsWith('.docx')) {
        const docData = await mammoth.extractRawText({ buffer: req.file.buffer });
        fileText = docData.value;
      } else {
        return res.status(400).json({ error: 'Formato no soportado. Sube un TXT, PDF o DOCX.' });
      }
      
      content = fileText + (content ? '\n\n--- INGRESO MANUAL ADICIONAL ---\n\n' + content : '');

      // Upload to Vercel Blob
      try {
        const blobOptions = {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN
        };
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const blobResult = await put(`minutas/${Date.now()}_${safeName}`, req.file.buffer, blobOptions);
        fileUrl = blobResult.url;
      } catch (blobErr) {
        console.error('Error uploading to Vercel Blob:', blobErr);
        return res.status(500).json({ error: 'Error subiendo el archivo a Vercel Blob: ' + (blobErr.message || 'Error desconocido') });
      }
    }

    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }
    
    if (additionalNotes) {
      content = '--- NOTAS ADICIONALES PARA LA MINUTA (PRIORIDAD MÁXIMA: ten esto muy en cuenta para extraer contexto, clientes, y fechas de la transcripción principal) ---\n' + additionalNotes + '\n\n--- CONTENIDO PRINCIPAL DE LA REUNIÓN ---\n\n' + content;
    }

    const aiResult = await processMeetingContent(content, style);

    // Save to DB
    const insertMeeting = `
      INSERT INTO meetings (user_id, title, email_subject, date, participants, area, business_unit, client, objective, summary, topics, agreements, decisions, risks, custom_notes, raw_text, file_url, style)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id;
    `;
    const meetingValues = [
      req.user ? req.user.id : null,
      aiResult.title || 'Sin título',
      aiResult.email_subject || '',
      aiResult.date || 'No especificada',
      aiResult.participants || 'No especificados',
      req.user ? req.user.area : (aiResult.area || null),
      aiResult.business_unit || null,
      aiResult.client || null,
      aiResult.objective || null,
      aiResult.summary || '',
      JSON.stringify(aiResult.topics || []),
      JSON.stringify(aiResult.agreements || []),
      JSON.stringify(aiResult.decisions || []),
      JSON.stringify(aiResult.risks || []),
      aiResult.custom_notes || null,
      content,
      fileUrl,
      style
    ];

    const { rows } = await db.query(insertMeeting, meetingValues);
    const meetingId = rows[0].id;

    // Save action items
    if (aiResult.action_items && aiResult.action_items.length > 0) {
      for (const item of aiResult.action_items) {
        const insertAction = `
          INSERT INTO action_items (meeting_id, action, owner, due_date, priority)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await db.query(insertAction, [meetingId, item.action || 'Acción sin definir', item.owner || 'No asignado', item.due_date || 'Sin fecha', item.priority || 'Normal']);
      }
    }

    res.json({ ...aiResult, id: meetingId });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.get('/api/minutes', authMiddleware, async (req, res) => {
  try {
    // Lazy 48h cleanup
    try {
      const oldMeetings = await db.query(`SELECT file_url FROM meetings WHERE created_at < NOW() - INTERVAL '48 hours' AND file_url IS NOT NULL`);
      if (oldMeetings.rows.length > 0) {
        const urls = oldMeetings.rows.map(r => r.file_url);
        await del(urls, { token: process.env.BLOB_READ_WRITE_TOKEN });
      }
      await db.query(`DELETE FROM meetings WHERE created_at < NOW() - INTERVAL '48 hours'`);
    } catch (cleanupErr) {
      console.error('Error during 48h cleanup:', cleanupErr);
    }

    let query = 'SELECT * FROM meetings WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC';
    let params = [req.user.id];
    
    if (req.user.role === 'ADMIN') {
      query = 'SELECT * FROM meetings ORDER BY created_at DESC';
      params = [];
    }

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.get('/api/minutes/:id', async (req, res) => {
  try {
    const meetingId = req.params.id;
    const meetingRes = await db.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
    if (meetingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    const meeting = meetingRes.rows[0];

    const actionsRes = await db.query('SELECT * FROM action_items WHERE meeting_id = $1', [meetingId]);
    meeting.action_items = actionsRes.rows;

    res.json(meeting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.delete('/api/minutes/:id', authMiddleware, async (req, res) => {
  try {
    const meetingId = req.params.id;
    const meetingRes = await db.query('SELECT user_id FROM meetings WHERE id = $1', [meetingId]);
    
    if (meetingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Check permission
    if (req.user.role !== 'ADMIN' && meetingRes.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta minuta' });
    }

    await db.query('DELETE FROM action_items WHERE meeting_id = $1', [meetingId]);
    await db.query('DELETE FROM meetings WHERE id = $1', [meetingId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.put('/api/minutes/:id', async (req, res) => {
  try {
    const meetingId = req.params.id;
    const { summary, style } = req.body;
    await db.query('UPDATE meetings SET summary = $1, style = $2 WHERE id = $3', [summary, style, meetingId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.post('/api/discord/process', async (req, res) => {
  try {
    const secret = req.headers['x-discord-secret'];
    if (!secret || secret !== process.env.DISCORD_TOKEN) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { transcript, participants } = req.body;
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcripción vacía' });
    }

    const style = 'Estilo Atlascore (Formato Corporativo IT)';
    const todayStr = new Date().toLocaleDateString('es-AR');
    const aiResult = await processMeetingContent(`Hoy es ${todayStr}. Transcripción:\n${transcript}`, style);

    let targetUserId = null;
    if (req.body.target_user) {
      const userRes = await db.query('SELECT id FROM users WHERE username = $1', [req.body.target_user]);
      if (userRes.rows.length > 0) {
        targetUserId = userRes.rows[0].id;
      }
    }

    const insertMeeting = `
      INSERT INTO meetings (user_id, title, email_subject, date, participants, area, business_unit, client, objective, summary, topics, agreements, decisions, risks, custom_notes, raw_text, style)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id;
    `;
    const meetingValues = [
      targetUserId,
      aiResult.title || 'Reunión de Discord',
      aiResult.email_subject || '',
      aiResult.date || new Date().toISOString().split('T')[0],
      participants || aiResult.participants || 'Participantes de Discord',
      aiResult.area || 'IT',
      aiResult.business_unit || null,
      aiResult.client || null,
      aiResult.objective || null,
      aiResult.summary || '',
      JSON.stringify(aiResult.topics || []),
      JSON.stringify(aiResult.agreements || []),
      JSON.stringify(aiResult.decisions || []),
      JSON.stringify(aiResult.risks || []),
      aiResult.custom_notes || null,
      transcript,
      style
    ];

    const { rows } = await db.query(insertMeeting, meetingValues);
    const meetingId = rows[0].id;

    if (aiResult.action_items && aiResult.action_items.length > 0) {
      for (const item of aiResult.action_items) {
        await db.query(
          'INSERT INTO action_items (meeting_id, action, owner, due_date, priority) VALUES ($1, $2, $3, $4, $5)',
          [meetingId, item.action || 'Acción sin definir', item.owner || 'No asignado', item.due_date || 'Sin fecha', item.priority || 'Normal']
        );
      }
    }

    res.json({
      id: meetingId,
      title: aiResult.title,
      date: aiResult.date,
      participants: aiResult.participants,
      summary: aiResult.summary,
      action_items: aiResult.action_items || []
    });

  } catch (error) {
    console.error('Error en /api/discord/process:', error);
    res.status(500).json({ error: 'Error procesando la reunión: ' + error.message });
  }
});

const keepAlive = () => {
  const url = process.env.RENDER_EXTERNAL_URL;
  if (!url) {
    console.log('No RENDER_EXTERNAL_URL environment variable found. Self-ping keep-alive skipped.');
    return;
  }
  const https = require('https');
  // Ping every 13 minutes (780000 ms) to keep the Render free instance awake
  setInterval(() => {
    https.get(`${url}/api/health`, (res) => {
      console.log(`Self-ping keep-alive status code: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('Keep-alive ping failed:', err.message);
    });
  }, 780000);
};

app.listen(port, () => {
  console.log(`Agent API running on port ${port}`);
  // startDiscordBot(); // Disabled on Render to avoid duplicate bots with the local one
  keepAlive();
});
