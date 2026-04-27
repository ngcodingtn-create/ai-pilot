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

  return Response.json({
    valid: true,
    customerName: result.customerName,
    preferredEnvironment: result.preferredEnvironment,
    tier: result.tier,
  });
}
