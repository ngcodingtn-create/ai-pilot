export function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function resolveSiteUrlFromRequest(
  requestUrl: string,
  fallbackUrl: string,
) {
  try {
    return normalizeSiteUrl(new URL(requestUrl).origin);
  } catch {
    return normalizeSiteUrl(fallbackUrl);
  }
}
