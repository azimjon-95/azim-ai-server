import { Router } from 'express'

const router = Router()

// GET /api/voice/status
router.get('/status', (_req, res) => {
  res.json({
    stt: 'Web Speech API (browser-side)',
    tts: 'Web Speech Synthesis (browser-side)',
    language: process.env.VOICE_LANGUAGE || 'uz-UZ',
    hotword: process.env.HOTWORD_NAME || 'Azim',
  })
})

// POST /api/voice/tts — server-side TTS (optional, for Coqui TTS)
router.post('/tts', async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  // TODO: Integrate Coqui TTS here
  // For now return info message
  res.json({
    text,
    note: 'Server TTS not configured. Using browser Web Speech API.',
    language: process.env.VOICE_LANGUAGE || 'uz-UZ',
  })
})

export default router
