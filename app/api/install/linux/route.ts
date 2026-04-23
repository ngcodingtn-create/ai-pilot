import { serveInstallScript } from "../lib";

export async function GET() {
  return serveInstallScript("linux/setup-opencode.sh");
}
