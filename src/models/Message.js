import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    action: { type: String, default: null },
  },
  { timestamps: true }
)

export const Message = mongoose.model('Message', messageSchema)
