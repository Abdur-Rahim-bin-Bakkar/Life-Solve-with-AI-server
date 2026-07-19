import express, { Request, Response, NextFunction } from "express"
import cors from "cors"
import problemRoutes from "./routes/problems"
import aiRoutes from "./routes/ai"
import messageRoutes from "./routes/messages"
import notificationRoutes from "./routes/notifications"

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map(s => s.trim())

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

app.use(express.json())

app.use("/api/problems", problemRoutes)
app.use("/api/ai", aiRoutes)
app.use("/api", messageRoutes)
app.use("/api", notificationRoutes)

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err)
  res.status(500).json({ error: "Internal server error" })
})

export default app
