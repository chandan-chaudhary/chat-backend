import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './prisma';
import { initializeSocket } from './socket';
import { setIoInstance } from './controllers/message.controller';
import routes from './routes';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './config/logger';
import { securityMiddleware } from './middleware/security.middleware';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use morgan for HTTP request logging, integrated with winston
app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);
app.use(securityMiddleware);
// Health check endpoint
app.get('/health', (req, res) => {
  logger.info('Health check endpoint accessed');
  res.json({ status: 'ok', message: 'Chat server is running' });
});

// API Routes
app.use('/api', routes);

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
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
