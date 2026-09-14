const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const AGENT_API_URL = process.env.AGENT_API_URL || 'https://minutai-7g66.onrender.com';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : '';
const PORT = 3030;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let currentDiscordChannel = null;
let currentRecorder = null;

const app = express();
const upload = multer({ dest: os.tmpdir() });

// ─────────────────────────────────────────────────────────────
// Interfaz Web de Grabación
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MinutAI - Grabadora de Reuniones</title>
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #1e1e2e; color: #cdd6f4; text-align: center; padding: 40px 20px; margin: 0; }
        h1 { color: #89b4fa; }
        .card { background: #313244; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        button { background: #a6e3a1; color: #1e1e2e; border: none; padding: 16px 32px; font-size: 1.2rem; border-radius: 8px; cursor: pointer; margin: 20px 0; font-weight: bold; transition: 0.2s; width: 100%; box-sizing: border-box; }
        button:hover { background: #94e2d5; transform: translateY(-2px); }
        button:disabled { background: #45475a; color: #7f849c; cursor: not-allowed; transform: none; }
        #stopBtn { background: #f38ba8; }
        #stopBtn:hover { background: #eba0ac; }
        .instructions { text-align: left; line-height: 1.6; margin-bottom: 20px; }
        .instructions li { margin-bottom: 10px; }
        .highlight { color: #f9e2af; font-weight: bold; }
        .hidden { display: none !important; }
        #statusText { font-size: 1.2rem; font-weight: bold; margin-top: 20px; color: #f9e2af; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🎙️ Grabadora MinutAI</h1>
        
        <div class="instructions" id="inst">
          <h3>Pasos para grabar tu reunión de Discord:</h3>
          <ol>
            <li>Hacé clic en <b>"Empezar Grabación"</b>.</li>
            <li>Si te pide permiso para usar el <b>Micrófono</b>, poné Permitir.</li>
            <li>Aparecerá una ventana de Windows para compartir pantalla. Seleccioná la pestaña <b>"Toda la pantalla"</b>.</li>
            <li>⚠️ <span class="highlight">CRÍTICO:</span> Abajo de todo, activá el interruptor que dice <b>"Compartir audio del sistema"</b>.</li>
            <li>Hacé clic en el botón Compartir.</li>
          </ol>
        </div>
        
        <button id="startBtn">🔴 Empezar Grabación</button>
        <button id="stopBtn" class="hidden">⏹️ Detener y Enviar a la IA</button>
        
        <div id="statusText">Estado: Listo para grabar</div>
      </div>

      <script>
        let mediaRecorder;
        let currentChunks = [];
        let completedBlobs = [];
        let chunkTimer = null;
        let streamsToStop = [];
        let destStream = null;

        function startSegment() {
          currentChunks = [];
          let mimeType = 'audio/webm';
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          }
          mediaRecorder = new MediaRecorder(destStream, { mimeType });
          
          mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) currentChunks.push(e.data);
          };
          
          mediaRecorder.onstop = () => {
            if (currentChunks.length > 0) {
              const blob = new Blob(currentChunks, { type: mimeType });
              if (blob.size > 1000) {
                completedBlobs.push(blob);
              }
            }
          };

          mediaRecorder.start(1000);
        }

        document.getElementById('startBtn').addEventListener('click', async () => {
          try {
            document.getElementById('statusText').innerText = 'Solicitando permisos...';
            
            // 1. Mic
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // 2. System Audio (Display)
            const sysStream = await navigator.mediaDevices.getDisplayMedia({ 
              video: { displaySurface: "monitor" }, 
              audio: true 
            });
            
            // Check if user actually shared audio
            if (sysStream.getAudioTracks().length === 0) {
              alert('❌ Error: No compartiste el audio del sistema. Volvé a intentarlo y acordate de activar "Compartir audio del sistema".');
              sysStream.getTracks().forEach(t => t.stop());
              micStream.getTracks().forEach(t => t.stop());
              document.getElementById('statusText').innerText = 'Estado: Listo para grabar';
              return;
            }

            // Mix them, con sampleRate a 16000Hz para Whisper y reducir tamaño
            const ctx = new AudioContext({ sampleRate: 16000 });
            const dest = ctx.createMediaStreamDestination();
            
            ctx.createMediaStreamSource(micStream).connect(dest);
            ctx.createMediaStreamSource(sysStream).connect(dest);
            
            streamsToStop = [micStream, sysStream];
            destStream = dest.stream;
            completedBlobs = [];

            // Iniciar primer segmento
            startSegment();

            // Rotar segmento cada 5 minutos (300.000 ms) para evitar limite de 25MB en Groq
            chunkTimer = setInterval(() => {
              if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                startSegment();
              }
            }, 5 * 60 * 1000);
            
            document.getElementById('startBtn').classList.add('hidden');
            document.getElementById('inst').classList.add('hidden');
            document.getElementById('stopBtn').classList.remove('hidden');
            document.getElementById('statusText').innerText = '🔴 Grabando... (Tu micrófono + El audio de Discord)';
            
            // Notify discord
            fetch('/notify-start', { method: 'POST' }).catch(() => {});

            // If user clicks "Stop sharing" on the native Windows floating bar
            sysStream.getVideoTracks()[0].onended = () => {
              if (mediaRecorder.state !== 'inactive') document.getElementById('stopBtn').click();
            };

          } catch (err) {
            console.error(err);
            if (err.name === 'NotAllowedError') {
              alert('❌ Cancelaste o denegaste el permiso. Tenés que permitir micrófono y pantalla.');
            } else {
              alert('Error iniciando grabación: ' + err.message);
            }
            document.getElementById('statusText').innerText = 'Estado: Error al iniciar';
          }
        });

        document.getElementById('stopBtn').addEventListener('click', async () => {
          document.getElementById('stopBtn').innerText = '⏳ Deteniendo y procesando...';
          document.getElementById('stopBtn').disabled = true;

          if (chunkTimer) clearInterval(chunkTimer);

          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
          streamsToStop.forEach(s => s.getTracks().forEach(t => t.stop()));

          // Esperar 400ms para asegurar que onstop guarde el ultimo segmento
          await new Promise(r => setTimeout(r, 400));

          document.getElementById('statusText').innerText = '⏳ Subiendo ' + completedBlobs.length + ' fragmento(s) de audio... no cierres la página.';

          const formData = new FormData();
          completedBlobs.forEach((blob, i) => {
            formData.append('audio', blob, 'part_' + (i + 1) + '.webm');
          });
          
          const urlParams = new URLSearchParams(window.location.search);
          const targetUser = urlParams.get('targetUser');
          if (targetUser) formData.append('targetUser', targetUser);
          
          try {
            const res = await fetch('/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if(result.success) {
              document.getElementById('statusText').innerText = '✅ ¡Listo! Minuta generada en Discord. Ya podés cerrar esta pestaña.';
              document.getElementById('statusText').style.color = '#a6e3a1';
            } else {
              document.getElementById('statusText').innerText = '❌ Error de la IA: ' + result.error;
              document.getElementById('statusText').style.color = '#f38ba8';
            }
          } catch (err) {
            document.getElementById('statusText').innerText = '❌ Error de conexión al servidor.';
          }
          completedBlobs = [];
        });
      </script>
    </body>
    </html>
  `);
});

app.post('/notify-start', (req, res) => {
  if (currentDiscordChannel) {
    currentDiscordChannel.send('🔴 **Grabación iniciada desde el navegador.**\nTodos los participantes y vos están siendo grabados. Para terminar, hacé clic en "Detener" en la página web.');
  }
  res.json({ok: true});
});

app.post('/upload', upload.array('audio'), async (req, res) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (files.length === 0) return res.status(400).json({error: 'No se recibió ningún audio'});
  
  const targetUser = req.body.targetUser || null;
  const now = new Date();
  const dateFormatted = now.toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 16);
  const userLabel = (targetUser || currentRecorder || 'reunion').replace(/[^a-zA-Z0-9_-]/g, '_');
  const folderPath = path.join(os.homedir(), 'MinutAI-Bot', 'transcripciones');

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const transcriptFileName = `transcripcion_${userLabel}_${dateFormatted}.txt`;
  const transcriptFilePath = path.join(folderPath, transcriptFileName);
  
  fs.writeFileSync(transcriptFilePath, `====================================================\n  TRANSCIPCIÓN DE REUNIÓN - ${now.toLocaleString('es-AR')}\n  Usuario/Grabador: ${userLabel}\n====================================================\n\n`, 'utf8');

  if (currentDiscordChannel) {
    currentDiscordChannel.send(`⏳ **Audio recibido (${files.length} fragmento${files.length > 1 ? 's' : ''}). Transcribiendo y procesando con IA...**\n*Guardando copia local en:* \`transcripciones/${transcriptFileName}\``);
  }

  try {
    let fullTranscript = '';
    for (let i = 0; i < files.length; i++) {
      if (files.length > 1 && currentDiscordChannel) {
        currentDiscordChannel.send(`⏳ Transcribiendo fragmento ${i + 1} de ${files.length}...`);
      }
      try {
        const partTranscript = await transcribeAudio(files[i].path);
        if (partTranscript && partTranscript.trim()) {
          fullTranscript += (fullTranscript ? '\n\n' : '') + partTranscript.trim();
          
          // Guardar cada fragmento en el archivo local inmediatamente
          const chunkHeader = files.length > 1 ? `--- Fragmento ${i + 1}/${files.length} ---\n` : '';
          fs.appendFileSync(transcriptFilePath, chunkHeader + partTranscript.trim() + '\n\n', 'utf8');
        }
      } catch (partErr) {
        console.error(`Error transcribiendo fragmento ${i + 1}:`, partErr.message);
        if (currentDiscordChannel && files.length > 1) {
          currentDiscordChannel.send(`⚠️ No se pudo transcribir el fragmento ${i + 1} (sin audio relevante o formato inaudible). Continuando...`);
        }
      }
    }

    if (!fullTranscript.trim()) {
      if (currentDiscordChannel) currentDiscordChannel.send('❌ No se escuchó nada en el audio o duró muy poco.');
      return res.json({success: false, error: 'Audio vacío o inaudible'});
    }

    console.log(`💾 Transcripción guardada localmente en: ${transcriptFilePath}`);

    const result = await sendToRenderAPI(`[Reunión]: "${fullTranscript}"`, currentRecorder || 'DaNi', targetUser);

    let msg = `✅ **¡Minuta generada y guardada en MinutAI!**\n\n`;
    msg += `📋 **${result.title}**\n`;
    msg += `📅 Fecha: ${result.date}\n`;
    msg += `👥 Participantes: ${result.participants}\n\n`;
    msg += `📝 **Resumen:**\n${(result.summary || '').substring(0, 600)}${(result.summary || '').length > 600 ? '...' : ''}\n`;
    if (result.action_items?.length > 0) {
      msg += `\n✅ **Acciones definidas:**\n`;
      result.action_items.slice(0, 5).forEach((item, i) => {
        msg += `${i + 1}. **${item.action}** → *${item.owner}* (${item.due_date})\n`;
      });
    }
    msg += `\n💾 *Transcripción bruta guardada en:* \`MinutAI-Bot/transcripciones/${transcriptFileName}\`\n`;
    msg += `\n*Minuta completa disponible en el dashboard de MinutAI.*`;
    
    if (currentDiscordChannel) currentDiscordChannel.send(msg);
    
    res.json({success: true});

  } catch (err) {
    console.error('Error en upload:', err);
    if (currentDiscordChannel) currentDiscordChannel.send(`❌ Error de la IA: ${err.message}`);
    res.json({success: false, error: err.message});
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🌐 Servidor Web de grabación listo en http://127.0.0.1:${PORT}`);
});

// ─────────────────────────────────────────────────────────────
// IA y APIs
// ─────────────────────────────────────────────────────────────
async function transcribeAudio(originalPath) {
  const filePath = originalPath + '.webm';
  fs.renameSync(originalPath, filePath);
  
  try {
    const stats = fs.statSync(filePath);
    console.log(`📁 Archivo WebM listo: ${(stats.size / 1024).toFixed(1)} KB`);
    if (stats.size < 10000) return '';
    
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3-turbo',
      language: 'es'
    });
    return transcription.text.trim();
  } catch (err) {
    console.error('Error transcribiendo:', err.message);
    throw new Error('Error al transcribir el audio. ' + err.message);
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
}

function sendToRenderAPI(transcript, participants, targetUser) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ transcript, participants, target_user: targetUser });
    const apiUrl = new URL('/api/discord/process', AGENT_API_URL);
    const options = {
      hostname: apiUrl.hostname,
      port: 443,
      path: apiUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-discord-secret': DISCORD_TOKEN
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(parsed.error || `Error HTTP ${res.statusCode}`));
          else resolve(parsed);
        } catch { 
          reject(new Error(`Error HTTP ${res.statusCode} - Respuesta no-JSON del servidor: ${data.substring(0, 150)}...`)); 
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout de la IA.')); });
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────
// Eventos de Discord
// ─────────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`\n🤖 MinutAI Bot listo: ${client.user.tag} → API: ${AGENT_API_URL}`);
  console.log('📢 Modo: Grabación Segura vía Navegador (¡Sin FFmpeg!)');
  console.log(`🔗 Usar: http://127.0.0.1:${PORT}\n`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const content = message.content.toLowerCase().trim();

  if (content.startsWith('!grabar') || content.startsWith('!join')) {
    const args = content.split(' ').slice(1);
    const targetUser = args.length > 0 ? args[0].trim() : '';

    currentDiscordChannel = message.channel;
    currentRecorder = message.author.username;
    
    let link = `http://127.0.0.1:${PORT}/`;
    if (targetUser) link += `?targetUser=${encodeURIComponent(targetUser)}`;

    await message.reply(
      `🎙️ **¡Nueva forma de grabar más segura y sin errores!**\n\n` +
      `Para empezar a grabar esta reunión con todos los participantes, hacé clic en este link:\n` +
      `🔗 **${link}**\n\n` +
      `*(Se va a abrir en tu navegador. Seguí las instrucciones ahí para compartir el audio).*`
    );
  }

  if (content === '!detener' || content === '!stop') {
    await message.reply(
      `⚠️ **Ahora la grabación se detiene desde la página web.**\n` +
      `Volvé a la pestaña del navegador donde iniciaste la grabación y hacé clic en **"Detener y Enviar a la IA"**.`
    );
  }

  if (content === '!mic') {
    await message.reply(
      `✅ **Modo Navegador Activo**\n` +
      `Ya no necesitamos detectar dispositivos de audio acá. El navegador de internet se encarga de todo de forma automática y segura.\n\n` +
      `Escribí \`!grabar\` para empezar.`
    );
  }
});

function startDiscordBot() {
  if (!DISCORD_TOKEN) {
    console.warn('⚠️ DISCORD_TOKEN no configurado.');
    return;
  }
  client.login(DISCORD_TOKEN).catch(err => {
    console.error('❌ Error al iniciar el bot:', err.message);
  });
}

module.exports = { startDiscordBot };
