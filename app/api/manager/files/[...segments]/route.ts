import { readFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ segments: string[] }> },
) {
  const params = await context.params;
  const safeSegments = params.segments.filter((segment) => segment && segment !== "..");
  const filePath = path.resolve(process.cwd(), "manager-app", ...safeSegments);
  const managerRoot = path.resolve(process.cwd(), "manager-app");

  if (!filePath.startsWith(managerRoot)) {
    return new Response("Not found", { status: 404 });
  }

  const content = await readFile(filePath);
  const contentType =
    CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ??
    "application/octet-stream";

  return new Response(content, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
