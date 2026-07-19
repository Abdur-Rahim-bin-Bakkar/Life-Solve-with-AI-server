import mongoose, { Schema, Document } from "mongoose"

export interface IMessage {
  role: "user" | "assistant"
  content: string
  createdAt?: Date
}

export interface IChatSession extends Document {
  userId: string
  sessionType: "solver" | "chat"
  title: string
  messages: IMessage[]
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
)

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: String, required: true, index: true },
    sessionType: { type: String, enum: ["solver", "chat"], required: true, index: true },
    title: { type: String, default: "New Session" },
    messages: [MessageSchema],
  },
  { timestamps: true }
)

export const ChatSession = mongoose.model<IChatSession>("ChatSession", ChatSessionSchema)
