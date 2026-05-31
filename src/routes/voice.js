import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import {
  saveVoiceSample,
  synthesizeWithClone,
  getVoiceCloneStatus,
  clearUserSamples,
  getUserSamples,
} from '../voice/voiceClone.js'

const router = Router()

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.match(/\.(wav|mp3|ogg|webm)$/i)) cb(null, true)
    else cb(new Error('Faqat audio fayl (wav, mp3, ogg, webm)'))
  },
})

// GET /api/voice/status
router.get('/status', async (req, res) => {
  const userId = req.query.userId || 'default'
  const status = await getVoiceCloneStatus(userId)
  res.json(status)
})

// POST /api/voice/sample — ovoz namunasi yuklash
router.post('/sample', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Audio fayl yuklang' })
  const userId = req.body.userId || 'default'
  const existing = getUserSamples(userId)
  const sampleIndex = existing.length + 1
  try {
    const filepath = await saveVoiceSample(req.file.buffer, userId, sampleIndex)
    const status = await getVoiceCloneStatus(userId)
    res.json({ success: true, message: `Namuna ${sampleIndex} saqlandi`, filepath, status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/voice/synthesize — matn → klonlangan ovoz
router.post('/synthesize', async (req, res) => {
  const { text, userId = 'default', language = 'en' } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })
  try {
    const outputFile = await synthesizeWithClone(text, userId, language)
    if (!outputFile || !fs.existsSync(outputFile)) {
      return res.status(500).json({
        error: 'Ovoz sintezi muvaffaqiyatsiz',
        tip: 'pip install TTS && tts-server --model_name tts_models/multilingual/multi-dataset/xtts_v2',
      })
    }
    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Content-Disposition', 'inline; filename="speech.wav"')
    const stream = fs.createReadStream(outputFile)
    stream.pipe(res)
    res.on('finish', () => { try { fs.unlinkSync(outputFile) } catch {} })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/voice/samples
router.delete('/samples', (req, res) => {
  const userId = req.query.userId || 'default'
  const count = clearUserSamples(userId)
  res.json({ success: true, deleted: count })
})

router.get('/tts', (_req, res) => {
  res.json({
    engine: 'XTTS v2 (zero-shot voice cloning)',
    install: 'pip install TTS',
    startServer: 'tts-server --model_name tts_models/multilingual/multi-dataset/xtts_v2',
    language: process.env.VOICE_LANGUAGE || 'uz-UZ',
  })
})

export default router
