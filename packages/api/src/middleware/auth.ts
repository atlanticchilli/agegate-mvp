import type { NextFunction, Request, Response } from "express";
import { getAuth } from "../lib/firebase";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export async function firebaseAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Firebase ID token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid Firebase ID token" });
  }
}
