import { ParamBuilder, type CookieSettings } from "capi-param-builder-nodejs";

export type MetaParameterContext = {
  fbc?: string;
  fbp?: string;
  clientIpAddress?: string;
  hashedPhone?: string;
  hashedEmail?: string;
  cookiesToSet: CookieSettings[];
};

function readHeader(request: Request, name: string) {
  return request.headers.get(name) ?? "";
}

function parseCookieHeader(header: string) {
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName || !rawValue.length) continue;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
  }
  return cookies;
}

function queryParamsFromUrl(value: string) {
  const params: Record<string, string> = {};
  try {
    const url = new URL(value);
    url.searchParams.forEach((paramValue, key) => {
      params[key] = paramValue;
    });
  } catch {
    // Ignore malformed marketing source URLs and fall back to request URL below.
  }
  return params;
}

function buildFbcFromFbclid(fbclid?: string) {
  const clean = String(fbclid ?? "").trim();
  if (!clean) {
    return undefined;
  }

  return `fb.1.${Date.now()}.${clean}`;
}

function normalizeFbc(value?: string) {
  const clean = String(value ?? "").trim();
  if (!clean) {
    return undefined;
  }

  if (/^fb\.\d+\.\d{13}\..+/.test(clean)) {
    return clean;
  }

  const legacySecondsMatch = clean.match(/^fb\.(\d+)\.(\d{10})\.(.+)$/);
  if (legacySecondsMatch) {
    return `fb.${legacySecondsMatch[1]}.${Number(legacySecondsMatch[2]) * 1000}.${legacySecondsMatch[3]}`;
  }

  return undefined;
}

function hostFromRequest(request: Request, sourceUrl?: string) {
  try {
    if (sourceUrl) {
      return new URL(sourceUrl).host;
    }
  } catch {
    // Fall through to request headers.
  }

  return readHeader(request, "x-forwarded-host") || readHeader(request, "host") || "ai-pilot-ten.vercel.app";
}

function getDomainCandidates(host: string) {
  const cleanHost = host.split(":")[0]?.trim();
  return cleanHost ? [cleanHost] : ["ai-pilot-ten.vercel.app"];
}

export function buildMetaParameterContext(input: {
  request: Request;
  sourceUrl?: string;
  fbp?: string;
  fbc?: string;
  phone?: string;
  email?: string;
}): MetaParameterContext {
  const host = hostFromRequest(input.request, input.sourceUrl);
  const builder = new ParamBuilder(getDomainCandidates(host));
  const cookies = parseCookieHeader(readHeader(input.request, "cookie"));

  if (input.fbp && !cookies._fbp) {
    cookies._fbp = input.fbp;
  }

  if (input.fbc && !cookies._fbc) {
    cookies._fbc = input.fbc;
  }

  const queryParams = {
    ...queryParamsFromUrl(input.request.url),
    ...queryParamsFromUrl(input.sourceUrl ?? ""),
  };
  const fallbackFbc =
    normalizeFbc(input.fbc) ||
    normalizeFbc(cookies._fbc) ||
    buildFbcFromFbclid(queryParams.fbclid);

  builder.processRequest(
    host,
    queryParams,
    cookies,
    readHeader(input.request, "referer"),
    readHeader(input.request, "x-forwarded-for"),
    readHeader(input.request, "x-real-ip"),
  );

  return {
    fbc: normalizeFbc(builder.getFbc() ?? undefined) ?? fallbackFbc,
    fbp: builder.getFbp() ?? undefined,
    clientIpAddress: builder.getClientIpAddress() ?? undefined,
    hashedPhone: input.phone ? builder.getNormalizedAndHashedPII(input.phone, "phone") ?? undefined : undefined,
    hashedEmail: input.email ? builder.getNormalizedAndHashedPII(input.email, "email") ?? undefined : undefined,
    cookiesToSet: builder.getCookiesToSet(),
  };
}

export function serializeMetaCookie(cookie: CookieSettings, secure: boolean) {
  const parts = [
    `${cookie.name}=${encodeURIComponent(cookie.value)}`,
    `Max-Age=${cookie.maxAge}`,
    "Path=/",
    "SameSite=Lax",
  ];

  if (cookie.domain && cookie.domain !== "localhost" && !/^\d{1,3}(\.\d{1,3}){3}$/.test(cookie.domain)) {
    parts.push(`Domain=.${cookie.domain.replace(/^\./, "")}`);
  }

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}
