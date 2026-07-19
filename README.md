# LifeSolve AI — Backend

A RESTful API backend for a community-driven platform where users share life challenges, get AI-powered insights, and connect with others. Built with Express 5, TypeScript, and MongoDB (Mongoose).

## Overview

LifeSolve AI Backend provides all server-side logic for the platform, including:

- **Problem Management** — CRUD operations for community problem posts
- **Comment System** — Nested comments on problem posts with ownership control
- **Reaction System** — Toggle like/love/sad reactions per user
- **AI Integration** — Streaming AI chat via Groq (OpenAI-compatible) for two modes: problem solver and general assistant
- **Direct Messaging** — Real-time private conversations between users
- **Notification System** — Event-driven notifications for comments, reactions, messages, and post status changes
- **Authentication** — Bearer token session validation via Better Auth
- **Statistics** — Platform-wide and per-user analytics with daily breakdowns

## Key Features

| Feature | Description |
|---------|-------------|
| **Problem CRUD** | Full create, read, update, delete with search, filter, pagination |
| **Comment System** | Create, edit, delete comments on problems |
| **Reactions** | Like, Love, Sad toggle with per-user tracking |
| **AI Solver** | Streaming AI responses for specific problem-solving |
| **AI Chat** | Streaming conversational AI for general support |
| **Direct Messages** | Private conversations with user discovery |
| **Notifications** | 5 event types: problem posted, resolved, comment, reaction, message |
| **User Stats** | Per-user post/comment counts with 7-day activity |
| **Platform Stats** | Global counts for posts, comments, messages, AI chats, users |
| **Auth Middleware** | Session-based authentication via Better Auth tokens |
| **Health Check** | API health endpoint |

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **Express 5** | Web framework |
| **TypeScript** | Type safety |
| **Mongoose 9** | MongoDB ODM |
| **MongoDB** | Database (Atlas) |
| **Groq API** | AI inference (OpenAI-compatible) |
| **Better Auth** | Session management (MongoDB adapter) |
| **CORS** | Cross-Origin Resource Sharing |
| **tsx** | TypeScript execution in development |

## Project Structure

```
src/
├── index.ts                       # Entry point — DNS, dotenv, DB connect, listen
├── app.ts                         # Express app — CORS, JSON, routes, error handler
├── config/
│   └── db.ts                      # MongoDB connection via Mongoose
├── types/
│   └── index.ts                   # AuthUser & AuthRequest type definitions
├── middleware/
│   └── auth.ts                    # Bearer token authentication middleware
├── lib/
│   └── createNotification.ts      # Utility to persist notifications
├── models/
│   ├── Problem.ts                 # Problem schema (title, description, category, etc.)
│   ├── Comment.ts                 # Comment schema (problemId, userId, content)
│   ├── Message.ts                 # Conversation + Message schemas (messaging)
│   ├── Notification.ts            # Notification schema (userId, type, message)
│   └── ChatSession.ts             # AI Chat Session schema (solver + chat)
├── controllers/
│   ├── problemController.ts       # 8 functions — problem CRUD + stats
│   ├── commentController.ts       # 4 functions — comment CRUD
│   ├── reactionController.ts      # 1 function — toggle like/love/sad
│   ├── aiController.ts            # 7 functions — AI solver, chat, sessions
│   ├── messageController.ts       # 5 functions — users, conversations, messages
│   └── notificationController.ts  # 4 functions — fetch, mark read, mark all read
└── routes/
    ├── problems.ts                # 13 routes — problems, comments, reactions, stats
    ├── ai.ts                      # 7 routes — AI solver + chat
    ├── messages.ts                # 5 routes — users, conversations, messages
    └── notifications.ts           # 4 routes — notifications
```

## API Endpoints

### Problems — `/api/problems`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/problems` | — | List problems (search, category, sort, page, limit) |
| `GET` | `/api/problems/:id` | — | Get single problem by ID |
| `POST` | `/api/problems` | Bearer | Create a new problem |
| `PUT` | `/api/problems/:id` | Bearer | Update problem (owner only) |
| `DELETE` | `/api/problems/:id` | Bearer | Delete problem (owner only) |
| `GET` | `/api/problems/my` | Bearer | Get current user's problems |
| `GET` | `/api/problems/stats/my` | Bearer | Get current user's stats |
| `GET` | `/api/problems/stats/overview` | — | Get platform-wide stats |

### Reactions — `/api/problems/:id/react`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/problems/:id/react` | Bearer | Toggle like/love/sad reaction |

### Comments — `/api/problems/:id/comments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/problems/:id/comments` | — | List comments for a problem |
| `POST` | `/api/problems/:id/comments` | Bearer | Create a comment |
| `PUT` | `/api/problems/:id/comments/:commentId` | Bearer | Update comment (owner only) |
| `DELETE` | `/api/problems/:id/comments/:commentId` | Bearer | Delete comment (owner only) |

### AI — `/api/ai`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/ai/solver` | Bearer | AI problem solver (streaming) |
| `GET` | `/api/ai/solver/sessions` | Bearer | List solver sessions |
| `GET` | `/api/ai/solver/sessions/:id` | Bearer | Get solver session detail |
| `POST` | `/api/ai/chat` | Bearer | AI chat assistant (streaming) |
| `GET` | `/api/ai/chat/sessions` | Bearer | List chat sessions |
| `GET` | `/api/ai/chat/sessions/:id` | Bearer | Get chat session detail |
| `DELETE` | `/api/ai/chat/sessions/:id` | Bearer | Delete chat session |

### Messages — `/api`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/users` | Bearer | List all users (except current) |
| `GET` | `/api/messages/conversations` | Bearer | List current user's conversations |
| `POST` | `/api/messages/conversations` | Bearer | Get or create conversation with a user |
| `GET` | `/api/messages/conversations/:id` | Bearer | Get messages in a conversation |
| `POST` | `/api/messages/conversations/:id` | Bearer | Send a message |

### Notifications — `/api`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/notifications` | Bearer | Get notifications (paginated) |
| `GET` | `/api/notifications/unread-count` | Bearer | Get unread notification count |
| `POST` | `/api/notifications/:id/read` | Bearer | Mark notification as read |
| `POST` | `/api/notifications/read-all` | Bearer | Mark all notifications as read |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | — | Health check (status + timestamp) |

## Database Models

### Problem

| Field | Type | Details |
|-------|------|---------|
| `title` | String | Required, trimmed |
| `shortDescription` | String | Required, trimmed |
| `fullDescription` | String | Required, trimmed |
| `category` | String | Required |
| `priority` | String | Enum: Low, Medium, High, Emergency |
| `images` | String[] | Array of image URLs |
| `userId` | String | Required (Better Auth user ID) |
| `userName` | String | Required |
| `userImage` | String | Optional |
| `status` | String | Enum: open, resolved (default: open) |
| `reactions` | Object | `{ likes: String[], loves: String[], sads: String[] }` |

### Comment

| Field | Type | Details |
|-------|------|---------|
| `problemId` | ObjectId | Ref: Problem, indexed |
| `userId` | String | Required |
| `userName` | String | Required |
| `userImage` | String | Optional |
| `content` | String | Required, trimmed |

### Conversation

| Field | Type | Details |
|-------|------|---------|
| `participants` | String[2] | Exactly 2 user IDs, validated |
| `lastMessage` | String | Optional, message preview |
| `lastMessageBy` | String | User ID of last sender |
| `lastMessageAt` | Date | Timestamp of last message |

### Message

| Field | Type | Details |
|-------|------|---------|
| `conversationId` | ObjectId | Ref: Conversation, indexed |
| `senderId` | String | Required |
| `senderName` | String | Required |
| `senderImage` | String | Optional |
| `receiverId` | String | Required |
| `receiverName` | String | Required |
| `content` | String | Required, trimmed |
| `read` | Boolean | Default: false |

### Notification

| Field | Type | Details |
|-------|------|---------|
| `userId` | String | Required, indexed |
| `type` | String | Enum: problem_created, problem_resolved, new_comment, new_reaction, new_message |
| `title` | String | Required |
| `message` | String | Required |
| `referenceId` | String | Required (links to related entity) |
| `read` | Boolean | Default: false |

### ChatSession

| Field | Type | Details |
|-------|------|---------|
| `userId` | String | Required, indexed |
| `sessionType` | String | Enum: solver, chat, indexed |
| `title` | String | Default: "New Session" |
| `messages` | SubDoc[] | Array of `{ role, content }` with timestamps |

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB instance (local or Atlas)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Create environment file
# Edit .env with your configuration
# Required variables:
#   PORT
#   MONGODB_URI
#   CORS_ORIGIN
#   GROQ_API_KEY (for AI features)

# Start development server with hot reload
npm run dev
```

The server will start at `http://localhost:5000`.

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `tsx watch src/index.ts` | Development with hot reload |
| `npm run build` | `tsc` | Compile TypeScript to `dist/` |
| `npm start` | `node dist/index.js` | Run compiled production build |

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Server port |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `GROQ_API_KEY` | Yes (for AI) | — | Groq API key for AI features |

## Authentication Flow

1. The frontend handles user registration/login via Better Auth (handled by Next.js API routes)
2. Better Auth stores sessions in the `session` MongoDB collection
3. All protected API routes require an `Authorization: Bearer <token>` header
4. The `authenticate` middleware validates the token, checks expiry, and attaches `req.user`
5. User IDs are used throughout the system for ownership and notification routing

## Notification Triggers

Notifications are automatically created by controllers when these events occur:

| Event | Triggered By | Receiver |
|-------|-------------|----------|
| Problem created | `createProblem` | Post author |
| Problem resolved | `updateProblem` (status → resolved) | Post author |
| New comment | `createComment` | Problem owner (if not self) |
| New reaction | `toggleReaction` | Problem owner (if not self) |
| New message | `sendMessage` | Message recipient |

## Health Check

```
GET /api/health
Response: { "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and not licensed for public distribution.
