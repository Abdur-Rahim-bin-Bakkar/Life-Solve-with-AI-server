import { Response } from "express"
import mongoose from "mongoose"
import { Comment } from "../models/Comment"
import { Problem } from "../models/Problem"
import { AuthRequest } from "../types"
import { createNotification } from "../lib/createNotification"

function getProblemId(req: AuthRequest): string {
  return typeof req.params.id === "string" ? req.params.id : req.params.id[0]
}

export async function getComments(req: AuthRequest, res: Response) {
  try {
    const problemId = getProblemId(req)

    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({ error: "Invalid problem ID" })
    }

    const comments = await Comment.find({ problemId })
      .sort({ createdAt: -1 })
      .lean()

    return res.json({ comments })
  } catch (error) {
    console.error("Get comments error:", error)
    return res.status(500).json({ error: "Failed to fetch comments" })
  }
}

export async function createComment(req: AuthRequest, res: Response) {
  try {
    const problemId = getProblemId(req)
    const { content } = req.body

    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({ error: "Invalid problem ID" })
    }

    if (!content?.trim()) {
      return res.status(400).json({ error: "Comment content is required" })
    }

    const problem = await Problem.findById(problemId)
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" })
    }

    const comment = await Comment.create({
      problemId,
      userId: req.user!.id,
      userName: req.user!.name,
      userImage: req.user!.image,
      content: content.trim(),
    })

    if (problem.userId !== req.user!.id) {
      createNotification({
        userId: problem.userId,
        type: "new_comment",
        title: "New Comment",
        message: `${req.user!.name} commented on your problem "${problem.title}"`,
        referenceId: problemId,
      })
    }

    return res.status(201).json({ comment })
  } catch (error) {
    console.error("Create comment error:", error)
    return res.status(500).json({ error: "Failed to create comment" })
  }
}

export async function updateComment(req: AuthRequest, res: Response) {
  try {
    const commentId = typeof req.params.commentId === "string" ? req.params.commentId : req.params.commentId[0]
    const { content } = req.body

    if (!content?.trim()) {
      return res.status(400).json({ error: "Comment content is required" })
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" })
    }

    if (comment.userId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized to edit this comment" })
    }

    comment.content = content.trim()
    await comment.save()

    return res.json({ comment })
  } catch (error) {
    console.error("Update comment error:", error)
    return res.status(500).json({ error: "Failed to update comment" })
  }
}

export async function deleteComment(req: AuthRequest, res: Response) {
  try {
    const commentId = typeof req.params.commentId === "string" ? req.params.commentId : req.params.commentId[0]

    const comment = await Comment.findById(commentId)
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" })
    }

    if (comment.userId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized to delete this comment" })
    }

    await Comment.findByIdAndDelete(commentId)

    return res.json({ message: "Comment deleted successfully" })
  } catch (error) {
    console.error("Delete comment error:", error)
    return res.status(500).json({ error: "Failed to delete comment" })
  }
}
