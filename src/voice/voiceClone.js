import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import axios from 'axios'

const execAsync = promisify(exec)

const VOICE_DIR  = path.resolve('voices')
const SAMPLES_DIR = path.join(VOICE_DIR, 'samples')
const OUTPUT_DIR  = path.join(VOICE_DIR, 'output')

for (const d of [VOICE_DIR, SAMPLES_DIR, OUTPUT_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
}

const COQUI = process.env.COQUI_API_URL || 'http://localhost:5002'
const XTTS_MODEL = 'tts_models/multilingual/multi-dataset/xtts_v2'

// ── Save uploaded webm/wav sample ──────────────────────────────────────────
export const saveVoiceSample = async (buffer, userId = 'default', idx = 1) => {
  const file = path.join(SAMPLES_DIR, `${userId}_sample_${idx}.webm`)
  fs.writeFileSync(file, buffer)
  // Convert webm → wav using ffmpeg if available
  const wav = file.replace('.webm', '.wav')
  try {
    await execAsync(`ffmpeg -y -i "${file}" -ar 22050 -ac 1 "${wav}" 2>/dev/null`)
    fs.unlinkSync(file)          // remove original webm
    console.log(`[Voice] Saved + converted: ${path.basename(wav)}`)
    return wav
  } catch {
    // ffmpeg not available — keep webm
    console.log(`[Voice] Saved (no ffmpeg): ${path.basename(file)}`)
    return file
  }
}

export const getUserSamples = (userId = 'default') =>
  fs.readdirSync(SAMPLES_DIR)
    .filter(f => f.startsWith(userId))
    .map(f => path.join(SAMPLES_DIR, f))

export const clearUserSamples = (userId = 'default') => {
  const files = getUserSamples(userId)
  files.forEach(f => { try { fs.unlinkSync(f) } catch {} })
  return files.length
}

// ── Synthesize using XTTS v2 (CLI) ─────────────────────────────────────────
const synthCLI = async (text, speakerWav, language, outFile) => {
  const cmd = [
    'tts',
    `--text "${text.replace(/"/g,"'")}"`,
    `--model_name ${XTTS_MODEL}`,
    `--speaker_wav "${speakerWav}"`,
    `--language_idx "${language}"`,
    `--out_path "${outFile}"`,
  ].join(' ')
  await execAsync(cmd, { timeout: 60000 })
  return outFile
}

// ── Synthesize using Coqui TTS HTTP server ─────────────────────────────────
const synthAPI = async (text, speakerWav, language, outFile) => {
  const FormData = (await import('form-data')).default
  const form = new FormData()
  form.append('text', text)
  form.append('language_id', language)
  form.append('speaker_wav', fs.createReadStream(speakerWav), { filename: 'speaker.wav' })

  const res = await axios.post(`${COQUI}/api/tts`, form, {
    headers: form.getHeaders(),
    responseType: 'arraybuffer',
    timeout: 45000,
  })
  fs.writeFileSync(outFile, Buffer.from(res.data))
  return outFile
}

// ── Espeak fallback ─────────────────────────────────────────────────────────
const synthEspeak = async (text, language, outFile) => {
  const lang = { uz:'uz', en:'en', ru:'ru' }[language] || 'en'
  await execAsync(`espeak -v ${lang} -w "${outFile}" "${text.replace(/"/g,"'")}"`, { timeout: 10000 })
  return outFile
}

export const synthesizeWithClone = async (text, userId = 'default', language = 'en') => {
  const samples = getUserSamples(userId)
  const outFile = path.join(OUTPUT_DIR, `${userId}_${Date.now()}.wav`)

  if (samples.length === 0) {
    console.warn('[Voice] No samples — using espeak fallback')
    try { return await synthEspeak(text, language, outFile) } catch { return null }
  }

  const speaker = samples[0]

  // 1. Try Coqui HTTP API (fastest if server running)
  try {
    return await synthAPI(text, speaker, language, outFile)
  } catch (e) {
    console.warn('[Voice] Coqui API unavailable:', e.message)
  }

  // 2. Try XTTS CLI
  try {
    return await synthCLI(text, speaker, language, outFile)
  } catch (e) {
    console.warn('[Voice] XTTS CLI unavailable:', e.message)
  }

  // 3. Espeak fallback
  try {
    return await synthEspeak(text, language, outFile)
  } catch {
    return null
  }
}

export const getCoquiStatus = async () => {
  try {
    await axios.get(`${COQUI}/api/tts`, { timeout: 2500 })
    return { running: true, url: COQUI }
  } catch {
    return { running: false, url: COQUI }
  }
}

export const getVoiceCloneStatus = async (userId = 'default') => {
  const samples = getUserSamples(userId)
  const coqui = await getCoquiStatus()
  return {
    userId,
    samplesCount: samples.length,
    samplesReady: samples.length >= 1,
    recommendedSamples: 3,
    coquiRunning: coqui.running,
    coquiUrl: coqui.url,
    engine: 'XTTS v2 (zero-shot voice cloning)',
    supportedLanguages: ['uz','en','ru','tr','de','fr','es','ar'],
    instructions: samples.length === 0
      ? '3-10 soniyalik ovoz namunasi yuklang'
      : samples.length < 3
      ? `${3-samples.length} ta yana namuna yuklang (sifat oshadi)`
      : 'Tayyor! AI sizning ovozingizda gapiradi.',
  }
}
