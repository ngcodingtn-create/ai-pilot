import { getStoredConfig } from "@/lib/config-store";

export async function GET() {
  const config = await getStoredConfig();

  return Response.json({
    enabled: Boolean(config.managerUpdateUrl),
    updateUrl: config.managerUpdateUrl ?? "",
  });
}
