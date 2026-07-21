const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, EndBehaviorType } = require('@discordjs/voice');
const prism = require('prism-media');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const db = require('./db');
const { processMeetingContent } = require('./ai');

// Initialize Groq Client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Map to hold active recording sessions
const activeRecordings = new Map();

// Helper to write WAV header
function getWavHeader(dataLength, sampleRate = 48000, channels = 2, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

// Helper to transcribe audio clip using Groq Whisper
async function transcribeAudio(filePath) {
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3-turbo',
      language: 'es'
    });
    return transcription.text.trim();
  } catch (err) {
    console.error(`Error transcribing ${filePath}:`, err.message);
    return '';
  }
}

client.once('ready', () => {
  console.log(`🤖 Bot de Discord de MinutAI listo y conectado como: ${client.user.tag}`);
});

// Listen to message commands (prefix: !)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase().trim();

  // COMMAND: !grabar
  if (content === '!grabar' || content === '!join') {
    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) {
      return message.reply('❌ ¡Debes estar en un canal de voz de Discord para iniciar la grabación!');
    }

    const guildId = message.guild.id;
    if (activeRecordings.has(guildId)) {
      return message.reply('⚠️ Ya hay una grabación activa en este servidor de Discord.');
    }

    try {
      console.log(`Starting recording in voice channel: ${voiceChannel.name} (Guild: ${guildId})`);
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      const recording = {
        connection,
        voiceChannel,
        textChannel: message.channel,
        startTime: Date.now(),
        clips: [],
        streams: new Map()
      };

      activeRecordings.set(guildId, recording);

      // Listen to voice receiver streams
      const receiver = connection.receiver;

      receiver.speaking.on('start', async (userId) => {
        // Prevent double recording for a user active stream
        if (recording.streams.has(userId)) return;

        let username = `User_${userId}`;
        try {
          const member = await message.guild.members.fetch(userId);
          username = member.displayName || member.user.username;
        } catch (err) {
          const user = await client.users.fetch(userId).catch(() => null);
          if (user) username = user.username;
        }

        const timestamp = Date.now();
        const tempDir = path.join(__dirname, 'temp_audio');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const pcmPath = path.join(tempDir, `clip_${timestamp}_${userId}.pcm`);
        const wavPath = path.join(tempDir, `clip_${timestamp}_${userId}.wav`);

        // Subscribe to user speaking audio stream (ends after 1s of silence)
        const audioStream = receiver.subscribe(userId, {
          end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 1000
          }
        });

        const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
        const pcmStream = audioStream.pipe(opusDecoder);
        const writeStream = fs.createWriteStream(pcmPath);

        pcmStream.pipe(writeStream);
        recording.streams.set(userId, audioStream);

        writeStream.on('close', () => {
          recording.streams.delete(userId);
          try {
            if (fs.existsSync(pcmPath)) {
              const pcmData = fs.readFileSync(pcmPath);
              // Only save clips with actual audio content (more than 1000 bytes)
              if (pcmData.length > 2000) {
                const wavHeader = getWavHeader(pcmData.length);
                fs.writeFileSync(wavPath, Buffer.concat([wavHeader, pcmData]));
                recording.clips.push({
                  filePath: wavPath,
                  userId,
                  username,
                  timestamp
                });
              }
              fs.unlinkSync(pcmPath);
            }
          } catch (err) {
            console.error('Error writing WAV clip:', err);
          }
        });
      });

      message.reply(`🔴 **Grabación iniciada** en el canal de voz **${voiceChannel.name}**.\nHablen con normalidad. Para guardar y generar la minuta, escriban \`!detener\`.`);

    } catch (err) {
      console.error('Error starting connection to voice channel:', err);
      message.reply(`❌ Error al conectar al canal de voz: ${err.message}`);
    }
  }

  // COMMAND: !detener
  if (content === '!detener' || content === '!stop') {
    const guildId = message.guild.id;
    const recording = activeRecordings.get(guildId);

    if (!recording) {
      return message.reply('⚠️ No hay ninguna grabación activa en este servidor para detener.');
    }

    message.reply('⏳ **Procesando la reunión...** Deteniendo captura, transcribiendo audios y generando minuta con Inteligencia Artificial. Por favor espera...');

    // Stop recording and leave
    try {
      recording.connection.destroy();
    } catch (err) {
      console.error('Error destroying voice connection:', err);
    }
    
    activeRecordings.delete(guildId);

    // Wait 2.5 seconds to let any pending writeStreams finish writing
    setTimeout(async () => {
      try {
        if (recording.clips.length === 0) {
          return message.reply('❌ No se registró audio con suficiente volumen en la llamada. La minuta fue cancelada.');
        }

        // Sort clips chronologically
        recording.clips.sort((a, b) => a.timestamp - b.timestamp);

        const transcriptLines = [];
        for (const clip of recording.clips) {
          const text = await transcribeAudio(clip.filePath);
          
          // Delete WAV clip file from disk
          try {
            if (fs.existsSync(clip.filePath)) fs.unlinkSync(clip.filePath);
          } catch (err) {
            console.error('Failed to delete temp wav file:', err);
          }

          if (text) {
            const relativeMs = clip.timestamp - recording.startTime;
            const secs = Math.floor((relativeMs / 1000) % 60).toString().padStart(2, '0');
            const mins = Math.floor((relativeMs / (1000 * 60)) % 60).toString().padStart(2, '0');
            const hrs = Math.floor((relativeMs / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
            const timestampStr = `${hrs}:${mins}:${secs}`;
            
            transcriptLines.push(`[${clip.username}] (${timestampStr}): "${text}"`);
          }
        }

        const fullTranscript = transcriptLines.join('\n');
        if (!fullTranscript.trim()) {
          return message.reply('❌ No se pudo transcribir ningún texto de la reunión. Minuta cancelada.');
        }

        console.log(`Transcribed meeting length: ${fullTranscript.length} chars. Generating AI content...`);

        // Generate Minute with Gemini AI
        const style = 'Estilo Atlascore (Formato Corporativo IT)';
        const aiResult = await processMeetingContent(fullTranscript, style);

        // Save Minute directly to Database
        const insertMeeting = `
          INSERT INTO meetings (title, email_subject, date, participants, area, business_unit, client, objective, summary, topics, agreements, decisions, risks, custom_notes, raw_text, style)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id;
        `;
        
        const meetingValues = [
          aiResult.title || 'Reunión de Discord',
          aiResult.email_subject || '',
          aiResult.date || new Date().toISOString().split('T')[0],
          aiResult.participants || 'Participantes de Discord',
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
          fullTranscript,
          null, // file_url
          style
        ];

        const { rows } = await db.query(insertMeeting, meetingValues);
        const meetingId = rows[0].id;

        // Save Action Items
        if (aiResult.action_items && aiResult.action_items.length > 0) {
          for (const item of aiResult.action_items) {
            const insertAction = `
              INSERT INTO action_items (meeting_id, action, owner, due_date, priority)
              VALUES ($1, $2, $3, $4, $5)
            `;
            await db.query(insertAction, [
              meetingId, 
              item.action || 'Acción sin definir', 
              item.owner || 'No asignado', 
              item.due_date || 'Sin fecha', 
              item.priority || 'Normal'
            ]);
          }
        }

        // Send confirmation in Discord
        let responseMsg = `✅ **¡Minuta de reunión generada y guardada en Atlascore!**\n\n`;
        responseMsg += `**Título:** ${aiResult.title}\n`;
        responseMsg += `**Fecha:** ${aiResult.date}\n`;
        responseMsg += `**Participantes:** ${aiResult.participants}\n\n`;
        responseMsg += `**Resumen Ejecutivo:**\n${aiResult.summary.substring(0, 500)}${aiResult.summary.length > 500 ? '...' : ''}\n\n`;
        
        if (aiResult.action_items && aiResult.action_items.length > 0) {
          responseMsg += `**Acciones principales:**\n`;
          aiResult.action_items.slice(0, 5).forEach((item, idx) => {
            responseMsg += `${idx + 1}. **${item.action}** (Responsable: *${item.owner}*, Fecha: *${item.due_date}*)\n`;
          });
        }
        
        responseMsg += `\n*Puedes ver la minuta completa en formato corporativo y descargar el PDF ingresando al historial de tu panel de MinutAI.*`;

        recording.textChannel.send(responseMsg);

      } catch (err) {
        console.error('Error compiling recording:', err);
        recording.textChannel.send(`❌ Error al transcribir o guardar la minuta: ${err.message}`);
      }
    }, 2500);
  }
});

function startDiscordBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.warn('⚠️ No se ha configurado DISCORD_TOKEN en el entorno. Bot de Discord desactivado.');
    return;
  }
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('❌ Error al loguear el Bot de Discord:', err.message);
  });
}

module.exports = {
  startDiscordBot
};
