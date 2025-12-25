import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../prisma";

export const getAllConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Transform to show other user and last message
    const conversationList = conversations.map((conv) => {
      const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
      const lastMessage = conv.messages[0] || null;

      return {
        conversationId: conv.id,
        otherUser,
        lastMessage,
        updatedAt: conv.updatedAt,
      };
    });

    res.json(conversationList);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};
