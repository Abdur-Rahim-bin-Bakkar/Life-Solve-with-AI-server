import { Router } from "express"
import {
  createProblem,
  getProblems,
  getProblemById,
  deleteProblem,
  getUserProblems,
} from "../controllers/problemController"
import { toggleReaction } from "../controllers/reactionController"
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from "../controllers/commentController"
import { authenticate } from "../middleware/auth"

const router = Router()

router.post("/", authenticate, createProblem)
router.get("/", getProblems)
router.get("/my", authenticate, getUserProblems)
router.delete("/:id", authenticate, deleteProblem)
router.get("/:id", getProblemById)

router.post("/:id/react", authenticate, toggleReaction)

router.get("/:id/comments", getComments)
router.post("/:id/comments", authenticate, createComment)
router.put("/:id/comments/:commentId", authenticate, updateComment)
router.delete("/:id/comments/:commentId", authenticate, deleteComment)

export default router
