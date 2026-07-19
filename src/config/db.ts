import mongoose from "mongoose"

export async function connectDB() {
  try {
    let uri = process.env.MONGODB_URI || "mongodb://localhost:27017/problem"

    if (!uri.includes("/problem")) {
      const separator = uri.includes("?") ? "/problem?" : "/problem"
      uri = uri.replace("?", separator)
    }

    await mongoose.connect(uri)
    console.log(`MongoDB connected: ${mongoose.connection.host} / ${mongoose.connection.db?.databaseName}`)
  } catch (error) {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  }
}
