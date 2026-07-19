import express from "express"
import cors from "cors"
import problemRoutes from "./routes/problems"

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}))

app.use(express.json())

app.use("/api/problems", problemRoutes)

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

export default app
