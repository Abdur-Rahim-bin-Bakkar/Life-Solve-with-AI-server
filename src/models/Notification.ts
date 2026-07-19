import mongoose, { Schema, Document } from "mongoose"

export interface INotification extends Document {
  userId: string
  type: "problem_created" | "problem_resolved" | "new_comment" | "new_reaction" | "new_message"
  title: string
  message: string
  referenceId: string
  read: boolean
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["problem_created", "problem_resolved", "new_comment", "new_reaction", "new_message"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    referenceId: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

NotificationSchema.index({ userId: 1, createdAt: -1 })
NotificationSchema.index({ userId: 1, read: 1 })

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema)
