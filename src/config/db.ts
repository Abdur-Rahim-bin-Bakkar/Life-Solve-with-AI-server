import mongoose from "mongoose"

export async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/problem"
    await mongoose.connect(uri)
    console.log(`MongoDB connected: ${mongoose.connection.host}`)
  } catch (error) {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  }
}
