import dns from "node:dns/promises"
dns.setServers(["1.1.1.1", "8.8.8.8"])

import app from "../src/app"
import mongoose from "mongoose"

export default async function handler(req: any, res: any) {
  if (mongoose.connection.readyState !== 1) {
    try {
      let uri = process.env.MONGODB_URI || "mongodb://localhost:27017/problem"
      if (!uri.includes("/problem")) {
        const separator = uri.includes("?") ? "/problem?" : "/problem"
        uri = uri.replace("?", separator)
      }
      await mongoose.connect(uri)
      console.log("MongoDB connected successfully")
    } catch (error) {
      console.error("MongoDB connection failed:", error)
      res.status(500).json({ error: "Database connection failed" })
      return
    }
  }
  return app(req, res)
}
