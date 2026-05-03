import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listPipelineClients } from "@/lib/client-pipeline-store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await listPipelineClients();
  return Response.json(clients);
}
