import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { ERROR_CODES, sendErrorResponse } from "../utils/validation.js";
import { SystemLogger } from "../utils/logging.js";

const parseOrigins = (): string[] =>
  (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isOriginAllowedInternal = (origin: string | undefined): boolean => {
  if (!origin) return true;
  const allowed = parseOrigins();
  if (allowed.length === 0) {
    // When not configured, allow any origin but warn for visibility.
    SystemLogger.log("warn", "CORS origin allowed: env allow-list empty", {
      metadata: { origin },
    });
    return true;
  }
  return allowed.includes(origin);
};

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isOriginAllowedInternal(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error("CORS blocked");
    SystemLogger.log("warn", "CORS origin blocked", {
      metadata: {
        origin,
        allowed_origins: parseOrigins(),
      },
    });
    callback(error, false);
  },
  credentials: true,
});

export const corsErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.message === "CORS blocked") {
    sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, "Origin not allowed by CORS policy");
    return;
  }
  next(err);
};

export const addVaryHeader = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Vary", "Origin");
  next();
};

export const isOriginAllowed = (origin: string | undefined): boolean => isOriginAllowedInternal(origin);

export const logCorsConfig = () => {
  console.log("CORS Configuration:");
  console.log("- NODE_ENV:", process.env.NODE_ENV);
  console.log("- Allowed origins (CORS_ORIGINS):", parseOrigins());
  console.log("- Credentials:", true);
};

export const createCorsMiddleware = (_routePattern?: string) => corsMiddleware;

export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
};
