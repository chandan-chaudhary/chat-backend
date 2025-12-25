import { Router } from "express";
import {
  createUser,
  getAllUsers,
  getOnlineUsers,
} from "../controllers/user.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.post("/create", createUser);

// Protected routes
router.get("/", authenticateToken, getAllUsers);
router.get("/online", getOnlineUsers);

export default router;
