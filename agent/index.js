require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { processMeetingContent } = require('./ai');
const pdfParse = require('pdf-parse');

const app = express();
const port = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Initialize DB on start
db.initDB();

const JWT_SECRET = process.env.JWT_SECRET || 'minutai_secret_key';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {}
  }
  next();
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

    const token = jwt.sign({ id: user.id, username: user.username, area: user.area, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, area: user.area, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.use('/api/process', authMiddleware);
app.use('/api/minutes', authMiddleware);

app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, username, area, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
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
    const style = req.body.style || 'Operativo Profesional';

    if (req.file) {
      let fileText = '';
      if (req.file.mimetype === 'text/plain') {
        fileText = req.file.buffer.toString('utf-8');
      } else if (req.file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(req.file.buffer);
        fileText = pdfData.text;
      } else {
        return res.status(400).json({ error: 'Formato no soportado. Sube un TXT o PDF.' });
      }
      
      if (content) {
        content = content + '\n\n--- CONTENIDO DEL ARCHIVO ADJUNTO ---\n\n' + fileText;
      } else {
        content = fileText;
      }
    }

    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }

    const aiResult = await processMeetingContent(content, style);

    // Save to DB
    const insertMeeting = `
      INSERT INTO meetings (user_id, title, email_subject, date, participants, area, business_unit, client, objective, summary, topics, agreements, decisions, risks, raw_text, style)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id;
    `;
    const meetingValues = [
      req.user ? req.user.id : null,
      aiResult.title || 'Sin título',
      aiResult.email_subject || '',
      aiResult.date || 'No especificada',
      aiResult.participants || 'No especificados',
      aiResult.area || null,
      aiResult.business_unit || null,
      aiResult.client || null,
      aiResult.objective || null,
      aiResult.summary || '',
      JSON.stringify(aiResult.topics || []),
      JSON.stringify(aiResult.agreements || []),
      JSON.stringify(aiResult.decisions || []),
      JSON.stringify(aiResult.risks || []),
      content,
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

    res.json({ id: meetingId, ...aiResult });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

app.get('/api/minutes', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM meetings ORDER BY created_at DESC');
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

app.listen(port, () => {
  console.log(`Agent API running on port ${port}`);
});
