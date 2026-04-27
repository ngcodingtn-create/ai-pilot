import { headers } from "next/headers";
import { getStoredConfig } from "@/lib/config-store";
import { normalizeSiteUrl } from "@/lib/site-url";
import HomeClient, { type HomeConfig } from "./home-client";

export default async function Home() {
  const config = await getStoredConfig();
  const requestHeaders = await headers();
  const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const forwardedHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const fallbackSiteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-pilot-ten.vercel.app",
  );
  const siteUrl = forwardedHost
    ? normalizeSiteUrl(`${forwardedProto}://${forwardedHost}`)
    : fallbackSiteUrl;

  const safeConfig: HomeConfig = {
    azureResourceName: config.azureResourceName,
    azureDefaultDeployment: config.azureDefaultDeployment,
    includeApiKeyInInstaller: config.includeApiKeyInInstaller,
    siteUrl,
  };

  return <HomeClient config={safeConfig} />;
}
