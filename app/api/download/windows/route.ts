import { downloadSetupFile } from "../lib";

export async function GET() {
  return downloadSetupFile("windows/setup-opencode.ps1", "setup-opencode.ps1");
}
