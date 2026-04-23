import { downloadSetupFile } from "../lib";

export async function GET() {
  return downloadSetupFile("linux/setup-opencode.sh", "setup-opencode-linux.sh");
}
