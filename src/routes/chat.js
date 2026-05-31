import { Router } from 'express'
import { askOllama, clearSession } from '../ai/ollama.js'
import { parseCommand } from '../ai/commands.js'

const router = Router()

// POST /api/chat — HTTP fallback (Socket preferred)
router.post('/', async (req, res) => {
  const { message, sessionId = 'http-default' } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  try {
    const cmdResult = await parseCommand(message)
    if (cmdResult.executed) {
      return res.json({ reply: `${cmdResult.label}!`, action: cmdResult.action })
    }

    const reply = await askOllama(message, sessionId)
    res.json({ reply, sessionId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/chat/history (placeholder — implement with DB if needed)
router.get('/history', (_req, res) => {
  res.json({ messages: [], note: 'Use Socket.IO for real-time history' })
})

// DELETE /api/chat/history
router.delete('/history', (req, res) => {
  const { sessionId = 'default' } = req.query
  clearSession(sessionId)
  res.json({ cleared: true, sessionId })
})

export default router
