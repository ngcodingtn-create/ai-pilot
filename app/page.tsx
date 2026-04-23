import { getStoredConfig } from "@/lib/config-store";
import HomeClient, { type HomeConfig } from "./home-client";

export default async function Home() {
  const config = await getStoredConfig();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-pilot-ten.vercel.app";

  const safeConfig: HomeConfig = {
    azureResourceName: config.azureResourceName,
    azureDefaultDeployment: config.azureDefaultDeployment,
    includeApiKeyInInstaller: config.includeApiKeyInInstaller,
    siteUrl,
  };

  return <HomeClient config={safeConfig} />;
}
