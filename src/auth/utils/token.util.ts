import { createHash, randomBytes } from 'crypto';

export const generateOpaqueToken = (bytes = 48): string =>
  randomBytes(bytes).toString('base64url');

export const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');
