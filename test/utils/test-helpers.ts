import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import jwt from 'jsonwebtoken';

export const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  method: 'GET',
  path: '/',
  originalUrl: '/',
  get: jest.fn(),
  ...overrides,
}) as Request;

export const createMockAuthRequest = (
  user?: { userId: number; username: string },
  overrides: Partial<AuthRequest> = {}
): AuthRequest => {
  const baseRequest = createMockRequest(overrides);
  return {
    ...baseRequest,
    user,
    headers: {
      ...baseRequest.headers,
      ...(user && { authorization: `Bearer ${generateTestToken(user)}` }),
      ...overrides.headers,
    },
  } as unknown as AuthRequest;
};

export const createMockResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

export const createMockNext = (): NextFunction => jest.fn();

export const generateTestToken = (
  payload: { userId: number; username: string },
  secret = 'test-secret-key-for-testing',
  expiresIn = '1h'
): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
};

export const createTestUser = (overrides: Partial<{
  id: number;
  username: string;
  isOnline: boolean;
  socketId: string | null;
  lastSeen: Date | null;
}> = {}) => ({
  id: 1,
  username: 'testuser',
  isOnline: true,
  socketId: 'socket-123',
  lastSeen: new Date(),
  ...overrides,
});

export const createTestConversation = (overrides: Partial<{
  id: number;
  user1Id: number;
  user2Id: number;
  createdAt: Date;
  updatedAt: Date;
}> = {}) => ({
  id: 1,
  user1Id: 1,
  user2Id: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestMessage = (overrides: Partial<{
  id: number;
  content: string;
  conversationId: number;
  senderId: number;
  receiverId: number;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: number;
    username: string;
    socketId?: string;
    isOnline?: boolean;
  };
  receiver?: {
    id: number;
    username: string;
  };
}> = {}) => ({
  id: 1,
  content: 'Test message',
  conversationId: 1,
  senderId: 1,
  receiverId: 2,
  isRead: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const mockPrismaUser = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

export const mockPrismaConversation = {
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

export const mockPrismaMessage = {
  create: jest.fn(),
  findMany: jest.fn(),
};

export const createMockPrismaUser = () => ({
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

export const createMockPrismaConversation = () => ({
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
});

export const createMockPrismaMessage = () => ({
  create: jest.fn(),
  findMany: jest.fn(),
});

export const resetAllMocks = (...mocks: Array<Record<string, jest.Mock>>) => {
  jest.clearAllMocks();
  mocks.forEach(mockObj => {
    Object.values(mockObj).forEach(mock => mock.mockReset());
  });
};

export const expectJsonResponse = (
  res: Response,
  expectedStatus: number,
  expectedBody?: Record<string, unknown>
) => {
  if ((res.status as jest.Mock).mock.calls.length > 0 && (res.status as jest.Mock).mock.calls[0][0] !== expectedStatus) {
    throw new Error('TEST FAILED WITH UNEXPECTED STATUS ' + (res.status as jest.Mock).mock.calls[0][0] + '. BODY: ' + JSON.stringify((res.json as jest.Mock).mock.calls[0]?.[0]));
  }
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
  if (expectedBody) {
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining(expectedBody));
  }
};

export const expectErrorResponse = (
  res: Response,
  expectedStatus: number,
  expectedError?: string
) => {
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
  if (expectedError) {
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expectedError })
    );
  }
};