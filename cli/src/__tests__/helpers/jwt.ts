const base64UrlEncode = (value: string): string => {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

export const createTestJwt = (expSeconds: number, extraPayload: Record<string, unknown> = {}): string => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { exp: expSeconds, ...extraPayload };
  return `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}.test-signature`;
};
