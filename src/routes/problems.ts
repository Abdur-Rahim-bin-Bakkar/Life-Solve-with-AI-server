import { Router } from "express"
import {
  createProblem,
  getProblems,
  getProblemById,
  deleteProblem,
  getUserProblems,
} from "../controllers/problemController"
import { authenticate } from "../middleware/auth"

const router = Router()

router.post("/", authenticate, createProblem)
router.get("/", getProblems)
router.get("/my", authenticate, getUserProblems)
router.get("/:id", getProblemById)
router.delete("/:id", authenticate, deleteProblem)

export default router
