import { Response, NextFunction } from "express"
import mongoose from "mongoose"
import { AuthRequest } from "../types"

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" })
      return
    }

    const token = header.split(" ")[1]
    if (!token) {
      res.status(401).json({ error: "Invalid token format" })
      return
    }

    const db = mongoose.connection.db
    if (!db) {
      res.status(500).json({ error: "Database not connected" })
      return
    }

    const session = await db.collection("session").findOne({ token })

    if (!session) {
      res.status(401).json({ error: "Session not found" })
      return
    }

    if (new Date(session.expiresAt) < new Date()) {
      res.status(401).json({ error: "Session expired" })
      return
    }

    // Better Auth might store userId as string (UUID) or as ObjectId string
    // Try both to be safe
    let userQuery: Record<string, unknown>
    if (mongoose.Types.ObjectId.isValid(session.userId)) {
      userQuery = { _id: new mongoose.Types.ObjectId(session.userId) }
    } else {
      userQuery = { _id: session.userId }
    }

    const user = await db.collection("user").findOne(
      userQuery,
      { projection: { password: 0 } }
    )

    if (!user) {
      res.status(401).json({ error: "User not found" })
      return
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      image: user.image,
    }

    next()
  } catch (error) {
    console.error("Auth error:", error)
    res.status(500).json({ error: "Authentication failed" })
  }
}
