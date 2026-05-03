"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  isValidAdminPassword,
  requireAdminAuth,
} from "@/lib/admin-auth";
import { saveStoredConfig } from "@/lib/config-store";
import { sendCapiEvent } from "@/lib/capi";
import {
  acceptAccessRequest,
  deleteAccessRequestById,
  deleteAccessRequestsByPhone,
  findAccessRequestById,
} from "@/lib/access-request-store";
import {
  createLicense,
  deleteLicenseById,
  findLicenseById,
  type LicenseEnvironment,
  type LicenseStatus,
  type LicenseTier,
  updateLicenseDetails,
  updateLicenseStatus,
} from "@/lib/license-store";
import {
  activateTrialForClient,
  convertClientToPaid,
  deletePipelineClientByLicenseKey,
  deletePipelineClientById,
  deletePipelineClientByPhone,
  getPipelineClientById,
  markClientLostById,
  markClientPaid,
  recordFacebookEvent,
  upsertLeadClient,
} from "@/lib/client-pipeline-store";
import { deleteMarketingEventsForIdentity } from "@/lib/marketing-event-store";
import { deleteTrialLeadsByPhone } from "@/lib/trial-leads-store";
import { normalizeTunisiaWhatsappNumber } from "@/lib/whatsapp";

function readTier(value: FormDataEntryValue | null): LicenseTier {
  return value === "starter" || value === "max" ? value : "pro";
}

function readEnvironment(value: FormDataEntryValue | null): LicenseEnvironment {
  return value === "codex" || value === "vscode-codex" || value === "t3code"
    ? value
    : "opencode";
}

function readStatus(value: FormDataEntryValue | null): LicenseStatus {
  return value === "disabled" ? "disabled" : "active";
}

function readQuickStage(value: FormDataEntryValue | null) {
  return value === "trial" || value === "paid" || value === "done" ? value : "lead";
}

export async function loginAdmin(formData: FormData) {
  const submittedPassword = String(formData.get("password") ?? "");

  if (!isValidAdminPassword(submittedPassword)) {
    redirect("/admin?error=invalid-password");
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin?loggedOut=1");
}

export async function saveAdminConfig(formData: FormData) {
  await requireAdminAuth();

  await saveStoredConfig({
    azureResourceName: String(formData.get("azureResourceName") ?? "admin-3342-resource"),
    azureDefaultDeployment: String(formData.get("azureDefaultDeployment") ?? "gpt-5.4-1"),
    azureGpt55Deployment:
      String(formData.get("azureGpt55Deployment") ?? "").trim() || undefined,
    azureApiKey: String(formData.get("azureApiKey") ?? "").trim() || undefined,
    includeApiKeyInInstaller: formData.get("includeApiKeyInInstaller") === "on",
    supportWhatsappNumber:
      String(formData.get("supportWhatsappNumber") ?? "").trim() || undefined,
    supportEmail: String(formData.get("supportEmail") ?? "").trim() || undefined,
    supportVideoUrl:
      String(formData.get("supportVideoUrl") ?? "").trim() || undefined,
    managerTutorialLinks:
      String(formData.get("managerTutorialLinks") ?? "").trim() || undefined,
    managerUpdateUrl:
      String(formData.get("managerUpdateUrl") ?? "").trim() || undefined,
  });

  redirect("/admin?saved=1");
}

export async function createLicenseAction(formData: FormData) {
  await requireAdminAuth();

  await createLicense({
    customerName: String(formData.get("customerName") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? "").trim() || undefined,
    azureApiKey: String(formData.get("azureApiKey") ?? "").trim() || undefined,
    tier: readTier(formData.get("tier")),
    preferredEnvironment: readEnvironment(formData.get("preferredEnvironment")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    licenseKey: String(formData.get("licenseKey") ?? "").trim() || undefined,
  });

  redirect("/admin?created=1");
}

export async function createQuickSubscriptionAction(formData: FormData) {
  await requireAdminAuth();

  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim() || undefined;
  const normalizedWhatsapp = normalizeTunisiaWhatsappNumber(
    String(formData.get("whatsappNumber") ?? ""),
  );
  const stage = readQuickStage(formData.get("stage"));

  if (!customerName) {
    throw new Error("Customer name is required");
  }

  if (!normalizedWhatsapp) {
    throw new Error("WhatsApp number is invalid");
  }

  const client = await upsertLeadClient({
    name: customerName,
    email: customerEmail,
    phone: normalizedWhatsapp.e164,
  });

  if (stage === "lead") {
    redirect(
      `/admin?created=1&customer=${encodeURIComponent(customerName)}&whatsapp=${encodeURIComponent(normalizedWhatsapp.e164)}`,
    );
  }

  if (stage === "trial") {
    const activation = await activateTrialForClient({
      clientId: client.id,
      tier: "pro",
      preferredEnvironment: "opencode",
      isActive: true,
      markStatus: "trial",
    });

    redirect(
      `/admin?trialCreated=1&licenseKey=${encodeURIComponent(activation.licenseKey)}&customer=${encodeURIComponent(customerName)}&whatsapp=${encodeURIComponent(normalizedWhatsapp.e164)}`,
    );
  }

  const conversion = await convertClientToPaid({
    clientId: client.id,
    tier: "pro",
    preferredEnvironment: "opencode",
  });

  const fbResponse = await sendCapiEvent({
    eventName: "Purchase",
    phone: normalizedWhatsapp.e164,
    email: customerEmail,
    sourceUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://aipilot.tn",
    eventId: `aipilot-purchase-${client.id}-${Date.now()}`,
    subscriptionId: client.id,
    value: 60,
    currency: "TND",
    contentName: "AIPilot Monthly 60DT",
  });

  await recordFacebookEvent({
    clientId: client.id,
    eventName: "Purchase",
    fbResponse,
  });

  redirect(
    `/admin?paidConverted=1&licenseKey=${encodeURIComponent(conversion.licenseKey)}&customer=${encodeURIComponent(customerName)}&whatsapp=${encodeURIComponent(normalizedWhatsapp.e164)}`,
  );
}

export async function updateLicenseStatusAction(formData: FormData) {
  await requireAdminAuth();

  const licenseId = String(formData.get("licenseId") ?? "");
  if (!licenseId) {
    throw new Error("Missing license id");
  }

  await updateLicenseStatus(licenseId, readStatus(formData.get("status")));
  redirect("/admin?updated=1");
}

export async function updateLicenseDetailsAction(formData: FormData) {
  await requireAdminAuth();

  await updateLicenseDetails(String(formData.get("licenseId") ?? ""), {
    customerName: String(formData.get("customerName") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? "").trim() || undefined,
    tier: readTier(formData.get("tier")),
    preferredEnvironment: readEnvironment(formData.get("preferredEnvironment")),
    status: readStatus(formData.get("status")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  redirect("/admin?updated=1");
}

export async function deleteSubscriptionAction(formData: FormData) {
  await requireAdminAuth();

  const licenseId = String(formData.get("licenseId") ?? "").trim();
  if (!licenseId) {
    throw new Error("Missing license id");
  }

  const license = await findLicenseById(licenseId);
  if (license?.licenseKey) {
    const deletedClient = await deletePipelineClientByLicenseKey(license.licenseKey);
    if (deletedClient?.phone) {
      await deleteAccessRequestsByPhone(deletedClient.phone);
      await deleteTrialLeadsByPhone(deletedClient.phone);
      await deleteMarketingEventsForIdentity({
        clientId: deletedClient.id,
        phone: deletedClient.phone,
      });
    }
  }

  await deleteLicenseById(licenseId);
  redirect("/admin?section=subscriptions&deleted=1");
}

export async function deleteAccessRequestAction(formData: FormData) {
  await requireAdminAuth();

  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!requestId) {
    throw new Error("Missing access request id");
  }

  const request = await findAccessRequestById(requestId);
  await deleteAccessRequestById(requestId);
  if (request) {
    if (request.generatedLicenseKey) {
      const deletedClient = await deletePipelineClientByLicenseKey(request.generatedLicenseKey);
      await deleteMarketingEventsForIdentity({
        clientId: deletedClient?.id,
        phone: deletedClient?.phone ?? request.whatsappNumber,
      });
    } else {
      const deletedClient = await deletePipelineClientByPhone(request.whatsappNumber);
      await deleteMarketingEventsForIdentity({
        clientId: deletedClient?.id,
        phone: request.whatsappNumber,
      });
    }
    await deleteTrialLeadsByPhone(request.whatsappNumber);
  }
  redirect("/admin?section=requests&deleted=1");
}

export async function acceptAccessRequestAction(formData: FormData) {
  await requireAdminAuth();

  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!requestId) {
    throw new Error("Missing access request id");
  }

  const request = await findAccessRequestById(requestId);
  if (!request) {
    throw new Error("Access request not found");
  }

  if (request.status === "accepted" && request.generatedLicenseKey) {
    redirect(
      `/admin?section=requests&requestAccepted=1&licenseKey=${encodeURIComponent(request.generatedLicenseKey)}&customer=${encodeURIComponent(request.customerName)}&whatsapp=${encodeURIComponent(request.whatsappNumber)}`,
    );
  }

  const normalizedWhatsapp = normalizeTunisiaWhatsappNumber(request.whatsappNumber);
  const client = await upsertLeadClient({
    name: request.customerName,
    phone: normalizedWhatsapp?.waId ?? request.whatsappNumber,
  });
  const activation = await activateTrialForClient({
    clientId: client.id,
    tier: readTier(formData.get("tier")),
    preferredEnvironment: request.preferredEnvironment,
    isActive: true,
    markStatus: "trial",
  });

  await acceptAccessRequest({
    requestId: request.id,
    generatedLicenseKey: activation.licenseKey,
    generatedLicenseId: activation.licenseId,
  });

  redirect(
    `/admin?section=requests&requestAccepted=1&licenseKey=${encodeURIComponent(activation.licenseKey)}&customer=${encodeURIComponent(request.customerName)}&whatsapp=${encodeURIComponent(normalizedWhatsapp?.e164 ?? request.whatsappNumber)}`,
  );
}

export async function activatePipelineTrialAction(formData: FormData) {
  await requireAdminAuth();

  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) {
    throw new Error("Missing client id");
  }

  const activation = await activateTrialForClient({
    clientId,
    tier: readTier(formData.get("tier")),
    preferredEnvironment: readEnvironment(formData.get("preferredEnvironment")),
    isActive: true,
    markStatus: "trial",
  });
  const client = await getPipelineClientById(clientId);
  const customerName = client?.name?.trim() || client?.phone || clientId;

  redirect(
    `/admin?section=pipeline&trialCreated=1&licenseKey=${encodeURIComponent(activation.licenseKey)}&customer=${encodeURIComponent(customerName)}&whatsapp=${encodeURIComponent(client?.phone ?? "")}`,
  );
}

export async function convertPipelineClientToPaidAction(formData: FormData) {
  await requireAdminAuth();

  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) {
    throw new Error("Missing client id");
  }

  await markClientPaid({ clientId });
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
      value: 60,
      currency: "TND",
      contentName: "AIPilot Monthly 60DT",
    });

    await recordFacebookEvent({
      clientId,
      eventName: "Purchase",
      fbResponse,
    });
  }

  redirect("/admin?section=pipeline&paidConverted=1");
}

export async function markPipelineClientLostAction(formData: FormData) {
  await requireAdminAuth();

  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) {
    throw new Error("Missing client id");
  }

  await markClientLostById(clientId);
  redirect("/admin?section=pipeline&lost=1");
}

export async function deletePipelineClientAction(formData: FormData) {
  await requireAdminAuth();

  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) {
    throw new Error("Missing client id");
  }

  const client = await getPipelineClientById(clientId);
  await deletePipelineClientById(clientId);
  if (client?.phone) {
    await deleteAccessRequestsByPhone(client.phone);
    await deleteTrialLeadsByPhone(client.phone);
  }
  await deleteMarketingEventsForIdentity({
    clientId,
    phone: client?.phone,
  });
  redirect("/admin?section=pipeline&deleted=1");
}
