import { Router } from "express";
import { getAllConversations } from "../controllers/conversation.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticateToken, getAllConversations);

export default router;
