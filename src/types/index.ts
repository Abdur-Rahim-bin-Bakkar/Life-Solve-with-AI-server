import { Request } from "express"

export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string
}

export interface AuthRequest extends Request {
  user?: AuthUser
}
