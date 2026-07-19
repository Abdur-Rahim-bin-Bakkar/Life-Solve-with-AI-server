import { Router } from "express"
import {
  chatSolver,
  chatAssistant,
  getSolverSessions,
  getSolverSessionById,
  getChatSessions,
  getChatSessionById,
  deleteChatSession,
} from "../controllers/aiController"
import { authenticate } from "../middleware/auth"

const router = Router()

router.post("/solver", authenticate, chatSolver)
router.get("/solver/sessions", authenticate, getSolverSessions)
router.get("/solver/sessions/:id", authenticate, getSolverSessionById)

router.post("/chat", authenticate, chatAssistant)
router.get("/chat/sessions", authenticate, getChatSessions)
router.get("/chat/sessions/:id", authenticate, getChatSessionById)
router.delete("/chat/sessions/:id", authenticate, deleteChatSession)

export default router
