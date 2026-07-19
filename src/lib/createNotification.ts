import { Notification } from "../models/Notification"

export async function createNotification(data: {
  userId: string
  type: "problem_created" | "problem_resolved" | "new_comment" | "new_reaction" | "new_message"
  title: string
  message: string
  referenceId: string
}) {
  try {
    await Notification.create(data)
  } catch (error) {
    console.error("Failed to create notification:", error)
  }
}
