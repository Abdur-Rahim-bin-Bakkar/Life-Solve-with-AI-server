import { Response } from "express"
import { Problem } from "../models/Problem"
import { AuthRequest } from "../types"

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

    return res.status(201).json({ message: "Problem created successfully", problem })
  } catch (error) {
    console.error("Create problem error:", error)
    return res.status(500).json({ error: "Failed to create problem" })
  }
}

export async function getProblems(req: AuthRequest, res: Response) {
  try {
    const { search, category, sort, limit: limitStr } = req.query

    const filter: Record<string, unknown> = {}

    if (category && category !== "All") {
      filter.category = category
    }

    if (search && typeof search === "string" && search.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" }
    }

    const sortOrder = sort === "old" ? 1 : -1
    const limit = Math.min(Math.abs(Number(limitStr) || 50), 100)

    const problems = await Problem.find(filter)
      .sort({ createdAt: sortOrder })
      .limit(limit)

    return res.json({ problems })
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
