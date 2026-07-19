import { Response } from "express"
import OpenAI from "openai"
import { ChatSession } from "../models/ChatSession"
import { AuthRequest } from "../types"

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1",
})

const SOLVER_SYSTEM_PROMPT = `You are LifeSolve AI's Problem Solver, an empathetic and insightful AI assistant integrated into a community support platform. Your ONLY purpose is to help users articulate their personal problems and generate structured insights.

## Your Role
1. Listen carefully to the user's problem with warmth and empathy
2. If their description is vague, ask 1-2 clarifying questions
3. Help them structure their thoughts using these categories when relevant:
   - **What's happening** — a clear description of the situation
   - **How it affects them** — emotional, practical, or social impact
   - **What they've tried** — any steps already taken
   - **What they need** — the kind of help or outcome they're looking for
4. Provide actionable insights, potential solutions, or coping strategies
5. Always end your final response in a session with a "### Ready to Share?" section that summarizes the problem clearly and encourages the user to create a community post.

## Style Guidelines
- Use markdown formatting (bold, lists, headings) for readability
- Be warm, non-judgmental, and supportive
- Keep responses reasonably concise but thorough
- Use "### Ready to Share?" as the final section header when wrapping up
- Never generate generic placeholder content`

const CHAT_SYSTEM_PROMPT = `You are LifeSolve AI's Chat Assistant, a warm and empathetic conversational AI integrated into a community support platform called LifeSolve AI. 

## Platform Context
LifeSolve AI is a supportive community where people share life challenges (mental health, career, relationships, finances, etc.) and receive support through AI-powered insights and community engagement.

## Your Role
1. Provide empathetic, non-judgmental emotional support and active listening
2. Offer practical, thoughtful advice for life challenges big and small
3. Guide users to relevant platform features when appropriate:
   - **AI Problem Solver** — for structured problem-solving
   - **Community Posts** — for sharing with others and getting community support
4. Maintain natural conversation context across messages
5. If someone expresses crisis or suicidal thoughts, gently encourage them to contact professional helplines

## Style Guidelines
- Use markdown formatting (bold, lists) for readability
- Be warm, conversational, and supportive
- Keep responses concise but meaningful
- Ask follow-up questions to keep the conversation flowing naturally
- Never generate generic placeholder content`

function buildHistory(messages: { role: string; content: string }[]) {
  return messages.map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
  }))
}

export async function chatSolver(req: AuthRequest, res: Response) {
  try {
    const { message, sessionId } = req.body
    if (!message?.trim()) {
      res.status(400).json({ error: "Message is required" })
      return
    }

    const userId = req.user!.id
    let session = sessionId
      ? await ChatSession.findOne({ _id: sessionId, userId, sessionType: "solver" })
      : null

    if (!session) {
      session = await ChatSession.create({
        userId,
        sessionType: "solver",
        title: message.slice(0, 60) + (message.length > 60 ? "..." : ""),
        messages: [],
      })
    }

    session.messages.push({ role: "user", content: message })
    await session.save()

    const history = buildHistory(session.messages.slice(0, -1))
    const currentMessage = session.messages[session.messages.length - 1].content

    const messages = [
      { role: "system" as const, content: SOLVER_SYSTEM_PROMPT },
      ...history,
      { role: "user" as const, content: currentMessage },
    ]

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("X-Accel-Buffering", "no")

    try {
      const stream = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        stream: true,
      })

      let fullResponse = ""
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ""
        if (text) {
          fullResponse += text
          res.write(`data: ${JSON.stringify({ text })}\n\n`)
        }
      }

      session.messages.push({ role: "assistant", content: fullResponse || "" })
      await session.save()

      res.write(`data: ${JSON.stringify({ done: true, sessionId: session._id.toString() })}\n\n`)
      res.end()
    } catch (streamErr: unknown) {
      const streamMsg = streamErr instanceof Error ? streamErr.message : String(streamErr)
      console.error("AI Solver streaming failed, trying non-streaming:", streamMsg)

      const result = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
      })
      const fullResponse = result.choices[0]?.message?.content || ""

      const words = fullResponse.split(/(?<= )/)
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ text: word })}\n\n`)
      }

      session.messages.push({ role: "assistant", content: fullResponse })
      await session.save()

      res.write(`data: ${JSON.stringify({ done: true, sessionId: session._id.toString() })}\n\n`)
      res.end()
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("AI Solver error:", errMsg)
    const friendlyMsg = errMsg.includes("401") || errMsg.includes("invalid_api_key")
      ? "Groq API key is missing or invalid. Please set a valid GROQ_API_KEY in your .env file."
      : errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate_limit")
        ? "AI service rate limit exceeded. Please wait a moment and try again. (Free tier: 30 req/min)"
        : `AI service error: ${errMsg.slice(0, 200)}`
    if (!res.headersSent) {
      res.status(500).json({ error: friendlyMsg })
    } else {
      res.write(`data: ${JSON.stringify({ error: friendlyMsg })}\n\n`)
      res.end()
    }
  }
}

export async function chatAssistant(req: AuthRequest, res: Response) {
  try {
    const { message, sessionId } = req.body
    if (!message?.trim()) {
      res.status(400).json({ error: "Message is required" })
      return
    }

    const userId = req.user!.id
    let session = sessionId
      ? await ChatSession.findOne({ _id: sessionId, userId, sessionType: "chat" })
      : null

    if (!session) {
      session = await ChatSession.create({
        userId,
        sessionType: "chat",
        title: message.slice(0, 60) + (message.length > 60 ? "..." : ""),
        messages: [],
      })
    }

    session.messages.push({ role: "user", content: message })
    await session.save()

    const history = buildHistory(session.messages.slice(0, -1))
    const currentMessage = session.messages[session.messages.length - 1].content

    const messages = [
      { role: "system" as const, content: CHAT_SYSTEM_PROMPT },
      ...history,
      { role: "user" as const, content: currentMessage },
    ]

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("X-Accel-Buffering", "no")

    try {
      const stream = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        stream: true,
      })

      let fullResponse = ""
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ""
        if (text) {
          fullResponse += text
          res.write(`data: ${JSON.stringify({ text })}\n\n`)
        }
      }

      session.messages.push({ role: "assistant", content: fullResponse || "" })
      await session.save()

      res.write(`data: ${JSON.stringify({ done: true, sessionId: session._id.toString() })}\n\n`)
      res.end()
    } catch (streamErr: unknown) {
      const streamMsg = streamErr instanceof Error ? streamErr.message : String(streamErr)
      console.error("AI Chat streaming failed, trying non-streaming:", streamMsg)

      const result = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
      })
      const fullResponse = result.choices[0]?.message?.content || ""

      const words = fullResponse.split(/(?<= )/)
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ text: word })}\n\n`)
      }

      session.messages.push({ role: "assistant", content: fullResponse })
      await session.save()

      res.write(`data: ${JSON.stringify({ done: true, sessionId: session._id.toString() })}\n\n`)
      res.end()
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("AI Chat error:", errMsg)
    const friendlyMsg = errMsg.includes("401") || errMsg.includes("invalid_api_key")
      ? "Groq API key is missing or invalid. Please set a valid GROQ_API_KEY in your .env file."
      : errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate_limit")
        ? "AI service rate limit exceeded. Please wait a moment and try again. (Free tier: 30 req/min)"
        : `AI service error: ${errMsg.slice(0, 200)}`
    if (!res.headersSent) {
      res.status(500).json({ error: friendlyMsg })
    } else {
      res.write(`data: ${JSON.stringify({ error: friendlyMsg })}\n\n`)
      res.end()
    }
  }
}

export async function getSolverSessions(req: AuthRequest, res: Response) {
  try {
    const sessions = await ChatSession.find({ userId: req.user!.id, sessionType: "solver" })
      .select("title createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .lean()

    const result = sessions.map((s) => ({
      _id: s._id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s.messages.length,
    }))

    res.json({ sessions: result })
  } catch (error) {
    console.error("Get solver sessions error:", error)
    res.status(500).json({ error: "Failed to fetch sessions" })
  }
}

export async function getSolverSessionById(req: AuthRequest, res: Response) {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user!.id,
      sessionType: "solver",
    }).lean()

    if (!session) {
      res.status(404).json({ error: "Session not found" })
      return
    }

    res.json({ session })
  } catch (error) {
    console.error("Get solver session error:", error)
    res.status(500).json({ error: "Failed to fetch session" })
  }
}

export async function getChatSessions(req: AuthRequest, res: Response) {
  try {
    const sessions = await ChatSession.find({ userId: req.user!.id, sessionType: "chat" })
      .select("title createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .lean()

    const result = sessions.map((s) => ({
      _id: s._id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s.messages.length,
    }))

    res.json({ sessions: result })
  } catch (error) {
    console.error("Get chat sessions error:", error)
    res.status(500).json({ error: "Failed to fetch sessions" })
  }
}

export async function getChatSessionById(req: AuthRequest, res: Response) {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user!.id,
      sessionType: "chat",
    }).lean()

    if (!session) {
      res.status(404).json({ error: "Session not found" })
      return
    }

    res.json({ session })
  } catch (error) {
    console.error("Get chat session error:", error)
    res.status(500).json({ error: "Failed to fetch session" })
  }
}

export async function deleteChatSession(req: AuthRequest, res: Response) {
  try {
    const session = await ChatSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!.id,
    })

    if (!session) {
      res.status(404).json({ error: "Session not found" })
      return
    }

    res.json({ message: "Session deleted successfully" })
  } catch (error) {
    console.error("Delete chat session error:", error)
    res.status(500).json({ error: "Failed to delete session" })
  }
}
