import { Response } from "express";
import { Server } from "socket.io";
import { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../prisma";

let ioInstance: Server;

export const setIoInstance = (io: Server) => {
  ioInstance = io;
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { receiverUsername, content } = req.body;
    const senderId = req.user?.userId;

    if (!senderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!receiverUsername || !content) {
      return res
        .status(400)
        .json({ error: "receiverUsername and content are required" });
    }

    // Find receiver by username
    const receiver = await prisma.user.findUnique({
      where: { username: receiverUsername.trim().toLowerCase() },
    });

    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    const receiverId = receiver.id;

    // Get or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: senderId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: senderId },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          user1Id: Math.min(senderId, receiverId),
          user2Id: Math.max(senderId, receiverId),
        },
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        conversationId: conversation.id,
        senderId,
        receiverId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            socketId: true,
            isOnline: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Send message to receiver if online
    const receiverStatus = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { socketId: true, isOnline: true },
    });

    // Emit to sender as well for confirmation
    if (message.sender.socketId && message.sender.isOnline) {
      ioInstance.to(message.sender.socketId).emit("message:sent", message);
    }
    // Emit to receiver
    if (receiverStatus?.socketId && receiverStatus.isOnline) {
      ioInstance.to(receiverStatus.socketId).emit("message:receive", message);
    }

    res.json({
      success: true,
      message,
      realTimeSent: receiver?.isOnline || false,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

export const getChatHistory = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user?.userId;
    const otherUsername = req.params.otherUsername;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find other user by username
    const otherUser = await prisma.user.findUnique({
      where: { username: otherUsername.trim().toLowerCase() },
    });

    if (!otherUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const otherUserId = otherUser.id;

    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: otherUserId },
          { user1Id: otherUserId, user2Id: currentUserId },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
            receiver: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        user1: {
          select: {
            id: true,
            username: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.json({
      conversation: conversation || null,
      messages: conversation?.messages || [],
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};
