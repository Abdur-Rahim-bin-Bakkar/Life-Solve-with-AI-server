import mongoose, { Schema, Document } from "mongoose"

export interface IProblem extends Document {
  title: string
  shortDescription: string
  fullDescription: string
  category: string
  priority: string
  images: string[]
  userId: string
  userName: string
  userImage?: string
  status: "open" | "resolved"
  reactions: {
    likes: string[]
    loves: string[]
    sads: string[]
  }
  createdAt: Date
  updatedAt: Date
}

const ProblemSchema = new Schema<IProblem>(
  {
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    priority: { type: String, required: true, enum: ["Low", "Medium", "High", "Emergency"] },
    images: [{ type: String }],
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userImage: { type: String },
    status: { type: String, default: "open", enum: ["open", "resolved"] },
    reactions: {
      type: {
        likes: [{ type: String }],
        loves: [{ type: String }],
        sads: [{ type: String }],
      },
      default: { likes: [], loves: [], sads: [] },
    },
  },
  { timestamps: true, collection: "problem" }
)

export const Problem = mongoose.model<IProblem>("Problem", ProblemSchema)
