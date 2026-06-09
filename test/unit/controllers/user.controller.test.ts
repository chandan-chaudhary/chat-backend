import { Request, Response } from 'express';
import {
  createUser,
  getAllUsers,
  getOnlineUsers,
} from '@/controllers/user.controller';
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
  mockPrismaUser,
  resetAllMocks,
  expectJsonResponse,
  expectErrorResponse,
} from '../../utils/test-helpers';

jest.mock('@/prisma', () => ({
  get user() {
    return mockPrismaUser;
  },
}));

describe('User Controller', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    resetAllMocks(mockPrismaUser);
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const testUser = createTestUser({ id: 1, username: 'newuser' });
      req.body = { username: 'newuser' };
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue(testUser);

      await createUser(req as Request, res as Response);

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { username: 'newuser' },
      });
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: { username: 'newuser' },
      });
      expectJsonResponse(res, 200, {
        id: 1,
        username: 'newuser',
        isOnline: true,
      });
    });

    it('should return 400 if username is missing', async () => {
      req.body = {};

      await createUser(req as Request, res as Response);

      expectErrorResponse(res, 400, 'Username is required');
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaUser.create).not.toHaveBeenCalled();
    });

    it('should return 400 if username is empty string', async () => {
      req.body = { username: '' };

      await createUser(req as Request, res as Response);

      expectErrorResponse(res, 400, 'Username is required');
    });

    it('should return 409 if username already exists', async () => {
      const existingUser = createTestUser({ id: 1, username: 'existing' });
      req.body = { username: 'existing' };
      mockPrismaUser.findUnique.mockResolvedValue(existingUser);

      await createUser(req as Request, res as Response);

      expectErrorResponse(res, 409, 'Username already exists');
      expect(mockPrismaUser.create).not.toHaveBeenCalled();
    });

    it('should trim and lowercase username', async () => {
      const testUser = createTestUser({ id: 1, username: 'testuser' });
      req.body = { username: '  TestUser  ' };
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue(testUser);

      await createUser(req as Request, res as Response);

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: { username: 'testuser' },
      });
    });

    it('should return 500 on database error', async () => {
      req.body = { username: 'newuser' };
      mockPrismaUser.findUnique.mockRejectedValue(new Error('DB Error'));

      await createUser(req as Request, res as Response);

      expectErrorResponse(res, 500, 'Failed to create user');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users with selected fields', async () => {
      const users = [
        createTestUser({ id: 1, username: 'user1', isOnline: true }),
        createTestUser({ id: 2, username: 'user2', isOnline: false }),
      ];
      mockPrismaUser.findMany.mockResolvedValue(users);

      await getAllUsers(req as Request, res as Response);

      expect(mockPrismaUser.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          username: true,
          isOnline: true,
          lastSeen: true,
        },
      });
      expectJsonResponse(res, 200);
      expect(res.json).toHaveBeenCalledWith(users);
    });

    it('should return empty array if no users exist', async () => {
      mockPrismaUser.findMany.mockResolvedValue([]);

      await getAllUsers(req as Request, res as Response);

      expectJsonResponse(res, 200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should return 500 on database error', async () => {
      mockPrismaUser.findMany.mockRejectedValue(new Error('DB Error'));

      await getAllUsers(req as Request, res as Response);

      expectErrorResponse(res, 500, 'Failed to fetch users');
    });
  });

  describe('getOnlineUsers', () => {
    it('should return only online users', async () => {
      const onlineUsers = [
        createTestUser({ id: 1, username: 'user1', isOnline: true }),
        createTestUser({ id: 2, username: 'user2', isOnline: true }),
      ];
      mockPrismaUser.findMany.mockResolvedValue(onlineUsers);

      await getOnlineUsers(req as Request, res as Response);

      expect(mockPrismaUser.findMany).toHaveBeenCalledWith({
        where: { isOnline: true },
        select: {
          id: true,
          username: true,
          isOnline: true,
          lastSeen: true,
        },
      });
      expectJsonResponse(res, 200);
      expect(res.json).toHaveBeenCalledWith(onlineUsers);
    });

    it('should return empty array if no online users', async () => {
      mockPrismaUser.findMany.mockResolvedValue([]);

      await getOnlineUsers(req as Request, res as Response);

      expectJsonResponse(res, 200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should return 500 on database error', async () => {
      mockPrismaUser.findMany.mockRejectedValue(new Error('DB Error'));

      await getOnlineUsers(req as Request, res as Response);

      expectErrorResponse(res, 500, 'Failed to fetch online users');
    });
  });
});
