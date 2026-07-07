import { isAdminAuthenticated } from "@/lib/admin-auth";
import { buildClientPowerShellInstaller } from "@/lib/client-installer";
import { getPipelineClientById } from "@/lib/client-pipeline-store";
import {
  AIPILOT_PRIMARY_DEPLOYMENT,
  buildAipilotCodexConfig,
  buildAipilotMachineEnvOneLiner,
  getAipilotAzureOpenAiBaseUrl,
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
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const baseUrl = getAipilotAzureOpenAiBaseUrl();
  if (!apiKey || !baseUrl) {
    return Response.json(
      { error: "AZURE_OPENAI_API_KEY / AZURE_OPENAI_BASE_URL is not configured on the server" },
      { status: 500 },
    );
  }

  return new Response(
    [
      `Client: ${client.name || client.phone || client.id}`,
      "",
      "Azure endpoint:",
      baseUrl,
      "",
      "PowerShell one-liner:",
      buildAipilotMachineEnvOneLiner(apiKey),
      "",
      "config.toml:",
      buildAipilotCodexConfig({
        baseUrl,
        model: AIPILOT_PRIMARY_DEPLOYMENT,
      }),
      "",
      "Full PowerShell installer:",
      buildClientPowerShellInstaller({
        apiKey,
        baseUrl,
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
