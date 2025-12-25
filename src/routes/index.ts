import { Router } from "express";
import userRoutes from "./user.routes";
import socketRoutes from "./socket.routes";
import messageRoutes from "./message.routes";
import conversationRoutes from "./conversation.routes";

const router = Router();

router.use("/users", userRoutes);
router.use("/socket", socketRoutes);
router.use("/messages", messageRoutes);
router.use("/conversations", conversationRoutes);

export default router;
