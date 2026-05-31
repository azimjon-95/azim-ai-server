import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import axios from 'axios'

const execAsync = promisify(exec)

const VOICE_DIR = path.resolve('voices')
const SAMPLES_DIR = path.join(VOICE_DIR, 'samples')
const MODELS_DIR = path.join(VOICE_DIR, 'models')
const OUTPUT_DIR = path.join(VOICE_DIR, 'output')

// Create directories if not exist
for (const dir of [VOICE_DIR, SAMPLES_DIR, MODELS_DIR, OUTPUT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ─── COQUI TTS (XTTS v2) ─────────────────────────────────────────────────────
// XTTS v2 supports zero-shot voice cloning with just 3-10 seconds of audio

const COQUI_API = process.env.COQUI_API_URL || 'http://localhost:5002'

/**
 * Check if Coqui TTS server is running
 */
export const getCoquiStatus = async () => {
  try {
    const res = await axios.get(`${COQUI_API}/api/tts`, { timeout: 3000 })
    return { running: true, url: COQUI_API }
  } catch {
    return { running: false, url: COQUI_API }
  }
}

/**
 * Save uploaded voice sample
 * @param {Buffer} audioBuffer - Audio file buffer (wav/mp3)
 * @param {string} userId - User identifier
 * @param {number} sampleIndex - Sample number (1,2,3...)
 */
export const saveVoiceSample = async (audioBuffer, userId = 'default', sampleIndex = 1) => {
  const filename = `${userId}_sample_${sampleIndex}.wav`
  const filepath = path.join(SAMPLES_DIR, filename)
  fs.writeFileSync(filepath, audioBuffer)
  console.log(`[Voice] Sample saved: ${filename}`)
  return filepath
}

/**
 * Get all samples for a user
 */
export const getUserSamples = (userId = 'default') => {
  const files = fs.readdirSync(SAMPLES_DIR)
  return files
    .filter((f) => f.startsWith(userId))
    .map((f) => path.join(SAMPLES_DIR, f))
}

/**
 * Synthesize speech using XTTS v2 voice cloning
 * Uses user's voice sample as reference — speaks in their voice!
 *
 * @param {string} text - Text to speak
 * @param {string} userId - User ID to get voice sample
 * @param {string} language - Language code (uz, en, ru...)
 */
export const synthesizeWithClone = async (text, userId = 'default', language = 'en') => {
  const samples = getUserSamples(userId)

  if (samples.length === 0) {
    console.warn('[Voice] No voice samples found, using default TTS')
    return synthesizeDefault(text, language)
  }

  // Use first sample as reference speaker
  const speakerWav = samples[0]
  const outputFile = path.join(OUTPUT_DIR, `${userId}_${Date.now()}.wav`)

  try {
    // XTTS v2 via command line (if installed locally)
    const cmd = [
      'tts',
      `--text "${text.replace(/"/g, "'")}"`,
      '--model_name tts_models/multilingual/multi-dataset/xtts_v2',
      `--speaker_wav "${speakerWav}"`,
      `--language_idx "${language}"`,
      `--out_path "${outputFile}"`,
    ].join(' ')

    await execAsync(cmd, { timeout: 30000 })
    console.log(`[Voice] Cloned speech generated: ${outputFile}`)
    return outputFile
  } catch (err) {
    console.error('[Voice] XTTS failed:', err.message)
    // Fallback: try Coqui API server
    return synthesizeViaCoquiAPI(text, speakerWav, language, outputFile)
  }
}

/**
 * Synthesize via Coqui TTS API server
 */
const synthesizeViaCoquiAPI = async (text, speakerWav, language, outputFile) => {
  try {
    const formData = new FormData()
    formData.append('text', text)
    formData.append('language_id', language)
    formData.append('speaker_wav', fs.createReadStream(speakerWav))

    const res = await axios.post(`${COQUI_API}/api/tts`, formData, {
      responseType: 'arraybuffer',
      timeout: 20000,
    })

    fs.writeFileSync(outputFile, Buffer.from(res.data))
    return outputFile
  } catch (err) {
    console.error('[Voice] Coqui API failed:', err.message)
    return null
  }
}

/**
 * Default TTS without voice clone (espeak fallback)
 */
const synthesizeDefault = async (text, language = 'en') => {
  const outputFile = path.join(OUTPUT_DIR, `default_${Date.now()}.wav`)
  try {
    const lang = language === 'uz' ? 'uz' : language === 'ru' ? 'ru' : 'en'
    await execAsync(`espeak -v ${lang} -w "${outputFile}" "${text.replace(/"/g, "'")}"`)
    return outputFile
  } catch {
    return null
  }
}

/**
 * Delete all samples for a user (retrain)
 */
export const clearUserSamples = (userId = 'default') => {
  const samples = getUserSamples(userId)
  samples.forEach((f) => fs.unlinkSync(f))
  console.log(`[Voice] Cleared ${samples.length} samples for user: ${userId}`)
  return samples.length
}

/**
 * Get voice clone status for user
 */
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
    supportedLanguages: ['uz', 'en', 'ru', 'tr', 'de', 'fr', 'es', 'ar'],
    instructions: samples.length === 0
      ? "Ovoz namunasi yuklang (3-10 soniya audio)"
      : samples.length < 3
      ? `${3 - samples.length} ta yana namuna yuklang (sifat yaxshilanadi)`
      : "Ovoz klonlash tayyor! TTS ishlatishingiz mumkin.",
  }
}
