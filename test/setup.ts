import { jest, beforeEach, afterAll } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.ARCJET_KEY = 'test-arcjet-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.clearAllMocks();
});

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
