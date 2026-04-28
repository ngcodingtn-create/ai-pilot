"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  isValidAdminPassword,
  requireAdminAuth,
} from "@/lib/admin-auth";
import { saveStoredConfig } from "@/lib/config-store";
import {
  acceptAccessRequest,
  findAccessRequestById,
} from "@/lib/access-request-store";
import {
  createLicense,
  type LicenseEnvironment,
  type LicenseStatus,
  type LicenseTier,
  updateLicenseStatus,
} from "@/lib/license-store";

function readTier(value: FormDataEntryValue | null): LicenseTier {
  return value === "starter" || value === "max" ? value : "pro";
}

function readEnvironment(value: FormDataEntryValue | null): LicenseEnvironment {
  return value === "codex" || value === "t3code" ? value : "opencode";
}

function readStatus(value: FormDataEntryValue | null): LicenseStatus {
  return value === "disabled" ? "disabled" : "active";
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

export async function updateLicenseStatusAction(formData: FormData) {
  await requireAdminAuth();

  const licenseId = String(formData.get("licenseId") ?? "");
  if (!licenseId) {
    throw new Error("Missing license id");
  }

  await updateLicenseStatus(licenseId, readStatus(formData.get("status")));
  redirect("/admin?updated=1");
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
      `/admin?requestAccepted=1&licenseKey=${encodeURIComponent(request.generatedLicenseKey)}&customer=${encodeURIComponent(request.customerName)}`,
    );
  }

  const license = await createLicense({
    customerName: request.customerName,
    tier: readTier(formData.get("tier")),
    preferredEnvironment: request.preferredEnvironment,
    notes: `WhatsApp: ${request.whatsappNumber}\nOS demandé: ${request.requestedOs}`,
  });

  await acceptAccessRequest({
    requestId: request.id,
    generatedLicenseKey: license.licenseKey,
    generatedLicenseId: license.id,
  });

  redirect(
    `/admin?requestAccepted=1&licenseKey=${encodeURIComponent(license.licenseKey)}&customer=${encodeURIComponent(request.customerName)}&whatsapp=${encodeURIComponent(request.whatsappNumber)}`,
  );
}
