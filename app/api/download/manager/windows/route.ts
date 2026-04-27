import { resolveSiteUrlFromRequest } from "@/lib/site-url";
import {
  downloadBinaryArtifact,
  downloadTextFile,
  findManagerArtifact,
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
  return value === "codex" || value === "t3code" ? value : "opencode";
}

function readLicenseKey(value: string | null) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 19);
}

export async function GET(request: Request) {
  const packagedArtifact = await findManagerArtifact([".exe"], ["setup"]);
  if (packagedArtifact) {
    return downloadBinaryArtifact(packagedArtifact);
  }

  const siteUrl = resolveSiteUrlFromRequest(
    request.url,
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-pilot-ten.vercel.app",
  );
  const { searchParams } = new URL(request.url);
  const environment = readEnvironment(searchParams.get("environment"));
  const licenseKey = readLicenseKey(searchParams.get("licenseKey"));

  const downloadCommands = FILES.map(
    (file) =>
      `$target = Join-Path $root '${file.replaceAll("/", "\\")}'; ` +
      `$dir = Split-Path $target; ` +
      `New-Item -ItemType Directory -Force -Path $dir | Out-Null; ` +
      `Invoke-WebRequest -UseBasicParsing '${siteUrl}/api/manager/files/${file}' -OutFile $target;`,
  ).join(" ");

  const launcher = [
    "@echo off",
    "setlocal",
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; ` +
      `$root = Join-Path $env:LOCALAPPDATA 'AIPilotManager'; ` +
      `New-Item -ItemType Directory -Force -Path (Join-Path $root 'src') | Out-Null; ` +
      `if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { ` +
      `  if (Get-Command winget -ErrorAction SilentlyContinue) { ` +
      `    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --disable-interactivity; ` +
      `    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User'); ` +
      `  } else { throw 'Node.js et npm sont requis pour lancer AIPilot Manager.' } ` +
      `} ` +
      `${downloadCommands} ` +
      `Push-Location $root; ` +
      `if (Test-Path 'package-lock.json') { npm ci --no-audit --no-fund } else { npm install --no-audit --no-fund }; ` +
      `$env:AIPILOT_MANAGER_BACKEND_URL='${siteUrl}'; ` +
      `$env:AIPILOT_MANAGER_DEFAULT_ENVIRONMENT='${environment}'; ` +
      `$env:AIPILOT_MANAGER_DEFAULT_LICENSE_KEY='${licenseKey}'; ` +
      `npm run app; ` +
      `Pop-Location"`,
  ].join("\r\n");

  return downloadTextFile(
    launcher,
    "setup-aipilot-manager.cmd",
    "application/octet-stream",
  );
}
