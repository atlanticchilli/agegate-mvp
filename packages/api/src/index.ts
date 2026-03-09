import cors from "cors";
import express from "express";
import sessionRoutes from "./routes/session";
import { callbackRouter, mockRouter } from "./routes/callback";
import verifySelfieRoutes from "./routes/verify-selfie";
import logsRoutes from "./routes/logs";
import { firebaseAuthMiddleware } from "./middleware/auth";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use("/api/session", cors());
  app.use("/api/verify-selfie", cors());
  app.use("/mock", cors());

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/session", sessionRoutes);
  app.use("/api/verify-selfie", verifySelfieRoutes);
  app.use("/api/callback", callbackRouter);
  app.use("/mock", mockRouter);
  app.use("/api/logs", firebaseAuthMiddleware, logsRoutes);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 8080);
  const app = createApp();
  app.listen(port, () => {
    // Intentional single startup log.
    console.log(`API listening on port ${port}`);
  });
}
