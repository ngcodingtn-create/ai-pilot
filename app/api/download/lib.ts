import { readFile } from "node:fs/promises";
import path from "node:path";

export async function downloadSetupFile(relativePath: string, filename: string) {
  const absolutePath = path.resolve(process.cwd(), "setup", relativePath);
  const content = await readFile(absolutePath, "utf8");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
