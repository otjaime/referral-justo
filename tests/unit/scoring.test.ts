import { calculateScore, ScoreInput } from '../../src/modules/referral/scoring.service';

function makeInput(overrides?: Partial<ScoreInput>): ScoreInput {
  return {
    city: null,
    numLocations: null,
    currentPos: null,
    deliveryPct: null,
    ownerWhatsapp: null,
    ownerEmail: null,
    usedCalculator: false,
    usedDiagnostic: false,
    requestedDemo: false,
    fromMetaAd: false,
    respondedWa: false,
    openedMessages: 0,
    responseTimeMin: null,
    ...overrides,
  };
}

describe('calculateScore', () => {
  it('returns zero for empty input', () => {
    const result = calculateScore(makeInput());
    expect(result).toEqual({ fit: 0, intent: 0, engage: 0, total: 0 });
  });

  // ── FIT tests ──────────────────────────────────────

  it('scores +10 for tier-1 city (case-insensitive)', () => {
    const result = calculateScore(makeInput({ city: 'CDMX' }));
    expect(result.fit).toBe(10);
  });

  it('scores 0 for non-tier-1 city', () => {
    const result = calculateScore(makeInput({ city: 'Cancun' }));
    expect(result.fit).toBe(0);
  });

  it('scores +3 for 1 location', () => {
    const result = calculateScore(makeInput({ numLocations: 1 }));
    expect(result.fit).toBe(3);
  });

  it('scores +7 for 2-5 locations', () => {
    expect(calculateScore(makeInput({ numLocations: 2 })).fit).toBe(7);
    expect(calculateScore(makeInput({ numLocations: 5 })).fit).toBe(7);
  });

  it('scores +10 for 6+ locations', () => {
    expect(calculateScore(makeInput({ numLocations: 6 })).fit).toBe(10);
    expect(calculateScore(makeInput({ numLocations: 20 })).fit).toBe(10);
  });

  it('scores +5 for known POS system', () => {
    const result = calculateScore(makeInput({ currentPos: 'Square' }));
    expect(result.fit).toBe(5);
  });

  it('scores 0 for unknown POS system', () => {
    const result = calculateScore(makeInput({ currentPos: 'custom-thing' }));
    expect(result.fit).toBe(0);
  });

  it('scores delivery percentage tiers', () => {
    expect(calculateScore(makeInput({ deliveryPct: 10 })).fit).toBe(0);
    expect(calculateScore(makeInput({ deliveryPct: 30 })).fit).toBe(3);
    expect(calculateScore(makeInput({ deliveryPct: 60 })).fit).toBe(5);
  });

  it('scores +3 for having WhatsApp', () => {
    const result = calculateScore(makeInput({ ownerWhatsapp: '+5215512345678' }));
    expect(result.fit).toBe(3);
  });

  it('scores +2 for having email', () => {
    const result = calculateScore(makeInput({ ownerEmail: 'test@example.com' }));
    expect(result.fit).toBe(2);
  });

  // ── INTENT tests ──────────────────────────────────

  it('scores +10 for each intent signal', () => {
    expect(calculateScore(makeInput({ usedCalculator: true })).intent).toBe(10);
    expect(calculateScore(makeInput({ usedDiagnostic: true })).intent).toBe(10);
    expect(calculateScore(makeInput({ requestedDemo: true })).intent).toBe(10);
  });

  it('scores +5 for fromMetaAd', () => {
    const result = calculateScore(makeInput({ fromMetaAd: true }));
    expect(result.intent).toBe(5);
  });

  it('accumulates multiple intent signals', () => {
    const result = calculateScore(makeInput({
      usedCalculator: true,
      usedDiagnostic: true,
      requestedDemo: true,
      fromMetaAd: true,
    }));
    expect(result.intent).toBe(35);
  });

  // ── ENGAGE tests ──────────────────────────────────

  it('scores +10 for respondedWa', () => {
    const result = calculateScore(makeInput({ respondedWa: true }));
    expect(result.engage).toBe(10);
  });

  it('scores opened messages tiers', () => {
    expect(calculateScore(makeInput({ openedMessages: 0 })).engage).toBe(0);
    expect(calculateScore(makeInput({ openedMessages: 1 })).engage).toBe(3);
    expect(calculateScore(makeInput({ openedMessages: 3 })).engage).toBe(7);
    expect(calculateScore(makeInput({ openedMessages: 6 })).engage).toBe(10);
  });

  it('scores response time tiers', () => {
    expect(calculateScore(makeInput({ responseTimeMin: 15 })).engage).toBe(10);
    expect(calculateScore(makeInput({ responseTimeMin: 60 })).engage).toBe(5);
    expect(calculateScore(makeInput({ responseTimeMin: 300 })).engage).toBe(2);
    expect(calculateScore(makeInput({ responseTimeMin: 600 })).engage).toBe(0);
  });

  // ── Total / Integration ───────────────────────────

  it('sums fit + intent + engage into total', () => {
    const result = calculateScore(makeInput({
      city: 'Monterrey',
      numLocations: 3,
      currentPos: 'square',
      ownerWhatsapp: '+525512345678',
      usedCalculator: true,
      respondedWa: true,
      openedMessages: 4,
    }));
    // fit: 10 + 7 + 5 + 3 = 25
    // intent: 10
    // engage: 10 + 7 = 17
    expect(result.fit).toBe(25);
    expect(result.intent).toBe(10);
    expect(result.engage).toBe(17);
    expect(result.total).toBe(52);
  });

  it('high-scoring lead reaches auto-qualify threshold', () => {
    const result = calculateScore(makeInput({
      city: 'CDMX',
      numLocations: 6,
      currentPos: 'toast',
      deliveryPct: 60,
      ownerWhatsapp: '+525512345678',
      ownerEmail: 'test@example.com',
      usedCalculator: true,
      usedDiagnostic: true,
      requestedDemo: true,
      respondedWa: true,
      openedMessages: 6,
      responseTimeMin: 10,
    }));
    // fit: 10+10+5+5+3+2 = 35
    // intent: 10+10+10 = 30
    // engage: 10+10+10 = 30
    expect(result.total).toBe(95);
    expect(result.total).toBeGreaterThanOrEqual(60);
  });

  it('minimal-info lead stays below threshold', () => {
    const result = calculateScore(makeInput({
      city: 'Cancun',
      numLocations: 1,
    }));
    // fit: 0 + 3 = 3
    expect(result.total).toBe(3);
    expect(result.total).toBeLessThan(60);
  });
});
