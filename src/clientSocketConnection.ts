import { io, Socket } from "socket.io-client";

const API_URL = process.env.API_URL || "http://localhost:3000";

interface UserStatusData {
  userId: number;
  username: string;
  isOnline: boolean;
}

interface Message {
  id: number;
  content: string;
  createdAt: string;
  sender: {
    id: number;
    username: string;
  };
  receiver: {
    id: number;
    username: string;
  };
}

// Store socket clients for each user
export const userSocketClients = new Map<string, Socket>();

export const createSocketConnection = (
  token: string,
  username: string
): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    const socket = io(API_URL, {
      auth: { token },
      reconnection: true,
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.IO", socket.id);
      console.log(
        `\n ${username} is now online and can receive real-time messages!`
      );
      console.log("\nPress Ctrl+C to disconnect\n");
      resolve(socket); // Resolve the promise with the connected socket
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      reject(error); // Reject the promise on connection error
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO");
    });

    socket.on("message:receive", (message: Message) => {
      console.log("\n New message received:");
      console.log(`From: ${message.sender.username}`);
      console.log(`Content: ${message.content}`);
      console.log(`Time: ${new Date(message.createdAt).toLocaleString()}`);
    });

    socket.on("message:sent", (message: Message) => {
      console.log("\n Message sent successfully!");
      console.log(`To: ${message.receiver.username}`);
      console.log(`Content: ${message.content}`);
      console.log(`Time: ${new Date(message.createdAt).toLocaleString()}`);
    });

    socket.on("user:online", (data: UserStatusData) => {
      console.log(`\n ${data.username} came online`);
    });

    socket.on("user:offline", (data: UserStatusData) => {
      console.log(`\n ${data.username} went offline`);
    });

    socket.on("error", (error: Error) => {
      console.error(" Error:", error);
    });

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("Disconnecting...");
      socket.disconnect();
      process.exit(0);
    });
  });
};

// Helper function to disconnect socket
export const disconnectSocket = (username: string) => {
  const socket = userSocketClients.get(username);
  if (socket) {
    socket.disconnect();
    userSocketClients.delete(username);
    console.log(`Socket disconnected for user ${username}`);
  }
};
