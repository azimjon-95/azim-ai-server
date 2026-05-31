import { Router } from 'express'
import { getBot, sendTelegramMessage } from '../telegram/bot.js'

const router = Router()

// GET /api/telegram/status
router.get('/status', (_req, res) => {
  const bot = getBot()
  res.json({ active: !!bot, note: bot ? 'Telegram bot is running' : 'Bot not initialized (check TG_BOT_TOKEN)' })
})

// POST /api/telegram/send
router.post('/send', async (req, res) => {
  const { chatId, text } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  try {
    await sendTelegramMessage(chatId, text)
    res.json({ sent: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
