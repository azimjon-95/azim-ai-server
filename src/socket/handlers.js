import { askOllama } from '../ai/ollama.js'
import { parseCommand } from '../ai/commands.js'
import { sendTelegramMessage } from '../telegram/bot.js'

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    const sessionId = socket.id

    // Handle voice command from client
    socket.on('voice:command', async ({ text }) => {
      if (!text || !text.trim()) return

      console.log(`[Voice] Command from ${socket.id}: "${text}"`)

      try {
        // 1. Try to execute as a direct command first
        const cmdResult = await parseCommand(text)

        if (cmdResult.executed) {
          socket.emit('command:executed', { action: cmdResult.action, label: cmdResult.label })
          socket.emit('ai:response', {
            text: `${cmdResult.label}! Yana nima qilishingizga yordam bera olaman?`,
            action: cmdResult.action,
          })
          return
        }

        // 2. Ask AI (Ollama)
        const aiResponse = await askOllama(text, sessionId)

        // 3. Check if AI returned an action
        const aiCmdResult = await parseCommand(aiResponse)

        if (aiCmdResult.executed) {
          socket.emit('command:executed', { action: aiCmdResult.action, label: aiCmdResult.label })
          socket.emit('ai:response', {
            text: `${aiCmdResult.label}! Boshqa nima kerak?`,
            action: aiCmdResult.action,
          })
        } else {
          // Pure conversational response
          socket.emit('ai:response', { text: aiResponse })
        }
      } catch (err) {
        console.error('[Socket] voice:command error:', err.message)
        socket.emit('ai:response', { text: "Kechirasiz, xatolik yuz berdi. Qayta urinib ko'ring." })
      }
    })

    // Handle Telegram message request
    socket.on('telegram:send', async ({ chatId, text }) => {
      try {
        await sendTelegramMessage(chatId, text)
        socket.emit('telegram:sent', { success: true })
      } catch (err) {
        socket.emit('telegram:sent', { success: false, error: err.message })
      }
    })

    // Ping/pong health check
    socket.on('ping', () => socket.emit('pong'))

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`)
    })
  })
}
