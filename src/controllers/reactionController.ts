import { Response } from "express"
import { Problem } from "../models/Problem"
import { AuthRequest } from "../types"

const reactionFields = ["likes", "loves", "sads"] as const
type ReactionField = typeof reactionFields[number]

export async function toggleReaction(req: AuthRequest, res: Response) {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0]
    const { type } = req.body
    const userId = req.user!.id

    if (!["like", "love", "sad"].includes(type)) {
      return res.status(400).json({ error: "Invalid reaction type" })
    }

    const problem = await Problem.findById(id)
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" })
    }

    const field: ReactionField = type === "like" ? "likes" : type === "love" ? "loves" : "sads"

    const alreadyHasType = problem.reactions[field].includes(userId)
    const otherFields = reactionFields.filter((f) => f !== field)

    if (alreadyHasType) {
      problem.reactions[field] = problem.reactions[field].filter((u) => u !== userId)
    } else {
      for (const f of otherFields) {
        problem.reactions[f] = problem.reactions[f].filter((u) => u !== userId)
      }
      problem.reactions[field].push(userId)
    }

    await problem.save()

    return res.json({
      reactions: {
        likes: problem.reactions.likes.length,
        loves: problem.reactions.loves.length,
        sads: problem.reactions.sads.length,
        userReaction: alreadyHasType ? null : type,
      },
    })
  } catch (error) {
    console.error("Toggle reaction error:", error)
    return res.status(500).json({ error: "Failed to toggle reaction" })
  }
}
