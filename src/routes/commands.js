import { Router } from 'express'
import { parseCommand, getCommandList } from '../ai/commands.js'

const router = Router()

// GET /api/commands — list all commands
router.get('/', (_req, res) => {
  res.json({ commands: getCommandList() })
})

// POST /api/commands/execute
router.post('/execute', async (req, res) => {
  const { command } = req.body
  if (!command) return res.status(400).json({ error: 'command required' })

  try {
    const result = await parseCommand(command)
    if (result.executed) {
      // Notify via socket
      req.io?.emit('command:executed', { action: result.action, label: result.label })
      return res.json({ success: true, ...result })
    }
    res.json({ success: false, message: 'No matching command found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
