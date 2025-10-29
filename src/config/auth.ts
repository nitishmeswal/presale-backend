import jwt from 'jsonwebtoken';
import { config } from './constants';

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

export const generateToken = (payload: JWTPayload): string => {
  // @ts-ignore - Type overload issue with jsonwebtoken, but this is valid
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.JWT_SECRET) as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};
