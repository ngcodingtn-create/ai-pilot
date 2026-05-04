import { isAdminAuthenticated } from "@/lib/admin-auth";
import { buildClientPowerShellInstaller } from "@/lib/client-installer";
import { getPipelineClientById } from "@/lib/client-pipeline-store";
import {
  AIPILOT_APIM_OPENAI_BASE_URL,
  AIPILOT_PRIMARY_DEPLOYMENT,
  buildAipilotCodexConfig,
  buildAipilotMachineEnvOneLiner,
} from "@/lib/aipilot-apim-settings";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const client = await getPipelineClientById(id);
  if (!client?.apimKey) {
    return Response.json({ error: "No APIM key for this client" }, { status: 404 });
  }

  return new Response(
    [
      `Client: ${client.name || client.phone || client.id}`,
      "",
      "APIM endpoint:",
      AIPILOT_APIM_OPENAI_BASE_URL,
      "",
      "PowerShell one-liner:",
      buildAipilotMachineEnvOneLiner(client.apimKey),
      "",
      "config.toml:",
      buildAipilotCodexConfig({
        baseUrl: AIPILOT_APIM_OPENAI_BASE_URL,
        model: AIPILOT_PRIMARY_DEPLOYMENT,
      }),
      "",
      "Full PowerShell installer:",
      buildClientPowerShellInstaller({
        apiKey: client.apimKey,
        baseUrl: AIPILOT_APIM_OPENAI_BASE_URL,
        model: AIPILOT_PRIMARY_DEPLOYMENT,
      }),
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="aipilot-apim-${client.id}.txt"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
