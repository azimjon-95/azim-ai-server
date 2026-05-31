import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import {
  saveVoiceSample, synthesizeWithClone,
  getVoiceCloneStatus, clearUserSamples, getUserSamples,
} from '../voice/voiceClone.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.match(/\.(wav|mp3|ogg|webm|m4a)$/i) || file.mimetype.startsWith('audio/'))
      cb(null, true)
    else cb(new Error('Faqat audio fayl qabul qilinadi'))
  },
})

// GET /api/voice/status
router.get('/status', async (req, res) => {
  const status = await getVoiceCloneStatus(req.query.userId || 'default')
  res.json(status)
})

// POST /api/voice/sample  — namuna yuklash
router.post('/sample', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Audio fayl yuklang' })
  const userId = req.body.userId || 'default'
  const existing = getUserSamples(userId)
  try {
    const fp = await saveVoiceSample(req.file.buffer, userId, existing.length + 1)
    const status = await getVoiceCloneStatus(userId)
    res.json({ success: true, message: `Namuna ${existing.length+1} saqlandi`, filepath: fp, status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/voice/synthesize  — klonlangan ovoz
router.post('/synthesize', async (req, res) => {
  const { text, userId = 'default', language = 'en' } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })
  try {
    const outFile = await synthesizeWithClone(text, userId, language)
    if (!outFile || !fs.existsSync(outFile)) {
      return res.status(500).json({
        error: 'Ovoz sintezi muvaffaqiyatsiz',
        fix: 'pip install TTS && tts-server --model_name tts_models/multilingual/multi-dataset/xtts_v2',
      })
    }
    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Content-Disposition', 'inline; filename="azim_speech.wav"')
    const stream = fs.createReadStream(outFile)
    stream.pipe(res)
    res.on('finish', () => { try { fs.unlinkSync(outFile) } catch {} })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/voice/samples
router.delete('/samples', (req, res) => {
  const n = clearUserSamples(req.query.userId || 'default')
  res.json({ success: true, deleted: n })
})

router.get('/tts', (_req, res) => res.json({
  engine: 'XTTS v2', install: 'pip install TTS',
  start: 'tts-server --model_name tts_models/multilingual/multi-dataset/xtts_v2 --port 5002',
}))

export default router
