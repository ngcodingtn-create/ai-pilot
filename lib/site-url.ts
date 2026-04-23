export function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/, "");
}
