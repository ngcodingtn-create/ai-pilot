import { readFile } from "node:fs/promises";
import path from "node:path";
import { getStoredConfig } from "@/lib/config-store";

function replaceAll(source: string, pattern: RegExp, replacement: string) {
  return source.replace(pattern, () => replacement);
}

export async function serveInstallScript(relativePath: string) {
  const absolutePath = path.resolve(process.cwd(), "setup", relativePath);
  let content = await readFile(absolutePath, "utf8");
  const config = await getStoredConfig();

  content = replaceAll(content, /admin-3342-resource/g, config.azureResourceName);
  content = replaceAll(content, /gpt-5\.4-1/g, config.azureDefaultDeployment);

  const keyReplacement = config.includeApiKeyInInstaller && config.azureApiKey
    ? config.azureApiKey
    : "";

  content = replaceAll(
    content,
    /\$AzureApiKey = \"\"/g,
    `$AzureApiKey = "${keyReplacement}"`,
  );
  content = replaceAll(
    content,
    /AZURE_OPENAI_API_KEY=\"\$\{AZURE_OPENAI_API_KEY:-\}\"/g,
    `AZURE_OPENAI_API_KEY="\${AZURE_OPENAI_API_KEY:-${keyReplacement}}"`,
  );

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
