import open from 'open'

// Map of voice commands to actions
const COMMAND_MAP = [
  { patterns: ['youtube', 'ютуб'], action: 'OPEN_YOUTUBE', label: 'YouTube ochildi', handler: () => open('https://youtube.com') },
  { patterns: ['telegram'], action: 'OPEN_TELEGRAM', label: 'Telegram ochildi', handler: () => open('https://web.telegram.org') },
  { patterns: ['google'], action: 'OPEN_GOOGLE', label: 'Google ochildi', handler: () => open('https://google.com') },
  { patterns: ['github'], action: 'OPEN_GITHUB', label: 'GitHub ochildi', handler: () => open('https://github.com') },
  { patterns: ['ob-havo', 'havo', 'weather'], action: 'WEATHER', label: "Ob-havo ko'rsatildi", handler: () => open('https://weather.com') },
  { patterns: ['vs code', 'vscode', 'kod'], action: 'OPEN_VSCODE', label: 'VS Code ochildi', handler: () => open('vscode://') },
  { patterns: ['instagram'], action: 'OPEN_INSTAGRAM', label: 'Instagram ochildi', handler: () => open('https://instagram.com') },
  { patterns: ['spotify', 'musiqa'], action: 'OPEN_SPOTIFY', label: 'Spotify ochildi', handler: () => open('https://spotify.com') },
  { patterns: ['twitter', 'x.com'], action: 'OPEN_TWITTER', label: 'Twitter ochildi', handler: () => open('https://twitter.com') },
]

// Parse AI response that contains ACTION:X
const ACTION_REGEX = /ACTION:(\w+)/

export const parseCommand = async (text) => {
  const lower = text.toLowerCase().trim()

  // Check AI action response
  const aiActionMatch = text.match(ACTION_REGEX)
  if (aiActionMatch) {
    const actionName = aiActionMatch[1]
    const cmd = COMMAND_MAP.find((c) => c.action === actionName)
    if (cmd) {
      await cmd.handler()
      return { executed: true, action: cmd.action, label: cmd.label }
    }
  }

  // Check direct voice command patterns
  for (const cmd of COMMAND_MAP) {
    if (cmd.patterns.some((p) => lower.includes(p))) {
      try {
        await cmd.handler()
        return { executed: true, action: cmd.action, label: cmd.label }
      } catch (err) {
        console.error(`[Command] Failed to execute ${cmd.action}:`, err.message)
        return { executed: false, action: cmd.action, label: cmd.label, error: err.message }
      }
    }
  }

  return { executed: false, action: null, label: null }
}

export const getCommandList = () =>
  COMMAND_MAP.map(({ action, label, patterns }) => ({ action, label, patterns }))
