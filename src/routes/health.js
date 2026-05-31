import { Router } from 'express'
import { getOllamaStatus } from '../ai/ollama.js'
import { getBot } from '../telegram/bot.js'
import mongoose from 'mongoose'

const router = Router()

router.get('/', async (_req, res) => {
  const ollama = await getOllamaStatus()
  const dbState = mongoose.connection.readyState

  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    services: {
      database: dbState === 1 ? 'connected' : 'disconnected',
      ollama: ollama.running ? 'running' : 'offline',
      ollamaModel: ollama.model,
      telegram: getBot() ? 'active' : 'disabled',
    },
    timestamp: new Date().toISOString(),
  })
})

export default router
