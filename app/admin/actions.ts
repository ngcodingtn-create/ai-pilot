"use server";

import { redirect } from "next/navigation";
import { saveStoredConfig } from "@/lib/config-store";

export async function saveAdminConfig(formData: FormData) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("Missing ADMIN_PASSWORD environment variable");
  }

  const submittedPassword = String(formData.get("adminPassword") ?? "");
  if (submittedPassword !== adminPassword) {
    throw new Error("Invalid admin password");
  }

  await saveStoredConfig({
    azureResourceName: String(formData.get("azureResourceName") ?? "admin-3342-resource"),
    azureDefaultDeployment: String(formData.get("azureDefaultDeployment") ?? "gpt-5.4-1"),
    azureApiKey: String(formData.get("azureApiKey") ?? "").trim() || undefined,
    includeApiKeyInInstaller: formData.get("includeApiKeyInInstaller") === "on",
  });

  redirect("/admin?saved=1");
}
