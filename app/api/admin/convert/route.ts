import { isAdminAuthenticated } from "@/lib/admin-auth";
import { sendCapiEvent } from "@/lib/capi";
import { getPipelineClientById, markClientPaid, recordFacebookEvent } from "@/lib/client-pipeline-store";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        clientId?: string;
        amount?: number;
        tier?: "starter" | "pro" | "max";
        preferredEnvironment?: "codex" | "vscode-codex" | "t3code" | "opencode";
      }
    | null;

  const clientId = String(payload?.clientId ?? "").trim();
  if (!clientId) {
    return Response.json({ error: "Client manquant" }, { status: 400 });
  }

  const conversion = await markClientPaid({ clientId });

  const client = await getPipelineClientById(clientId);
  if (client) {
    const fbResponse = await sendCapiEvent({
      eventName: "Purchase",
      phone: client.phone,
      email: client.email,
      fbp: client.fbp,
      fbc: client.fbc,
      ip: client.ip,
      userAgent: client.userAgent,
      sourceUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://aipilot.tn",
      eventId: `aipilot-purchase-${clientId}-${Date.now()}`,
      subscriptionId: clientId,
      value: payload?.amount ?? 60,
      currency: "TND",
      contentName: "AIPilot Monthly 60DT",
    });

    await recordFacebookEvent({
      clientId,
      eventName: "Purchase",
      fbResponse,
    });
  }

  return Response.json({
    success: true,
    licenseKey: conversion.licenseKey ?? null,
  });
}
