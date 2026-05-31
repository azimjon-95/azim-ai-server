import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { connectDB } from './utils/db.js'
import { setupSocketHandlers } from './socket/handlers.js'

// Routes
import chatRoutes from './routes/chat.js'
import commandRoutes from './routes/commands.js'
import voiceRoutes from './routes/voice.js'
import telegramRoutes from './routes/telegram.js'
import settingsRoutes from './routes/settings.js'
import healthRoutes from './routes/health.js'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// Middleware
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(morgan('dev'))

// Share io with routes via req
app.use((req, _res, next) => {
  req.io = io
  next()
})

// Routes
app.use('/api/chat', chatRoutes)
app.use('/api/commands', commandRoutes)
app.use('/api/voice', voiceRoutes)
app.use('/api/telegram', telegramRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/health', healthRoutes)

app.get('/', (_req, res) => res.json({ name: 'Azim AI Assistant', status: 'running' }))

// Socket.IO
setupSocketHandlers(io)

// Start
const PORT = process.env.PORT || 5000

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`\n🤖 Azim AI Server running on port ${PORT}`)
    console.log(`📡 Socket.IO ready`)
    console.log(`🧠 Ollama: ${process.env.OLLAMA_URL} (${process.env.OLLAMA_MODEL})`)
    console.log(`🌐 Client: ${process.env.CLIENT_URL}\n`)
  })
})
