import { generateReferralCode } from '../../src/utils/codeGenerator';

// Mock the config module
jest.mock('../../src/config', () => ({
  config: {
    REFERRAL_CODE_PREFIX: 'JUSTO',
    REFERRAL_CODE_LENGTH: 8,
    REDIS_URL: 'redis://localhost:6379',
  },
}));

describe('generateReferralCode', () => {
  it('generates code with correct prefix', () => {
    const code = generateReferralCode();
    expect(code.startsWith('JUSTO-')).toBe(true);
  });

  it('generates code with correct total length', () => {
    const code = generateReferralCode();
    // prefix "JUSTO" + "-" + 8 chars = 14
    expect(code.length).toBe(14);
  });

  it('generates unique codes across multiple calls', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateReferralCode());
    }
    // With 8 chars from a 32-char alphabet, collisions are extremely unlikely
    expect(codes.size).toBe(100);
  });

  it('only contains valid characters', () => {
    const code = generateReferralCode();
    const randomPart = code.split('-')[1];
    const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    expect(randomPart).toMatch(validChars);
  });
});
