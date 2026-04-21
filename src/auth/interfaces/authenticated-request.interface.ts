import { Request } from 'express';
import { RoleKey } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: RoleKey;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
