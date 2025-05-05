import { Request } from 'express';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: User;
  headers: {
    authorization?: string;
    [key: string]: string | string[] | undefined;
  };
  body: any;
  params: any;
  query: any;
  method: string;
} 