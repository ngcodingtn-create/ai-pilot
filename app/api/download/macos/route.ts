import { downloadSetupFile } from "../lib";

export async function GET() {
  return downloadSetupFile("macos/setup-opencode.sh", "setup-opencode-macos.sh");
}
