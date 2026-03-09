import { describe, expect, it, vi } from "vitest";
import { exportLogsCsv, listLogs } from "../lib/api/logs";

describe("logs api client", () => {
  it("attaches firebase token when listing logs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        logs: [{ id: "session-1", status: "verified", jurisdiction: "GB" }],
        nextCursor: "123"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await listLogs({
      baseUrl: "https://api.example.test",
      siteId: "site-1",
      idToken: "token-123",
      limit: 25
    });

    expect(response.logs).toHaveLength(1);
    expect(response.nextCursor).toBe("123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = String(fetchMock.mock.calls[0][0]);
    const requestOptions = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(requestUrl).toContain("/api/logs");
    expect(requestUrl).toContain("siteId=site-1");
    expect(requestUrl).toContain("limit=25");
    expect(requestOptions.headers.authorization).toBe("Bearer token-123");
  });

  it("returns csv output from export endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "sessionId,status\ns1,verified"
    });
    vi.stubGlobal("fetch", fetchMock);

    const csv = await exportLogsCsv({
      baseUrl: "https://api.example.test",
      siteId: "site-1",
      idToken: "token-123"
    });

    expect(csv).toContain("sessionId,status");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestOptions = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(requestOptions.headers.authorization).toBe("Bearer token-123");
  });
});
