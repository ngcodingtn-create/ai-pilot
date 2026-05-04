import "server-only";
import {
  AIPILOT_APIM_OPENAI_BASE_URL,
  normalizeApimOpenAiBaseUrl,
} from "./aipilot-apim-settings";

export type ApimSubscriptionState = "active" | "suspended" | "cancelled";

export type ApimSubscriptionProvisioningResult = {
  subscriptionId: string;
  primaryKey: string;
  state: ApimSubscriptionState;
};

type ApimConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
  resourceGroup: string;
  serviceName: string;
  productId: string;
  apiVersion: string;
};

type AzureTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type ApimSecretsResponse = {
  primaryKey?: string;
  secondaryKey?: string;
};

const DEFAULT_API_VERSION = "2022-08-01";
const DEFAULT_PRODUCT_ID = "aipilot-pro";

function readApimConfig(): ApimConfig | null {
  const tenantId = process.env.AZURE_TENANT_ID?.trim();
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();
  const subscriptionId =
    process.env.AZURE_SUBSCRIPTION_ID?.trim() ??
    "366e06b3-e8a1-490d-9b78-1997b287173d";
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP?.trim() ?? "nextgencoding";
  const serviceName = process.env.AZURE_APIM_SERVICE_NAME?.trim() ?? "nextgen";
  const productId = process.env.AZURE_APIM_PRODUCT_ID?.trim() ?? DEFAULT_PRODUCT_ID;

  if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
    return null;
  }

  return {
    tenantId,
    clientId,
    clientSecret,
    subscriptionId,
    resourceGroup,
    serviceName,
    productId,
    apiVersion: process.env.AZURE_APIM_API_VERSION?.trim() || DEFAULT_API_VERSION,
  };
}

function requireApimConfig() {
  const config = readApimConfig();
  if (!config) {
    throw new Error(
      "APIM is not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_SUBSCRIPTION_ID.",
    );
  }
  return config;
}

function managementBase(config: ApimConfig) {
  return `https://management.azure.com/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.ApiManagement/service/${config.serviceName}`;
}

async function getAzureManagementToken(config: ApimConfig) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
    scope: "https://management.azure.com/.default",
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    },
  );
  const payload = (await response.json().catch(() => ({}))) as AzureTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description || payload.error || "Unable to authenticate with Azure APIM.",
    );
  }

  return payload.access_token;
}

async function apimFetch(
  path: string,
  init: RequestInit & { expected?: number[] } = {},
) {
  const config = requireApimConfig();
  const token = await getAzureManagementToken(config);
  const expected = init.expected ?? [200, 201, 202, 204];
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(
    `${managementBase(config)}${path}${separator}api-version=${config.apiVersion}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    },
  );

  if (!expected.includes(response.status)) {
    const details = await response.text().catch(() => "");
    throw new Error(`APIM request failed (${response.status}): ${details || response.statusText}`);
  }

  return response;
}

function normalizeSubscriptionId(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

  return normalized || `client-${Date.now()}`;
}

export function buildApimSubscriptionId(clientId: string) {
  return normalizeSubscriptionId(`aipilot-${clientId}`);
}

export function getApimOpenAiBaseUrl() {
  return normalizeApimOpenAiBaseUrl(
    process.env.APIM_OPENAI_BASE_URL?.trim() || AIPILOT_APIM_OPENAI_BASE_URL,
  );
}

export async function createApimSubscription(input: {
  clientId: string;
  displayName: string;
}) {
  const config = requireApimConfig();
  const subscriptionId = buildApimSubscriptionId(input.clientId);

  await apimFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PUT",
    body: JSON.stringify({
      properties: {
        displayName: `Client-${input.displayName}-${new Date().toISOString().slice(0, 10)}`,
        scope: `/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.ApiManagement/service/${config.serviceName}/products/${config.productId}`,
        state: "active",
      },
    }),
  });

  const secretsResponse = await apimFetch(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/listSecrets`,
    { method: "POST" },
  );
  const secrets = (await secretsResponse.json().catch(() => ({}))) as ApimSecretsResponse;

  if (!secrets.primaryKey) {
    throw new Error("APIM subscription was created, but no primary key was returned.");
  }

  return {
    subscriptionId,
    primaryKey: secrets.primaryKey,
    state: "active",
  } satisfies ApimSubscriptionProvisioningResult;
}

export async function setApimSubscriptionState(
  subscriptionId: string | undefined,
  state: ApimSubscriptionState,
) {
  if (!subscriptionId) return false;

  await apimFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { state } }),
  });
  return true;
}

export async function deleteApimSubscription(subscriptionId: string | undefined) {
  if (!subscriptionId) return false;

  await apimFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { state: "cancelled" } }),
    expected: [200, 202, 204, 404],
  });

  await apimFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "DELETE",
    expected: [200, 202, 204, 404],
  });
  return true;
}
