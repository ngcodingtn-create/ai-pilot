import { serveInstallScript } from "../lib";

export async function GET() {
  return serveInstallScript("macos/setup-opencode.sh");
}
