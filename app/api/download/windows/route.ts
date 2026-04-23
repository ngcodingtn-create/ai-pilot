import { downloadTextFile } from "../lib";
import { normalizeSiteUrl } from "@/lib/site-url";

export async function GET() {
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-pilot-ten.vercel.app",
  );

  const launcher = [
    "@echo off",
    "setlocal",
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$script = irm '${siteUrl}/api/install/windows'; & ([scriptblock]::Create($script)) -PromptProjectRoot"`,
    "if errorlevel 1 (",
    "  echo.",
    "  echo Setup failed. Press any key to close.",
    "  pause >nul",
    "  exit /b %errorlevel%",
    ")",
    "echo.",
    "echo Setup completed. Press any key to close.",
    "pause >nul",
  ].join("\r\n");

  return downloadTextFile(
    launcher,
    "setup-opencode.cmd",
    "application/octet-stream",
  );
}
