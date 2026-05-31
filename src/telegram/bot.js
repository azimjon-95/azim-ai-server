import TelegramBot from 'node-telegram-bot-api'

let bot = null

export const initTelegramBot = () => {
  const token = process.env.TG_BOT_TOKEN
  if (!token || token === 'your_bot_token_here') {
    console.log('⚠️  Telegram bot token not set — Telegram disabled')
    return null
  }

  try {
    bot = new TelegramBot(token, { polling: true })

    bot.on('message', (msg) => {
      const chatId = msg.chat.id
      const text = msg.text || ''
      console.log(`[Telegram] Message from ${chatId}: "${text}"`)

      if (text.toLowerCase() === '/start') {
        bot.sendMessage(chatId, `Salom! Men Azim AI Assistantman 🤖\n\nSizga buyruqlar va savollarga javob beraman.`)
      }
    })

    bot.on('error', (err) => {
      console.error('[Telegram] Error:', err.message)
    })

    console.log('✅ Telegram bot started')
    return bot
  } catch (err) {
    console.error('[Telegram] Init failed:', err.message)
    return null
  }
}

export const sendTelegramMessage = async (chatId, text) => {
  const targetId = chatId || process.env.TG_MY_CHAT_ID
  if (!bot) throw new Error('Telegram bot not initialized')
  if (!targetId) throw new Error('No chat ID provided')
  return bot.sendMessage(targetId, text)
}

export const getBot = () => bot
