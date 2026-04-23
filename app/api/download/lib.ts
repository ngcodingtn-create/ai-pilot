import { readFile } from "node:fs/promises";
import path from "node:path";

export function downloadTextFile(
  content: string,
  filename: string,
  contentType = "text/plain; charset=utf-8",
) {
  return new Response(content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function downloadSetupFile(relativePath: string, filename: string) {
  const absolutePath = path.resolve(process.cwd(), "setup", relativePath);
  const content = await readFile(absolutePath, "utf8");

  return downloadTextFile(content, filename);
}
