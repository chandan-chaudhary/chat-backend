import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
}

interface MessageData {
  receiverId: number;
  content: string;
}

export const initializeSocket = (io: Server) => {
  // Middleware for socket authentication
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: number;
        username: string;
      };

      socket.userId = decoded.userId;
      socket.username = decoded.username;

      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.username} (ID: ${socket.userId})`);

    // Update user online status and socket ID
    if (socket.userId) {
      await prisma.user.update({
        where: { id: socket.userId },
        data: {
          isOnline: true,
          socketId: socket.id,
          lastSeen: new Date(),
        },
      });

      // Notify others about online status
      socket.broadcast.emit("user:online", {
        userId: socket.userId,
        username: socket.username,
        isOnline: true,
      });
    }

    // Handle sending messages
    socket.on("message:send", async (data: MessageData) => {
      try {
        if (!socket.userId) return;

        const { receiverId, content } = data;

        // Get or create conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            OR: [
              { user1Id: socket.userId, user2Id: receiverId },
              { user1Id: receiverId, user2Id: socket.userId },
            ],
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              user1Id: Math.min(socket.userId, receiverId),
              user2Id: Math.max(socket.userId, receiverId),
            },
          });
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            content,
            conversationId: conversation.id,
            senderId: socket.userId,
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

        // Send message to receiver if online
        const receiver = await prisma.user.findUnique({
          where: { id: receiverId },
          select: { socketId: true, isOnline: true },
        });

        if (receiver?.socketId && receiver.isOnline) {
          io.to(receiver.socketId).emit("message:receive", message);
        }

        // Send confirmation to sender
        socket.emit("message:sent", message);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle fetch chat history
    socket.on("chat:history", async (data: { otherUserId: number }) => {
      try {
        if (!socket.userId) return;

        const { otherUserId } = data;

        const conversation = await prisma.conversation.findFirst({
          where: {
            OR: [
              { user1Id: socket.userId, user2Id: otherUserId },
              { user1Id: otherUserId, user2Id: socket.userId },
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
          },
        });

        socket.emit("chat:history:response", {
          messages: conversation?.messages || [],
        });
      } catch (error) {
        console.error("Error fetching chat history:", error);
        socket.emit("error", { message: "Failed to fetch chat history" });
      }
    });

    // Handle mark message as read
    socket.on("message:read", async (data: { messageId: number }) => {
      try {
        await prisma.message.update({
          where: { id: data.messageId },
          data: { isRead: true },
        });

        socket.emit("message:read:success", { messageId: data.messageId });
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });

    // Handle get online users
    socket.on("users:online", async () => {
      try {
        const onlineUsers = await prisma.user.findMany({
          where: { isOnline: true },
          select: {
            id: true,
            username: true,
            isOnline: true,
            lastSeen: true,
          },
        });

        socket.emit("users:online:response", onlineUsers);
      } catch (error) {
        console.error("Error fetching online users:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.username}`);

      if (socket.userId) {
        await prisma.user.update({
          where: { id: socket.userId },
          data: {
            isOnline: false,
            socketId: null,
            lastSeen: new Date(),
          },
        });

        // Notify others about offline status
        socket.broadcast.emit("user:offline", {
          userId: socket.userId,
          username: socket.username,
          isOnline: false,
        });
      }
    });
  });
};
