require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
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

app.post('/api/process', upload.single('file'), async (req, res) => {
  try {
    let content = req.body.text || '';
    const style = req.body.style || 'Operativo Profesional';

    // If file is provided, extract text (simplification for txt)
    if (req.file) {
      if (req.file.mimetype === 'text/plain') {
        content = req.file.buffer.toString('utf-8');
      } else if (req.file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(req.file.buffer);
        content = pdfData.text;
      } else {
        return res.status(400).json({ error: 'Formato no soportado. Sube un TXT o PDF.' });
      }
    }

    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }

    const aiResult = await processMeetingContent(content, style);

    // Save to DB
    const insertMeeting = `
      INSERT INTO meetings (title, date, participants, area, business_unit, client, objective, summary, topics, agreements, decisions, risks, raw_text, style)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id;
    `;
    const meetingValues = [
      aiResult.title,
      aiResult.date,
      aiResult.participants,
      aiResult.area,
      aiResult.business_unit,
      aiResult.client,
      aiResult.objective,
      aiResult.summary,
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
        await db.query(insertAction, [meetingId, item.action, item.owner, item.due_date, item.priority]);
      }
    }

    res.json({ id: meetingId, ...aiResult });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/minutes', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM meetings ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
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
    res.status(500).json({ error: 'Internal server error' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Agent API running on port ${port}`);
});
