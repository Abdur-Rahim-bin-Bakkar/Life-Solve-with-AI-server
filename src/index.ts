import dns from "node:dns/promises";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
import dotenv from "dotenv"
dotenv.config()

import app from "./app"
import { connectDB } from "./config/db"

const PORT = process.env.PORT || 5000

async function start() {
  await connectDB()

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start()
