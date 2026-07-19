import { Response } from "express"
import mongoose from "mongoose"
import { Problem } from "../models/Problem"
import { Comment } from "../models/Comment"
import { Message } from "../models/Message"
import { ChatSession } from "../models/ChatSession"
import { AuthRequest } from "../types"
import { createNotification } from "../lib/createNotification"

export async function createProblem(req: AuthRequest, res: Response) {
  try {
    const { title, shortDescription, fullDescription, category, priority, images } = req.body

    const errors: string[] = []
    if (!title?.trim()) errors.push("Title is required")
    if (!shortDescription?.trim()) errors.push("Short description is required")
    if (!fullDescription?.trim()) errors.push("Full description is required")
    if (!category) errors.push("Category is required")
    if (!priority) errors.push("Priority is required")

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", fields: errors })
    }

    const problem = await Problem.create({
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      fullDescription: fullDescription.trim(),
      category,
      priority,
      images: images || [],
      userId: req.user!.id,
      userName: req.user!.name,
      userImage: req.user!.image,
    })

    createNotification({
      userId: req.user!.id,
      type: "problem_created",
      title: "Problem Posted",
      message: `Your problem "${title.trim()}" was posted successfully`,
      referenceId: problem._id.toString(),
    })

    return res.status(201).json({ message: "Problem created successfully", problem })
  } catch (error) {
    console.error("Create problem error:", error)
    return res.status(500).json({ error: "Failed to create problem" })
  }
}

export async function getProblems(req: AuthRequest, res: Response) {
  try {
    const { search, category, sort, limit: limitStr, page: pageStr } = req.query

    const filter: Record<string, unknown> = {}

    if (category && category !== "All") {
      filter.category = category
    }

    if (search && typeof search === "string" && search.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" }
    }

    const sortOrder = sort === "old" ? 1 : -1
    const limit = Math.min(Math.abs(Number(limitStr) || 6), 100)
    const page = Math.max(Math.abs(Number(pageStr) || 1), 1)
    const skip = (page - 1) * limit

    const [problems, total] = await Promise.all([
      Problem.find(filter).sort({ createdAt: sortOrder }).skip(skip).limit(limit),
      Problem.countDocuments(filter),
    ])

    return res.json({ problems, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Get problems error:", error)
    return res.status(500).json({ error: "Failed to fetch problems" })
  }
}

export async function getProblemById(req: AuthRequest, res: Response) {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0]
    const problem = await Problem.findById(id)
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" })
    }
    return res.json({ problem })
  } catch (error) {
    console.error("Get problem error:", error)
    return res.status(500).json({ error: "Failed to fetch problem" })
  }
}

export async function deleteProblem(req: AuthRequest, res: Response) {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0]
    const problem = await Problem.findById(id)
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" })
    }

    if (problem.userId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized to delete this problem" })
    }

    await Problem.findByIdAndDelete(id)
    return res.json({ message: "Problem deleted successfully" })
  } catch (error) {
    console.error("Delete problem error:", error)
    return res.status(500).json({ error: "Failed to delete problem" })
  }
}

export async function getUserProblems(req: AuthRequest, res: Response) {
  try {
    const problems = await Problem.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })

    return res.json({ problems })
  } catch (error) {
    console.error("Get user problems error:", error)
    return res.status(500).json({ error: "Failed to fetch user problems" })
  }
}

export async function updateProblem(req: AuthRequest, res: Response) {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0]
    const allowed = ["title", "shortDescription", "fullDescription", "category", "priority", "images", "status"]
    const updates: Record<string, unknown> = {}

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    if (updates.title !== undefined && !String(updates.title).trim()) {
      return res.status(400).json({ error: "Title cannot be empty" })
    }

    const problem = await Problem.findById(id)
    if (!problem) return res.status(404).json({ error: "Problem not found" })
    if (problem.userId !== req.user!.id) return res.status(403).json({ error: "Not authorized" })

    const wasResolved = problem.status === "resolved"
    const becomingResolved = updates.status === "resolved"

    const updated = await Problem.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })

    if (!wasResolved && becomingResolved && updated) {
      createNotification({
        userId: req.user!.id,
        type: "problem_resolved",
        title: "Problem Resolved",
        message: `Your problem "${updated.title}" was marked as resolved`,
        referenceId: updated._id.toString(),
      })
    }

    return res.json({ problem: updated })
  } catch (error) {
    console.error("Update problem error:", error)
    return res.status(500).json({ error: "Failed to update problem" })
  }
}

export async function getUserStats(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id
    const posts = await Problem.find({ userId }).sort({ createdAt: -1 })

    const postCount = posts.length
    const solvedCount = posts.filter((p) => p.status === "resolved").length

    const comments = await Comment.find({ userId })
    const commentCount = comments.length

    const dailyMap: Record<string, { posts: number; solved: number }> = {}
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dailyMap[key] = { posts: 0, solved: 0 }
    }

    for (const p of posts) {
      const key = new Date(p.createdAt).toISOString().slice(0, 10)
      if (dailyMap[key]) dailyMap[key].posts++
      if (p.status === "resolved") {
        const sk = new Date(p.updatedAt).toISOString().slice(0, 10)
        if (dailyMap[sk]) dailyMap[sk].solved++
      }
    }

    const daily = Object.entries(dailyMap).map(([date, val]) => ({ date, ...val }))

    return res.json({ stats: { postCount, solvedCount, commentCount, daily } })
  } catch (error) {
    console.error("Get user stats error:", error)
    return res.status(500).json({ error: "Failed to get stats" })
  }
}

export async function getOverviewStats(_req: AuthRequest, res: Response) {
  try {
    const db = mongoose.connection.db
    if (!db) { res.status(500).json({ error: "Database not connected" }); return }

    const totalPosts = await Problem.countDocuments()
    const solvedPosts = await Problem.countDocuments({ status: "resolved" })
    const totalComments = await Comment.countDocuments()
    const totalMessages = await Message.countDocuments()
    const totalAiChats = await ChatSession.countDocuments()

    const totalUsers = await db.collection("user").countDocuments()

    const aiResponsesResult = await ChatSession.aggregate([
      { $unwind: "$messages" },
      { $match: { "messages.role": "assistant" } },
      { $count: "total" },
    ])
    const totalAiResponses = aiResponsesResult[0]?.total || 0

    const communityRating = totalPosts > 0
      ? parseFloat(((solvedPosts / totalPosts) * 5).toFixed(1))
      : 5.0

    const dailyMap: Record<string, { posts: number; solved: number; comments: number; messages: number; aiChats: number }> = {}
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dailyMap[key] = { posts: 0, solved: 0, comments: 0, messages: 0, aiChats: 0 }
    }

    const posts = await Problem.find({}, { createdAt: 1, updatedAt: 1, status: 1 })
    for (const p of posts) {
      const key = new Date(p.createdAt).toISOString().slice(0, 10)
      if (dailyMap[key]) dailyMap[key].posts++
      if (p.status === "resolved") {
        const sk = new Date(p.updatedAt).toISOString().slice(0, 10)
        if (dailyMap[sk]) dailyMap[sk].solved++
      }
    }

    const allComments = await Comment.find({}, { createdAt: 1 })
    for (const c of allComments) {
      const key = new Date(c.createdAt).toISOString().slice(0, 10)
      if (dailyMap[key]) dailyMap[key].comments++
    }

    const allMessages = await Message.find({}, { createdAt: 1 })
    for (const m of allMessages) {
      const key = new Date(m.createdAt).toISOString().slice(0, 10)
      if (dailyMap[key]) dailyMap[key].messages++
    }

    const allAiChats = await ChatSession.find({}, { createdAt: 1 })
    for (const a of allAiChats) {
      const key = new Date(a.createdAt).toISOString().slice(0, 10)
      if (dailyMap[key]) dailyMap[key].aiChats++
    }

    const daily = Object.entries(dailyMap).map(([date, val]) => ({ date, ...val }))

    return res.json({ stats: { totalPosts, solvedPosts, totalComments, totalMessages, totalAiChats, totalUsers, totalAiResponses, communityRating, daily } })
  } catch (error) {
    console.error("Get overview stats error:", error)
    return res.status(500).json({ error: "Failed to get overview stats" })
  }
}
