import { serveInstallScript } from "../lib";

export async function GET() {
  return serveInstallScript("windows/setup-opencode.ps1");
}
