import { isAdminAuthenticated } from "@/lib/admin-auth";
import { activateTrialForClient } from "@/lib/client-pipeline-store";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        clientId?: string;
        tier?: "starter" | "pro" | "max";
        preferredEnvironment?: "codex" | "vscode-codex" | "t3code" | "opencode";
      }
    | null;

  const clientId = String(payload?.clientId ?? "").trim();
  if (!clientId) {
    return Response.json({ error: "Client manquant" }, { status: 400 });
  }

  const activation = await activateTrialForClient({
    clientId,
    tier: payload?.tier,
    preferredEnvironment: payload?.preferredEnvironment,
    isActive: false,
    markStatus: "trial",
  });

  return Response.json({
    success: true,
    licenseKey: activation.licenseKey,
    expiresAt: activation.expiresAt,
    active: false,
  });
}
