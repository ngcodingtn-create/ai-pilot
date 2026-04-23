import { downloadTextFile } from "../lib";
import { normalizeSiteUrl } from "@/lib/site-url";

export async function GET() {
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-pilot-ten.vercel.app",
  );

  const launcher = [
    "@echo off",
    "setlocal",
    `powershell -ExecutionPolicy Bypass -Command \"irm ${siteUrl}/api/install/windows | iex\"`,
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
