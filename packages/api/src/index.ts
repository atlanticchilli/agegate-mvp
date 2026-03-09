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

  app.get("/demo", (req, res) => {
    const siteKey = (req.query.siteKey as string) ?? "";
    const widgetUrl = "https://storage.googleapis.com/agegate-mvp-widget-cdn/v1/widget.js";
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>AgeGate Demo</title></head>
<body>
  <h1>AgeGate Selfie Verification Demo</h1>
  <p>${siteKey ? `Testing site: <code>${siteKey}</code>` : "Add ?siteKey=YOUR_SITE_KEY to the URL (create a site in the Dashboard first)."}</p>
  ${siteKey ? `<script src="${widgetUrl}" data-site-key="${siteKey}" data-api-base-path="/api/session"></script>` : ""}
</body>
</html>`;
    res.type("html").send(html);
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
