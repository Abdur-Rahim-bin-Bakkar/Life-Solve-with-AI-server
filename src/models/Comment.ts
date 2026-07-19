import mongoose, { Schema, Document } from "mongoose"

export interface IComment extends Document {
  problemId: mongoose.Types.ObjectId
  userId: string
  userName: string
  userImage?: string
  content: string
  createdAt: Date
  updatedAt: Date
}

const CommentSchema = new Schema<IComment>(
  {
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userImage: { type: String },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

export const Comment = mongoose.model<IComment>("Comment", CommentSchema)
