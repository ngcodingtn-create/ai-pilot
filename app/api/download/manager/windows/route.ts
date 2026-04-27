import { resolveSiteUrlFromRequest } from "@/lib/site-url";
import {
  downloadTextFile,
  findManagerReleaseAsset,
} from "../../lib";

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
  const siteUrl = resolveSiteUrlFromRequest(
    request.url,
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-pilot-ten.vercel.app",
  );
  const { searchParams } = new URL(request.url);
  const environment = readEnvironment(searchParams.get("environment"));
  const licenseKey = readLicenseKey(searchParams.get("licenseKey"));
  const releaseAsset = await findManagerReleaseAsset((asset) =>
    /^AIPilot Manager-Setup-.*-x64\.exe$/i.test(asset.name),
  );
  const installerUrl =
    releaseAsset?.browser_download_url ??
    "https://github.com/ngcodingtn-create/ai-pilot/releases/latest/download/AIPilot%20Manager-Setup-0.2.0-x64.exe";

  const launcher = [
    "@echo off",
    "setlocal",
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; ` +
      `$installer = Join-Path $env:TEMP 'AIPilot-Manager-Setup.exe'; ` +
      `$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'AIPilot Manager.lnk'; ` +
      `$installDir = Join-Path $env:LOCALAPPDATA 'Programs\\AIPilot Manager'; ` +
      `$installedExe = Join-Path $installDir 'AIPilot Manager.exe'; ` +
      `Invoke-WebRequest -UseBasicParsing '${installerUrl}' -OutFile $installer; ` +
      `Start-Process -FilePath $installer -ArgumentList '/S' -Wait; ` +
      `if (-not (Test-Path $installedExe)) { ` +
      `  $programFilesX86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)'); ` +
      `  $probePaths = @($installDir, (Join-Path $env:ProgramFiles 'AIPilot Manager')); ` +
      `  if ($programFilesX86) { $probePaths += (Join-Path $programFilesX86 'AIPilot Manager') }; ` +
      `  $probe = Get-ChildItem -Path $probePaths -Filter 'AIPilot Manager.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1; ` +
      `  if ($probe) { $installedExe = $probe.FullName } ` +
      `} ` +
      `if (-not (Test-Path $installedExe)) { throw 'AIPilot Manager a été téléchargé, mais l''installation Windows n''a pas produit l''exécutable attendu.' } ` +
      `$shell = New-Object -ComObject WScript.Shell; ` +
      `$shortcut = $shell.CreateShortcut($desktopShortcut); ` +
      `$shortcut.TargetPath = $installedExe; ` +
      `$shortcut.WorkingDirectory = Split-Path $installedExe; ` +
      `$shortcut.IconLocation = $installedExe; ` +
      `$shortcut.Save(); ` +
      `Start-Process -FilePath $installedExe -ArgumentList @('--backend-url','${siteUrl}','--environment','${environment}','--license-key','${licenseKey}','--auto-setup');"`,
  ].join("\r\n");

  return downloadTextFile(
    launcher,
    "install-aipilot-manager.cmd",
    "application/octet-stream",
  );
}
