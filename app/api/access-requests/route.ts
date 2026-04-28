import {
  createAccessRequest,
  type AccessRequestEnvironment,
  type AccessRequestOs,
} from "@/lib/access-request-store";

function readEnvironment(value: unknown): AccessRequestEnvironment {
  return value === "codex" || value === "vscode-codex" || value === "t3code"
    ? value
    : "opencode";
}

function readOs(value: unknown): AccessRequestOs {
  return value === "linux" || value === "macos" ? value : "windows";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        customerName?: string;
        whatsappNumber?: string;
        preferredEnvironment?: AccessRequestEnvironment;
        requestedOs?: AccessRequestOs;
      }
    | null;

  try {
    const accessRequest = await createAccessRequest({
      customerName: String(payload?.customerName ?? ""),
      whatsappNumber: String(payload?.whatsappNumber ?? ""),
      preferredEnvironment: readEnvironment(payload?.preferredEnvironment),
      requestedOs: readOs(payload?.requestedOs),
    });

    return Response.json({
      ok: true,
      requestId: accessRequest.id,
      message:
        "Votre demande a été envoyée. L’équipe AIPilot vous contactera sur WhatsApp avec votre clé de licence.",
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer la demande pour le moment.",
      },
      { status: 400 },
    );
  }
}
