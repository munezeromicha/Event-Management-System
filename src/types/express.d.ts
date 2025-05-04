import { Request } from 'express';

declare global {
  namespace Express {
    interface AuthRequest extends Request {
      user?: {
        id: string;
        role: string;
      };
      headers: {
        authorization?: string;
      };
      params: any;
      query: any;
      body: any;
      method: string;
    }
  }
} 