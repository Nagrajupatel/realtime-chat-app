import crypto from 'crypto';

export function sha256(buffer) {
  const digest = crypto.createHash('sha256').update(buffer).digest();
  return { hex: digest.toString('hex'), base64: digest.toString('base64') };
}
