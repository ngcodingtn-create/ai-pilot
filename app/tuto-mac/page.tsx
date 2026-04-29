import { getStoredConfig } from "@/lib/config-store";
import { TutorialContent } from "@/app/tuto/tutorial-content";

export default async function MacTutorialPage() {
  const config = await getStoredConfig();

  return (
    <TutorialContent
      platform="macos"
      azureResourceName={config.azureResourceName}
    />
  );
}
