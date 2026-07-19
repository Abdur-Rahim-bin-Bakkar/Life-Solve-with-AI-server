import { Router } from "express"
import {
  getUsers,
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
} from "../controllers/messageController"
import { authenticate } from "../middleware/auth"

const router = Router()

router.get("/users", authenticate, getUsers)
router.get("/messages/conversations", authenticate, getConversations)
router.post("/messages/conversations", authenticate, getOrCreateConversation)
router.get("/messages/conversations/:id", authenticate, getMessages)
router.post("/messages/conversations/:id", authenticate, sendMessage)

export default router
