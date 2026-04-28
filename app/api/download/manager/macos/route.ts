import { resolveSiteUrlFromRequest } from "@/lib/site-url";
import {
  downloadBinaryArtifact,
  downloadTextFile,
  findManagerArtifact,
  findManagerReleaseAsset,
  redirectToArtifact,
} from "../../lib";

const FILES = [
  "package.json",
  "package-lock.json",
  "main.js",
  "preload.js",
  "src/index.html",
  "src/styles.css",
  "src/renderer.js",
];

function readEnvironment(value: string | null) {
  return value === "codex" || value === "vscode-codex" || value === "t3code"
    ? value
    : "opencode";
}

function readLicenseKey(value: string | null) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 19);
}

export async function GET(request: Request) {
  const packagedArtifact =
    (await findManagerArtifact([".dmg"], ["dmg"])) ??
    (await findManagerArtifact([".zip"], ["mac"], { requirePreferredMatch: true }));
  if (packagedArtifact) {
    return downloadBinaryArtifact(packagedArtifact);
  }

  const releaseArtifact =
    (await findManagerReleaseAsset((asset) => /\.dmg$/i.test(asset.name))) ??
    (await findManagerReleaseAsset((asset) => /mac/i.test(asset.name) && /\.zip$/i.test(asset.name))) ??
    (await findManagerReleaseAsset((asset) => /\.zip$/i.test(asset.name)));
  if (releaseArtifact) {
    return redirectToArtifact(releaseArtifact.browser_download_url);
  }

  const siteUrl = resolveSiteUrlFromRequest(
    request.url,
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-pilot-ten.vercel.app",
  );
  const { searchParams } = new URL(request.url);
  const environment = readEnvironment(searchParams.get("environment"));
  const licenseKey = readLicenseKey(searchParams.get("licenseKey"));

  const downloadLoop = FILES.map(
    (file) =>
      `mkdir -p "$(dirname "$ROOT/${file}")"\ncurl -fsSL "${siteUrl}/api/manager/files/${file}" -o "$ROOT/${file}"`,
  ).join("\n");

  const script = `#!/usr/bin/env bash
set -euo pipefail

ROOT="${"$"}{HOME}/.aipilot-manager"
mkdir -p "${"$"}ROOT/src"

ensure_npm() {
  if command -v npm >/dev/null 2>&1; then
    return
  fi

  if command -v brew >/dev/null 2>&1; then
    brew install node
    return
  fi

  echo "Node.js et npm sont requis pour lancer AIPilot Manager." >&2
  exit 1
}

ensure_npm

${downloadLoop}

cd "${"$"}ROOT"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
AIPILOT_MANAGER_BACKEND_URL="${siteUrl}" \
AIPILOT_MANAGER_DEFAULT_ENVIRONMENT="${environment}" \
AIPILOT_MANAGER_DEFAULT_LICENSE_KEY="${licenseKey}" \
AIPILOT_MANAGER_AUTO_SETUP="1" \
npm run app
`;

  return downloadTextFile(script, "setup-aipilot-manager-macos.sh");
}
