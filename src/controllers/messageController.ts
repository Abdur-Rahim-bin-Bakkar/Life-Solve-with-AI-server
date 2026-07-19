import { Response } from "express"
import mongoose from "mongoose"
import { AuthRequest } from "../types"
import { Conversation, Message } from "../models/Message"
import { createNotification } from "../lib/createNotification"

function toMongoId(id: string): any {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id)
  }
  return id
}

export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user!.id
    const db = mongoose.connection.db
    if (!db) { res.status(500).json({ error: "Database not connected" }); return }

    const excludeId = toMongoId(currentUserId)

    const users = await db.collection("user")
      .find({ _id: { $ne: excludeId } } as any, { projection: { password: 0 } } as any)
      .toArray()

    const mapped = (users as any[]).map((u: any) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      image: u.image || null,
    }))

    res.json({ users: mapped })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ error: "Failed to fetch users" })
  }
}

export async function getConversations(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user!.id
    const db = mongoose.connection.db
    if (!db) { res.status(500).json({ error: "Database not connected" }); return }

    const conversations = await Conversation.find({
      participants: currentUserId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean()

    const enriched = await Promise.all(
      (conversations as any[]).map(async (conv: any) => {
        const otherUserId = conv.participants.find((p: string) => p !== currentUserId)!
        let otherUser: { name: string; image?: string | null } | null = null
        try {
          const userDoc: any = await db.collection("user").findOne(
            { _id: toMongoId(otherUserId) },
            { projection: { name: 1, image: 1, _id: 1 } } as any
          )
          if (userDoc) {
            otherUser = { name: userDoc.name, image: userDoc.image || null }
          }
        } catch { /* ignore */ }

        return {
          _id: conv._id.toString(),
          participants: conv.participants,
          otherUserId,
          otherUserName: otherUser?.name || "Unknown",
          otherUserImage: otherUser?.image || null,
          lastMessage: conv.lastMessage || null,
          lastMessageBy: conv.lastMessageBy || null,
          lastMessageAt: conv.lastMessageAt || null,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        }
      })
    )

    res.json({ conversations: enriched })
  } catch (error) {
    console.error("Get conversations error:", error)
    res.status(500).json({ error: "Failed to fetch conversations" })
  }
}

export async function getOrCreateConversation(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user!.id
    const { participantId } = req.body

    if (!participantId) { res.status(400).json({ error: "participantId is required" }); return }
    if (participantId === currentUserId) { res.status(400).json({ error: "Cannot message yourself" }); return }

    const sorted = [currentUserId, participantId].sort()
    let conversation = await Conversation.findOne({
      participants: { $all: sorted, $size: 2 },
    })

    if (!conversation) {
      conversation = await Conversation.create({ participants: sorted })
    }

    const db = mongoose.connection.db
    let otherUser: { name: string; image?: string | null } | null = null
    if (db) {
      try {
        const userDoc: any = await db.collection("user").findOne(
          { _id: toMongoId(participantId) },
          { projection: { name: 1, image: 1 } } as any
        )
        if (userDoc) {
          otherUser = { name: userDoc.name, image: userDoc.image || null }
        }
      } catch { /* ignore */ }
    }

    res.json({
      conversation: {
        _id: conversation._id.toString(),
        participants: conversation.participants,
        otherUserId: participantId,
        otherUserName: otherUser?.name || "Unknown",
        otherUserImage: otherUser?.image || null,
        lastMessage: conversation.lastMessage || null,
        lastMessageBy: conversation.lastMessageBy || null,
        lastMessageAt: conversation.lastMessageAt || null,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        isNew: !conversation.lastMessage,
      },
    })
  } catch (error) {
    console.error("Get or create conversation error:", error)
    res.status(500).json({ error: "Failed to get or create conversation" })
  }
}

export async function getMessages(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user!.id
    const { id } = req.params
    const conversationId = typeof id === "string" ? id : id[0]

    const conversation = await Conversation.findById(conversationId)
    if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return }
    if (!conversation.participants.includes(currentUserId)) {
      res.status(403).json({ error: "Not a participant of this conversation" }); return
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean()

    const mapped = (messages as any[]).map((m: any) => ({
      _id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      senderId: m.senderId,
      senderName: m.senderName,
      senderImage: m.senderImage || null,
      receiverId: m.receiverId,
      content: m.content,
      read: m.read,
      createdAt: m.createdAt,
    }))

    res.json({ messages: mapped })
  } catch (error) {
    console.error("Get messages error:", error)
    res.status(500).json({ error: "Failed to fetch messages" })
  }
}

export async function sendMessage(req: AuthRequest, res: Response) {
  try {
    const currentUser = req.user!
    const { id } = req.params
    const conversationId = typeof id === "string" ? id : id[0]
    const { content } = req.body

    if (!content || !content.trim()) { res.status(400).json({ error: "Message content is required" }); return }

    const conversation = await Conversation.findById(conversationId)
    if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return }
    if (!conversation.participants.includes(currentUser.id)) {
      res.status(403).json({ error: "Not a participant of this conversation" }); return
    }

    const receiverId = conversation.participants.find((p) => p !== currentUser.id)!

    const db = mongoose.connection.db
    let receiverName = "Unknown"
    if (db) {
      try {
        const receiverDoc: any = await db.collection("user").findOne(
          { _id: toMongoId(receiverId) },
          { projection: { name: 1 } } as any
        )
        if (receiverDoc) receiverName = receiverDoc.name
      } catch { /* ignore */ }
    }

    const message = await Message.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderImage: currentUser.image || undefined,
      receiverId,
      receiverName,
      content: content.trim(),
    })

    conversation.set({
      lastMessage: content.trim().slice(0, 100),
      lastMessageBy: currentUser.id,
      lastMessageAt: new Date(),
    })
    await conversation.save()

    const msgData = message.toObject()
    res.json({
      message: {
        _id: msgData._id.toString(),
        conversationId: msgData.conversationId.toString(),
        senderId: msgData.senderId,
        senderName: msgData.senderName,
        senderImage: msgData.senderImage || null,
        receiverId: msgData.receiverId,
        content: msgData.content,
        read: msgData.read,
        createdAt: msgData.createdAt,
      },
    })

    createNotification({
      userId: receiverId,
      type: "new_message",
      title: "New Message",
      message: `${currentUser.name} sent you a message`,
      referenceId: conversationId,
    })
  } catch (error) {
    console.error("Send message error:", error)
    res.status(500).json({ error: "Failed to send message" })
  }
}
