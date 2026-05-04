import { isAdminAuthenticated } from "@/lib/admin-auth";
import { buildClientPowerShellInstaller } from "@/lib/client-installer";
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
  if (!client?.apimKey) {
    return Response.json({ error: "No APIM key for this client" }, { status: 404 });
  }

  return new Response(
    buildClientPowerShellInstaller({
      apiKey: client.apimKey,
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="aipilot-${client.id}.ps1"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
