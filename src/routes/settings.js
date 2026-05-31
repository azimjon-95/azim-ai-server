import { Router } from 'express'

const router = Router()

// In-memory settings (replace with DB if needed)
let settings = {
  hotword: process.env.HOTWORD_NAME || 'Azim',
  language: process.env.VOICE_LANGUAGE || 'uz-UZ',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3',
  voiceClone: false,
  faceRecognition: false,
  telegramNotifs: true,
  offlineMode: true,
}

router.get('/', (_req, res) => res.json(settings))

router.patch('/', (req, res) => {
  settings = { ...settings, ...req.body }
  res.json(settings)
})

export default router
