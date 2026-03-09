import { Reader, ReaderModel } from "@maxmind/geoip2-node";
import {
  COUNTRY_TO_JURISDICTION_MAP,
  EU_MEMBER_COUNTRY_CODES,
  JURISDICTION_GB
} from "@agegate/shared";
import path from "node:path";

let readerPromise: Promise<ReaderModel> | null = null;

function getDbCandidates(): string[] {
  return [
    path.resolve(process.cwd(), "packages/api/data/GeoLite2-Country.mmdb"),
    path.resolve(process.cwd(), "data/GeoLite2-Country.mmdb"),
    path.resolve(__dirname, "../../data/GeoLite2-Country.mmdb")
  ];
}

async function getReader(): Promise<ReaderModel | null> {
  if (!readerPromise) {
    readerPromise = (async () => {
      for (const mmdbPath of getDbCandidates()) {
        try {
          return await Reader.open(mmdbPath);
        } catch {
          continue;
        }
      }
      throw new Error("Unable to open GeoLite2 country database");
    })();
  }

  try {
    return await readerPromise;
  } catch {
    return null;
  }
}

export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const xForwardedFor = headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string" && xForwardedFor.trim().length > 0) {
    return xForwardedFor.split(",")[0]?.trim() ?? "0.0.0.0";
  }
  return "0.0.0.0";
}

export async function detectJurisdictionFromIp(ip: string): Promise<string> {
  const reader = await getReader();
  if (!reader) {
    return JURISDICTION_GB;
  }

  try {
    const response = reader.country(ip);
    const countryCode = response.country?.isoCode?.toUpperCase();
    if (!countryCode) {
      return JURISDICTION_GB;
    }

    if (EU_MEMBER_COUNTRY_CODES.includes(countryCode)) {
      return COUNTRY_TO_JURISDICTION_MAP.EU;
    }

    return COUNTRY_TO_JURISDICTION_MAP[countryCode] ?? JURISDICTION_GB;
  } catch {
    return JURISDICTION_GB;
  }
}
