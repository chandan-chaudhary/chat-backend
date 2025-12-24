import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import prisma from "./prisma";
import { initializeSocket } from "./socket";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Chat server is running" });
});

// Simple user creation endpoint (for testing - no registration needed)
app.post("/api/users/create", async (req, res) => {
  try {
    const { username, autoConnect } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      // Create new user and mark as online if autoConnect is true
      user = await prisma.user.create({
        data: {
          username,
          isOnline: autoConnect === true,
        },
      });
    } else if (autoConnect === true) {
      // If user exists and autoConnect is true, mark them as online
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeen: new Date() },
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    

    res.json({
      user: {
        id: user.id,
        username: user.username,
        isOnline: user.isOnline,
      },
      token,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      username: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Send a message (REST endpoint)
app.post("/api/messages/send", authenticateToken, async (req: any, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.userId;

    if (!receiverId || !content) {
      return res
        .status(400)
        .json({ error: "receiverId and content are required" });
    }

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

    // 🔥 REAL-TIME: Send message to receiver via Socket.IO if online
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { socketId: true, isOnline: true },
    });

    if (receiver?.socketId && receiver.isOnline) {
      io.to(receiver.socketId).emit("message:receive", message);
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
});

// Get chat history between two users
app.get(
  "/api/messages/history/:otherUserId",
  authenticateToken,
  async (req: any, res) => {
    try {
      const currentUserId = req.user.userId;
      const otherUserId = parseInt(req.params.otherUserId);

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
  }
);

// Get all conversations for current user
app.get("/api/conversations", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;

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
});

// Mark message as read
app.patch(
  "/api/messages/:messageId/read",
  authenticateToken,
  async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.user.userId;

      // Verify the message belongs to the user (as receiver)
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          receiverId: userId,
        },
      });

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
      });

      res.json({
        success: true,
        message: updatedMessage,
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  }
);

// Get unread message count
app.get(
  "/api/messages/unread/count",
  authenticateToken,
  async (req: any, res) => {
    try {
      const userId = req.user.userId;

      const unreadCount = await prisma.message.count({
        where: {
          receiverId: userId,
          isRead: false,
        },
      });

      res.json({ unreadCount });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  }
);

// Initialize Socket.IO
initializeSocket(io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`
  🚀 Chat Server is running!
  
  📡 Server URL: http://localhost:${PORT}
  🔌 Socket.IO: ws://localhost:${PORT}
  
  📝 API Endpoints:
  - GET  /health - Health check
  - POST /api/users/create - Create/get user & token
  - GET  /api/users - Get all users
  
  `);
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});
