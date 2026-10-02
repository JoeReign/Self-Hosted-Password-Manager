const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_+=';

export function generatePassword(length = 24): string {
  if (!Number.isInteger(length) || length < 12 || length > 128) throw new Error('Invalid password length.');
  const limit = 256 - (256 % ALPHABET.length);
  let result = '';
  while (result.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(128));
    for (const byte of bytes) {
      if (byte < limit) result += ALPHABET[byte % ALPHABET.length];
      if (result.length === length) break;
    }
    bytes.fill(0);
  }
  return result;
}
