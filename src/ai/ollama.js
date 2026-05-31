import axios from 'axios'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const MODEL = process.env.OLLAMA_MODEL || 'llama3'

const SYSTEM_PROMPT = `Siz Azim — o'zbek tilida gaplashadigan aqlli shaxsiy AI yordamchisiz.
Foydalanuvchi buyruq berganda:
1. Qisqa va aniq javob bering
2. Agar buyruq dastur ochish, fayl qidirish, xabar yuborish bo'lsa — "ACTION:OPEN_YOUTUBE", "ACTION:OPEN_TELEGRAM" kabi javob bering
3. Suhbat bo'lsa — oddiy o'zbek tilida javob bering
4. Har doim do'stona va yordam berishga tayyor bo'ling`

// In-memory conversation history (per session)
const sessions = new Map()

export const askOllama = async (message, sessionId = 'default') => {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, [])
  }

  const history = sessions.get(sessionId)
  history.push({ role: 'user', content: message })

  // Keep last 20 messages for context
  const messages = history.slice(-20)

  try {
    const res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 200,
        },
      },
      { timeout: 30000 }
    )

    const reply = res.data?.message?.content || "Kechirasiz, tushunmadim."
    history.push({ role: 'assistant', content: reply })
    return reply
  } catch (err) {
    console.error('[Ollama] Error:', err.message)
    // Fallback response when Ollama is not running
    return fallbackResponse(message)
  }
}

const fallbackResponse = (message) => {
  const lower = message.toLowerCase()
  if (lower.includes('youtube')) return 'ACTION:OPEN_YOUTUBE'
  if (lower.includes('telegram')) return 'ACTION:OPEN_TELEGRAM'
  if (lower.includes('google')) return 'ACTION:OPEN_GOOGLE'
  if (lower.includes('ob-havo') || lower.includes('havo')) return 'ACTION:WEATHER'
  if (lower.includes('salom')) return 'Salom! Men Azim, sizning AI yordamchingizman. Nima qilishingizga yordam bera olaman?'
  return `"${message}" buyrug'ini tushundim. Ollama server ishlamayapti, iltimos tekshiring.`
}

export const getOllamaStatus = async () => {
  try {
    await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 })
    return { running: true, model: MODEL, url: OLLAMA_URL }
  } catch {
    return { running: false, model: MODEL, url: OLLAMA_URL }
  }
}

export const clearSession = (sessionId = 'default') => {
  sessions.delete(sessionId)
}
