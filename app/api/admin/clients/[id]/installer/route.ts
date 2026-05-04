import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getPipelineClientById } from "@/lib/client-pipeline-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const client = await getPipelineClientById(id);
  if (!client?.licenseKey) {
    return Response.json({ error: "No license key for this client" }, { status: 404 });
  }

  return new Response(
    [
      `Client: ${client.name || client.phone || client.id}`,
      "",
      "AIPilot license key:",
      client.licenseKey,
      "",
      "Send only this license key to the customer. AIPilot Manager exchanges it for the private APIM configuration automatically after validation.",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="aipilot-license-${client.id}.txt"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
