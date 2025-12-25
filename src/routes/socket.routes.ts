import { Router } from "express";
import {
  connectSocket,
  disconnectSocketController,
} from "../controllers/socket.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.post("/connect", connectSocket);
router.post("/disconnect", authenticateToken, disconnectSocketController);

export default router;
