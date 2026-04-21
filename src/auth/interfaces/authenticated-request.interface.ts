import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  superAdmin?: {
    id: string;
    email: string;
  };
}
