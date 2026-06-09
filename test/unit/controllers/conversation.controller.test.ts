import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { getAllConversations } from '@/controllers/conversation.controller';
import {
  createMockAuthRequest,
  createMockResponse,
  createTestUser,
  createTestConversation,
  createTestMessage,
  mockPrismaConversation,
  mockPrismaUser,
  mockPrismaMessage,
  resetAllMocks,
  expectJsonResponse,
  expectErrorResponse,
} from '../../utils/test-helpers';

jest.mock('@/prisma', () => ({
  get conversation() { return mockPrismaConversation; },
  get user() { return mockPrismaUser; },
  get message() { return mockPrismaMessage; },
}));

describe('Conversation Controller', () => {
  let req: AuthRequest;
  let res: Response;

  beforeEach(() => {
    resetAllMocks(mockPrismaConversation, mockPrismaUser, mockPrismaMessage);
    req = createMockAuthRequest({ userId: 1, username: 'testuser' });
    res = createMockResponse();
  });

  describe('getAllConversations', () => {
    it('should return all conversations for authenticated user', async () => {
      const user = createTestUser({ id: 1 });
      const otherUser = createTestUser({ id: 2, username: 'otheruser' });
      const conversation = createTestConversation({ id: 1, user1Id: 1, user2Id: 2 });
      const message = createTestMessage({ id: 1, conversationId: 1, senderId: 2, receiverId: 1 });

      const conversationsWithRelations = [{
        ...conversation,
        user1: user,
        user2: otherUser,
        messages: [message],
      }];

      mockPrismaConversation.findMany.mockResolvedValue(conversationsWithRelations);

      await getAllConversations(req, res);

      expect(mockPrismaConversation.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ user1Id: 1 }, { user2Id: 1 }],
        },
        include: {
          user1: { select: { id: true, username: true, isOnline: true, lastSeen: true } },
          user2: { select: { id: true, username: true, isOnline: true, lastSeen: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { id: true, username: true } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
      expectJsonResponse(res, 200);
      expect(res.json).toHaveBeenCalledWith([
        {
          conversationId: 1,
          otherUser,
          lastMessage: expect.objectContaining({ id: 1 }),
          updatedAt: expect.any(Date),
        },
      ]);
    });

    it('should return empty array if no conversations exist', async () => {
      mockPrismaConversation.findMany.mockResolvedValue([]);

      await getAllConversations(req, res);

      expectJsonResponse(res, 200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should return 401 if user not authenticated', async () => {
      req = createMockAuthRequest(undefined);

      await getAllConversations(req, res);

      expectErrorResponse(res, 401, 'Unauthorized');
    });

    it('should return 500 on database error', async () => {
      mockPrismaConversation.findMany.mockRejectedValue(new Error('DB Error'));

      await getAllConversations(req, res);

      expectErrorResponse(res, 500, 'Failed to fetch conversations');
    });

    it('should handle conversation where user is user2', async () => {
      const user = createTestUser({ id: 1 });
      const otherUser = createTestUser({ id: 2, username: 'otheruser' });
      const conversation = createTestConversation({ id: 1, user1Id: 2, user2Id: 1 });
      const message = createTestMessage({ id: 1, conversationId: 1, senderId: 2, receiverId: 1 });

      const conversationsWithRelations = [{
        ...conversation,
        user1: otherUser,
        user2: user,
        messages: [message],
      }];

      mockPrismaConversation.findMany.mockResolvedValue(conversationsWithRelations);

      await getAllConversations(req, res);

      expectJsonResponse(res, 200);
      expect(res.json).toHaveBeenCalledWith([
        {
          conversationId: 1,
          otherUser,
          lastMessage: expect.objectContaining({ id: 1 }),
          updatedAt: expect.any(Date),
        },
      ]);
    });
  });
});