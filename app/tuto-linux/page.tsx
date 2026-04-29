import { getStoredConfig } from "@/lib/config-store";
import { TutorialContent } from "@/app/tuto/tutorial-content";

export default async function LinuxTutorialPage() {
  const config = await getStoredConfig();

  return (
    <TutorialContent
      platform="linux"
      azureResourceName={config.azureResourceName}
    />
  );
}
