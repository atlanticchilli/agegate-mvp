import { Router } from "express";
import { listVerificationLogs } from "../services/sessions";

const router = Router();

function parseDateToMs(value: unknown): number | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

router.get("/", async (req, res) => {
  const siteId = String(req.query.siteId ?? "");
  if (!siteId) {
    res.status(400).json({ error: "siteId query parameter is required" });
    return;
  }

  const limit = Number(req.query.limit ?? 100);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100;
  const cursorValue = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const parsedCursor = cursorValue ? Number(cursorValue) : undefined;
  const safeCursor =
    typeof parsedCursor === "number" && Number.isFinite(parsedCursor) ? parsedCursor : undefined;
  const startDateMs = parseDateToMs(req.query.startDate);
  const endDateMs = parseDateToMs(req.query.endDate);

  if (req.query.startDate && typeof startDateMs !== "number") {
    res.status(400).json({ error: "startDate must be a valid ISO date string" });
    return;
  }
  if (req.query.endDate && typeof endDateMs !== "number") {
    res.status(400).json({ error: "endDate must be a valid ISO date string" });
    return;
  }
  if (typeof startDateMs === "number" && typeof endDateMs === "number" && startDateMs > endDateMs) {
    res.status(400).json({ error: "startDate must be before or equal to endDate" });
    return;
  }

  const result = await listVerificationLogs({
    siteId,
    limit: safeLimit,
    cursor: safeCursor,
    startDateMs,
    endDateMs
  });
  res.json(result);
});

router.get("/export", async (req, res) => {
  const siteId = String(req.query.siteId ?? "");
  if (!siteId) {
    res.status(400).json({ error: "siteId query parameter is required" });
    return;
  }

  const startDateMs = parseDateToMs(req.query.startDate);
  const endDateMs = parseDateToMs(req.query.endDate);

  if (req.query.startDate && typeof startDateMs !== "number") {
    res.status(400).json({ error: "startDate must be a valid ISO date string" });
    return;
  }
  if (req.query.endDate && typeof endDateMs !== "number") {
    res.status(400).json({ error: "endDate must be a valid ISO date string" });
    return;
  }

  const { logs } = await listVerificationLogs({
    siteId,
    limit: 1000,
    startDateMs,
    endDateMs
  });
  const rows = [
    "sessionId,status,verified,ageCategory,jurisdiction,selectedMethod,selectedProvider,updatedAt"
  ];

  for (const item of logs) {
    const values = [
      item.id,
      item.status,
      String(Boolean(item.result?.verified)),
      item.result?.ageCategory ?? "",
      item.jurisdiction,
      item.selectedMethod ?? "",
      item.selectedProvider ?? "",
      String(item.updatedAt ?? "")
    ];
    rows.push(values.map((value) => `"${String(value).replace(/"/g, "\"\"")}"`).join(","));
  }

  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", "attachment; filename=verification-logs.csv");
  res.status(200).send(rows.join("\n"));
});

export default router;
