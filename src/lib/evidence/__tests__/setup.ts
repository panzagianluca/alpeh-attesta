/**
 * Jest test setup - Mock external dependencies
 */

// Mock @storacha/client since it's ES modules and causes issues in Jest
jest.mock('@storacha/client', () => ({
  create: jest.fn(() => ({
    uploadFile: jest.fn(),
    uploadDirectory: jest.fn(),
  })),
}));

// Mock crypto.subtle for node environment
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn(async (_algorithm: string, _data: Uint8Array) => {
        // Simple mock hash for testing - return deterministic buffer
        return new ArrayBuffer(32); // SHA-256 size
      }),
    },
    getRandomValues: jest.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

// Mock fetch for IPFS gateway verification tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    status: 200,
  } as Response)
);

// Mock process.env for testing
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});
