import "express";

declare global {
  namespace Express {
    interface Request {
      context?: {
        tenantId?: string;
        plan?: {
          name: string;
          burst: number;
          rate: number;
          monthlyQuota: number;
          enforcement: "hard" | "soft";
        };
      };
    }
  }
}

