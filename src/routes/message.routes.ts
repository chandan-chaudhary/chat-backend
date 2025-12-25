import { Router } from "express";
import { sendMessage, getChatHistory } from "../controllers/message.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.post("/send", authenticateToken, sendMessage);
router.get("/history/:otherUsername", authenticateToken, getChatHistory);

export default router;
