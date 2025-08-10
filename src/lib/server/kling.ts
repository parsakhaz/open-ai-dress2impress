import jwt from 'jsonwebtoken';
import { getServerEnv } from '@/lib/util/env';

export function generateKlingToken(): string | null {
  const { KLING_ACCESS_KEY, KLING_SECRET_KEY } = getServerEnv();
  if (!KLING_ACCESS_KEY || !KLING_SECRET_KEY) return null;
  const payload = {
    iss: KLING_ACCESS_KEY,
    exp: Math.floor(Date.now() / 1000) + 1800,
    nbf: Math.floor(Date.now() / 1000) - 5,
  } as const;
  return jwt.sign(payload, KLING_SECRET_KEY, { algorithm: 'HS256' });
}


