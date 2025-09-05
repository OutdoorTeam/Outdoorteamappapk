
import type { Request } from 'express';

declare global {
  namespace Express {
    interface User {
      id: number | string;
      email: string;
      role: 'admin' | 'user' | string;
    }
    interface Request {
      user?: User;
    }
  }
}
export {};
