import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./prisma";
import { initializeSocket } from "./socket";
import { setIoInstance } from "./controllers/message.controller";
import routes  from "./routes";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Chat server is running" });
});

// API Routes
app.use("/api", routes);

// Set IO instance for message controller
setIoInstance(io);

// Initialize Socket.IO
initializeSocket(io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`
    Chat Server is running!
  📡 Server URL: ${API_URL}
  🔌 Socket.IO: ws://localhost:${PORT}
  `);
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});
