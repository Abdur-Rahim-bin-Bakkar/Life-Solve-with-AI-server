import mongoose, { Schema, Document } from "mongoose"

export interface IConversation extends Document {
  participants: string[]
  lastMessage?: string
  lastMessageBy?: string
  lastMessageAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId
  senderId: string
  senderName: string
  senderImage?: string
  receiverId: string
  receiverName: string
  content: string
  read: boolean
  createdAt: Date
  updatedAt: Date
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [String],
      required: true,
      validate: [(v: string[]) => v.length === 2, "Conversation must have exactly 2 participants"],
    },
    lastMessage: { type: String },
    lastMessageBy: { type: String },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
)

ConversationSchema.index({ participants: 1 })

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderImage: { type: String },
    receiverId: { type: String, required: true },
    receiverName: { type: String, required: true },
    content: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

MessageSchema.index({ conversationId: 1, createdAt: 1 })

export const Conversation = mongoose.model<IConversation>("Conversation", ConversationSchema)
export const Message = mongoose.model<IMessage>("Message", MessageSchema)
