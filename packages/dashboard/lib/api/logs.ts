export interface VerificationLog {
  id: string;
  status: string;
  jurisdiction: string;
  selectedMethod?: string;
  selectedProvider?: string;
  updatedAt?: unknown;
  result?: {
    verified?: boolean;
    ageCategory?: string;
  };
}

export interface ListLogsParams {
  baseUrl: string;
  siteId: string;
  idToken: string;
  limit?: number;
  cursor?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListLogsResponse {
  logs: VerificationLog[];
  nextCursor?: string;
}

export async function listLogs(params: ListLogsParams): Promise<ListLogsResponse> {
  const url = new URL("/api/logs", params.baseUrl);
  url.searchParams.set("siteId", params.siteId);
  if (params.limit) {
    url.searchParams.set("limit", String(params.limit));
  }
  if (params.cursor) {
    url.searchParams.set("cursor", params.cursor);
  }
  if (params.startDate) {
    url.searchParams.set("startDate", params.startDate);
  }
  if (params.endDate) {
    url.searchParams.set("endDate", params.endDate);
  }

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${params.idToken}`
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to list logs: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as ListLogsResponse;
  return {
    logs: payload.logs ?? [],
    nextCursor: payload.nextCursor
  };
}

export async function exportLogsCsv(
  params: Omit<ListLogsParams, "limit" | "cursor">
): Promise<string> {
  const url = new URL("/api/logs/export", params.baseUrl);
  url.searchParams.set("siteId", params.siteId);
  if (params.startDate) {
    url.searchParams.set("startDate", params.startDate);
  }
  if (params.endDate) {
    url.searchParams.set("endDate", params.endDate);
  }

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${params.idToken}`
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to export logs: ${response.status} ${message}`);
  }

  return response.text();
}
