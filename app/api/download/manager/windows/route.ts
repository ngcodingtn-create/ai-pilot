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
    "https://github.com/ngcodingtn-create/ai-pilot/releases/download/v0.2.1/AIPilot-Manager-Setup-0.2.1-x64.exe";
  const safeInstallerUrlForCmd = installerUrl.replaceAll("%", "%%");

  const launcher = [
    "@echo off",
    "setlocal",
    "title Installation AIPilot Manager",
    "echo.",
    "echo ==============================================",
    "echo   AIPilot Manager - Installation Windows",
    "echo ==============================================",
    "echo.",
    `set "INSTALLER_URL=${safeInstallerUrlForCmd}"`,
    'set "INSTALLER=%TEMP%\\AIPilot-Manager-Setup.exe"',
    `set "BACKEND_URL=${siteUrl}"`,
    `set "TARGET_ENVIRONMENT=${environment}"`,
    `set "LICENSE_KEY=${licenseKey}"`,
    "echo Telechargement de l'installateur...",
    `if exist "%SystemRoot%\\System32\\curl.exe" (` +
      ` "%SystemRoot%\\System32\\curl.exe" -L --retry 5 --retry-delay 2 --retry-all-errors --fail --output "%INSTALLER%" "%INSTALLER_URL%"` +
      `) else (` +
      ` powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $url=$env:INSTALLER_URL; $target=$env:INSTALLER; for ($i=1; $i -le 4; $i++) { try { Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $target; exit 0 } catch { if ($i -eq 4) { throw }; Start-Sleep -Seconds 2 } }"` +
      `)`,
    "if errorlevel 1 goto :download_error",
    'if not exist "%INSTALLER%" goto :download_error',
    "echo Telechargement termine.",
    "echo.",
    "echo Installation de AIPilot Manager...",
    'start /wait "" "%INSTALLER%" /S',
    "if errorlevel 1 goto :install_error",
    "echo Installation terminee. Creation du raccourci bureau...",
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; ` +
      `$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'AIPilot Manager.lnk'; ` +
      `$installDir = Join-Path $env:LOCALAPPDATA 'Programs\\AIPilot Manager'; ` +
      `$installedExe = Join-Path $installDir 'AIPilot Manager.exe'; ` +
      `if (-not (Test-Path $installedExe)) { ` +
      `  $programFilesX86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)'); ` +
      `  $probePaths = @($installDir, (Join-Path $env:ProgramFiles 'AIPilot Manager')); ` +
      `  if ($programFilesX86) { $probePaths += (Join-Path $programFilesX86 'AIPilot Manager') }; ` +
      `  $probe = Get-ChildItem -Path $probePaths -Filter 'AIPilot Manager.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1; ` +
      `  if ($probe) { $installedExe = $probe.FullName } ` +
      `} ` +
      `if (-not (Test-Path $installedExe)) { throw 'L''installation Windows n''a pas produit l''executable AIPilot Manager attendu.' } ` +
      `$shell = New-Object -ComObject WScript.Shell; ` +
      `$shortcut = $shell.CreateShortcut($desktopShortcut); ` +
      `$shortcut.TargetPath = $installedExe; ` +
      `$shortcut.WorkingDirectory = Split-Path $installedExe; ` +
      `$shortcut.IconLocation = $installedExe; ` +
      `$shortcut.Save(); ` +
      `Start-Process -FilePath $installedExe -ArgumentList @('--backend-url',$env:BACKEND_URL,'--environment',$env:TARGET_ENVIRONMENT,'--license-key',$env:LICENSE_KEY,'--auto-setup');"`,
    "if errorlevel 1 goto :launch_error",
    "echo.",
    "echo AIPilot Manager est installe et va s'ouvrir maintenant.",
    "echo Vous pouvez aussi le trouver depuis le bureau ou le menu Demarrer.",
    "timeout /t 3 >nul",
    "exit /b 0",
    "",
    ":download_error",
    "echo.",
    "echo ERREUR: le telechargement de l'installateur a echoue.",
    "echo Astuce: verifiez votre connexion, puis relancez ce fichier.",
    "echo L'URL tentee etait:",
    "echo %INSTALLER_URL%",
    "pause",
    "exit /b 1",
    "",
    ":install_error",
    "echo.",
    "echo ERREUR: l'installateur a ete telecharge, mais son execution a echoue.",
    "echo Essayez de relancer ce fichier en tant qu'administrateur si Windows a bloque l'installation.",
    "pause",
    "exit /b 1",
    "",
    ":launch_error",
    "echo.",
    "echo ERREUR: AIPilot Manager semble installe, mais son premier lancement a echoue.",
    "echo Ouvrez-le manuellement depuis le bureau ou le menu Demarrer.",
    "pause",
    "exit /b 1",
  ].join("\r\n");

  return downloadTextFile(
    launcher,
    "install-aipilot-manager.cmd",
    "application/octet-stream",
  );
}
