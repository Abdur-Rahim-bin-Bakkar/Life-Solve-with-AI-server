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
      res.status(400).json({ error: "Validation failed", fields: errors })
      return
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

    res.status(201).json({ message: "Problem created successfully", problem })
  } catch (error) {
    console.error("Create problem error:", error)
    res.status(500).json({ error: "Failed to create problem" })
  }
}

export async function getProblems(_req: AuthRequest, res: Response) {
  try {
    const problems = await Problem.find()
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({ problems })
  } catch (error) {
    console.error("Get problems error:", error)
    res.status(500).json({ error: "Failed to fetch problems" })
  }
}

export async function getProblemById(req: AuthRequest, res: Response) {
  try {
    const problem = await Problem.findById(req.params.id)
    if (!problem) {
      res.status(404).json({ error: "Problem not found" })
      return
    }
    res.json({ problem })
  } catch (error) {
    console.error("Get problem error:", error)
    res.status(500).json({ error: "Failed to fetch problem" })
  }
}

export async function deleteProblem(req: AuthRequest, res: Response) {
  try {
    const problem = await Problem.findById(req.params.id)
    if (!problem) {
      res.status(404).json({ error: "Problem not found" })
      return
    }

    if (problem.userId !== req.user!.id) {
      res.status(403).json({ error: "Not authorized to delete this problem" })
      return
    }

    await Problem.findByIdAndDelete(req.params.id)
    res.json({ message: "Problem deleted successfully" })
  } catch (error) {
    console.error("Delete problem error:", error)
    res.status(500).json({ error: "Failed to delete problem" })
  }
}

export async function getUserProblems(req: AuthRequest, res: Response) {
  try {
    const problems = await Problem.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })

    res.json({ problems })
  } catch (error) {
    console.error("Get user problems error:", error)
    res.status(500).json({ error: "Failed to fetch user problems" })
  }
}
