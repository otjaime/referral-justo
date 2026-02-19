import { config } from '../config';

const generateCodeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferralCode(): string {
  const prefix = config.REFERRAL_CODE_PREFIX;
  const length = config.REFERRAL_CODE_LENGTH;

  let random = '';
  for (let i = 0; i < length; i++) {
    random += generateCodeChars.charAt(Math.floor(Math.random() * generateCodeChars.length));
  }

  return `${prefix}-${random}`;
}
