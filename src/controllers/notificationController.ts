import { Response } from "express"
import { AuthRequest } from "../types"
import { Notification } from "../models/Notification"

export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id
    const page = Math.max(Math.abs(Number(req.query.page) || 1), 1)
    const limit = Math.min(Math.max(Math.abs(Number(req.query.limit) || 20), 1), 50)
    const skip = (page - 1) * limit

    const [notifications, total] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments({ userId }),
    ])

    const mapped = notifications.map((n) => ({
      _id: n._id.toString(),
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      referenceId: n.referenceId,
      read: n.read,
      createdAt: n.createdAt,
    }))

    res.json({ notifications: mapped, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Get notifications error:", error)
    res.status(500).json({ error: "Failed to fetch notifications" })
  }
}

export async function getUnreadCount(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id
    const count = await Notification.countDocuments({ userId, read: false })
    res.json({ count })
  } catch (error) {
    console.error("Get unread count error:", error)
    res.status(500).json({ error: "Failed to get unread count" })
  }
}

export async function markAsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const notificationId = typeof id === "string" ? id : id[0]

    const notification = await Notification.findOne({ _id: notificationId, userId })
    if (!notification) {
      res.status(404).json({ error: "Notification not found" })
      return
    }

    notification.read = true
    await notification.save()

    res.json({ message: "Marked as read" })
  } catch (error) {
    console.error("Mark as read error:", error)
    res.status(500).json({ error: "Failed to mark as read" })
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } })
    res.json({ message: "All marked as read" })
  } catch (error) {
    console.error("Mark all as read error:", error)
    res.status(500).json({ error: "Failed to mark all as read" })
  }
}
