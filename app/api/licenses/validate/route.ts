import { findLifecycleLicenseByKey } from "@/lib/client-pipeline-store";
import { validateLicenseKey } from "@/lib/license-store";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { licenseKey?: string }
    | null;

  const licenseKey = String(payload?.licenseKey ?? "");
  const result = await validateLicenseKey(licenseKey);

  if (!result.valid) {
    return Response.json(
      {
        valid: false,
        message:
          result.reason === "invalid-format"
            ? "Format de licence invalide."
            : "Licence introuvable ou désactivée.",
      },
      { status: 404 },
    );
  }

  const lifecycle = await findLifecycleLicenseByKey(result.licenseKey);
  if (lifecycle?.license) {
    const expired =
      lifecycle.license.expiresAt &&
      new Date(lifecycle.license.expiresAt).getTime() <= Date.now();
    const revoked = !lifecycle.license.isActive;

    if (expired || revoked) {
      return Response.json(
        {
          valid: false,
          message: expired
            ? "Cette licence d’essai a expiré."
            : "Cette licence n’est plus active.",
        },
        { status: 403 },
      );
    }
  }

  return Response.json({
    valid: true,
    customerName: result.customerName,
    preferredEnvironment: result.preferredEnvironment,
    tier: result.tier,
    licenseType: lifecycle?.license?.type,
    expiresAt: lifecycle?.license?.expiresAt,
  });
}
