import { Response } from 'express';
import { Server } from 'socket.io';
import { AuthRequest } from '@/middleware/auth.middleware';
import {
  sendMessage,
  getChatHistory,
  setIoInstance,
} from '@/controllers/message.controller';
import {
  createMockAuthRequest,
  createMockResponse,
  createTestUser,
  createTestConversation,
  createTestMessage,
  mockPrismaUser,
  mockPrismaConversation,
  mockPrismaMessage,
  resetAllMocks,
  expectJsonResponse,
  expectErrorResponse,
} from '../../utils/test-helpers';

jest.mock('@/prisma', () => ({
  get user() { return mockPrismaUser; },
  get conversation() { return mockPrismaConversation; },
  get message() { return mockPrismaMessage; },
}));

const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
} as unknown as Server;

describe('Message Controller', () => {
  let req: AuthRequest;
  let res: Response;

  beforeEach(() => {
    resetAllMocks(mockPrismaUser, mockPrismaConversation, mockPrismaMessage);
    (mockIo.to as jest.Mock).mockReturnThis();
    setIoInstance(mockIo);
    req = createMockAuthRequest({ userId: 1, username: 'sender' });
    res = createMockResponse();
  });

  describe('sendMessage', () => {
    // const sender = createTestUser({ id: 1, username: 'sender', socketId: 'socket-1', isOnline: true });
    const receiver = createTestUser({ id: 2, username: 'receiver', socketId: 'socket-2', isOnline: true });
    const conversation = createTestConversation({ id: 1, user1Id: 1, user2Id: 2 });
    const message = createTestMessage({
      id: 1,
      content: 'Hello!',
      conversationId: 1,
      senderId: 1,
      receiverId: 2,
      sender: { id: 1, username: 'sender', socketId: 'socket-1', isOnline: true },
      receiver: { id: 2, username: 'receiver' },
    });

    it('should send message successfully when both users exist', async () => {
      req.body = { receiverUsername: 'receiver', content: 'Hello!' };
      mockPrismaUser.findUnique.mockImplementation(async (args) => {
        if (args?.where?.username === 'receiver') return receiver;
        if (args?.where?.id === 2) return { socketId: 'socket-2', isOnline: true };
        return null;
      });
      mockPrismaConversation.findFirst.mockResolvedValue(conversation);
      mockPrismaMessage.create.mockResolvedValue(message);

      await sendMessage(req, res);

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { username: 'receiver' },
      });
      expect(mockPrismaConversation.findFirst).toHaveBeenCalled();
      expect(mockPrismaMessage.create).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('socket-1');
      expect(mockIo.to).toHaveBeenCalledWith('socket-2');
      expectJsonResponse(res, 200, { success: true, realTimeSent: true });
    });

    it('should create new conversation if none exists', async () => {
      req.body = { receiverUsername: 'receiver', content: 'Hello!' };
      mockPrismaUser.findUnique.mockImplementation(async (args) => {
        if (args?.where?.username === 'receiver') return receiver;
        if (args?.where?.id === 2) return { socketId: 'socket-2', isOnline: true };
        return null;
      });
      mockPrismaConversation.findFirst.mockResolvedValue(null);
      mockPrismaConversation.create.mockResolvedValue(conversation);
      mockPrismaMessage.create.mockResolvedValue(message);

      await sendMessage(req, res);

      expect(mockPrismaConversation.create).toHaveBeenCalledWith({
        data: { user1Id: 1, user2Id: 2 },
      });
      expectJsonResponse(res, 200, { success: true });
    });

    it('should return 401 if user not authenticated', async () => {
      req = createMockAuthRequest(undefined);
      req.body = { receiverUsername: 'receiver', content: 'Hello!' };

      await sendMessage(req, res);

      expectErrorResponse(res, 401, 'Unauthorized');
    });

    it('should return 400 if receiverUsername is missing', async () => {
      req.body = { content: 'Hello!' };

      await sendMessage(req, res);

      expectErrorResponse(res, 400, 'receiverUsername and content are required');
    });

    it('should return 400 if content is missing', async () => {
      req.body = { receiverUsername: 'receiver' };

      await sendMessage(req, res);

      expectErrorResponse(res, 400, 'receiverUsername and content are required');
    });

    it('should return 404 if receiver not found', async () => {
      req.body = { receiverUsername: 'nonexistent', content: 'Hello!' };
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await sendMessage(req, res);

      expectErrorResponse(res, 404, 'Receiver not found');
    });

    it('should return 500 on database error', async () => {
      req.body = { receiverUsername: 'receiver', content: 'Hello!' };
      mockPrismaUser.findUnique.mockRejectedValue(new Error('DB Error'));

      await sendMessage(req, res);

      expectErrorResponse(res, 500, 'Failed to send message');
    });

    it('should handle offline receiver gracefully', async () => {
      const offlineReceiver = createTestUser({ id: 2, username: 'receiver', isOnline: false, socketId: null });
      const offlineMessage = { ...message, realTimeSent: false };
      
      req.body = { receiverUsername: 'receiver', content: 'Hello!' };
      mockPrismaUser.findUnique.mockImplementation(async (args) => {
        if (args?.where?.username === 'receiver') return offlineReceiver;
        if (args?.where?.id === 2) return { socketId: null, isOnline: false };
        return null;
      });
      mockPrismaConversation.findFirst.mockResolvedValue(conversation);
      mockPrismaMessage.create.mockResolvedValue(offlineMessage);

      await sendMessage(req, res);

      expectJsonResponse(res, 200, { success: true, realTimeSent: false });
    });
  });

  describe('getChatHistory', () => {
    const conversation = createTestConversation({ id: 1, user1Id: 1, user2Id: 2 });
    const messages = [
      createTestMessage({ id: 1, content: 'Hi', senderId: 1, receiverId: 2 }),
      createTestMessage({ id: 2, content: 'Hello!', senderId: 2, receiverId: 1 }),
    ];

    it('should return chat history for valid users', async () => {
      req.params = { otherUsername: 'receiver' };
      mockPrismaUser.findUnique.mockResolvedValue(createTestUser({ id: 2, username: 'receiver' }));
      mockPrismaConversation.findFirst.mockResolvedValue({
        ...conversation,
        messages,
        user1: { id: 1, username: 'sender' },
        user2: { id: 2, username: 'receiver' },
      });

      await getChatHistory(req, res);

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { username: 'receiver' },
      });
      expect(mockPrismaConversation.findFirst).toHaveBeenCalled();
      expectJsonResponse(res, 200);
    });

    it('should return 401 if user not authenticated', async () => {
      req = createMockAuthRequest(undefined);
      req.params = { otherUsername: 'receiver' };

      await getChatHistory(req, res);

      expectErrorResponse(res, 401, 'Unauthorized');
    });

    it('should return 404 if other user not found', async () => {
      req.params = { otherUsername: 'nonexistent' };
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await getChatHistory(req, res);

      expectErrorResponse(res, 404, 'User not found');
    });

    it('should return empty messages if no conversation exists', async () => {
      req.params = { otherUsername: 'receiver' };
      mockPrismaUser.findUnique.mockResolvedValue(createTestUser({ id: 2, username: 'receiver' }));
      mockPrismaConversation.findFirst.mockResolvedValue(null);

      await getChatHistory(req, res);

      expectJsonResponse(res, 200, { conversation: null, messages: [] });
    });

    it('should return 500 on database error', async () => {
      req.params = { otherUsername: 'receiver' };
      mockPrismaUser.findUnique.mockRejectedValue(new Error('DB Error'));

      await getChatHistory(req, res);

      expectErrorResponse(res, 500, 'Failed to fetch chat history');
    });
  });
});