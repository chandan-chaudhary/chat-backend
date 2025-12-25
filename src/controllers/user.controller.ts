import { Request, Response } from "express";
import prisma from "../prisma";


export const createUser = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    const receivedUsername = username.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: receivedUsername },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        username: receivedUsername,
      },
    });

    res.json({
      id: user.id,
      username: user.username,
      isOnline: user.isOnline,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
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
};

export const getOnlineUsers = async (req: Request, res: Response) => {
  try {
    const onlineUsers = await prisma.user.findMany({
      where: {
        isOnline: true,
      },
      select: {
        id: true,
        username: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    res.json(onlineUsers);
  } catch (error) {
    console.error("Error fetching online users:", error);
    res.status(500).json({ error: "Failed to fetch online users" });
  }
};
