import { Response, Request } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  createSocketConnection,
  userSocketClients,
  disconnectSocket,
} from "../clientSocketConnection";
import jwt from "jsonwebtoken";
import prisma from "../prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const connectSocket = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    const receivedUsername = username.trim().toLowerCase();

    // Check if user is already connected
    if (userSocketClients.has(receivedUsername)) {
      const existingSocket = userSocketClients.get(receivedUsername);

      if (existingSocket) {
        return res.json({
          socketId: existingSocket?.id,
          socketConnected: true,
          message: "Already connected",
        });
      }
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { username: receivedUsername },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Connect socket automatically
    let socketId: string | undefined;
    try {
      if (userSocketClients.has(user.username)) {
        socketId = userSocketClients.get(user.username)?.id;
      } else {
        const socket = await createSocketConnection(token, user.username);
        userSocketClients.set(user.username, socket);
        socketId = socket.id;
      }
    } catch (socketError) {
      console.error("Socket connection error during login:", socketError);
      return res.status(500).json({ error: "Failed to connect socket" });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        isOnline: user.isOnline,
      },
      token,
      socketId,
      socketConnected: !!socketId,
    });
  } catch (error) {
    console.error("Error connecting socket:", error);
    res.status(500).json({ error: "Failed to connect socket" });
  }
};

export const disconnectSocketController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const username = req.user?.username;
    console.log(username);

    if (!username) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user has an active socket connection
    if (!userSocketClients.has(username)) {
      return res.json({
        success: true,
        message: "No active connection found",
      });
    }

    // Disconnect the socket
    disconnectSocket(username);

    res.json({
      success: true,
      message: "Socket disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting socket:", error);
    res.status(500).json({ error: "Failed to disconnect socket" });
  }
};
