import { Router } from "express"
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController"
import { authenticate } from "../middleware/auth"

const router = Router()

router.get("/notifications", authenticate, getNotifications)
router.get("/notifications/unread-count", authenticate, getUnreadCount)
router.post("/notifications/:id/read", authenticate, markAsRead)
router.post("/notifications/read-all", authenticate, markAllAsRead)

export default router
