import { readFile, readdir } from "node:fs/promises";
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

function getContentTypeForArtifact(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".exe") return "application/vnd.microsoft.portable-executable";
  if (ext === ".appimage") return "application/octet-stream";
  if (ext === ".deb") return "application/vnd.debian.binary-package";
  if (ext === ".dmg") return "application/x-apple-diskimage";
  if (ext === ".zip") return "application/zip";

  return "application/octet-stream";
}

export async function findManagerArtifact(
  extensions: string[],
  preferredNameParts: string[] = [],
  options?: { requirePreferredMatch?: boolean },
) {
  const distPath = path.resolve(process.cwd(), "manager-app", "dist");

  try {
    const entries = await readdir(distPath, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) =>
        extensions.some((extension) => name.toLowerCase().endsWith(extension.toLowerCase())),
      )
      .sort((left, right) => left.localeCompare(right));

    if (!files.length) {
      return null;
    }

    const preferred = files.find((name) =>
      preferredNameParts.every((part) => name.toLowerCase().includes(part.toLowerCase())),
    );

    if (options?.requirePreferredMatch && preferredNameParts.length > 0) {
      return preferred ? path.join(distPath, preferred) : null;
    }

    return path.join(distPath, preferred ?? files[0]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function downloadBinaryArtifact(filePath: string) {
  const content = await readFile(filePath);
  const filename = path.basename(filePath);

  return new Response(content, {
    headers: {
      "Content-Type": getContentTypeForArtifact(filePath),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function getManagerAppVersion() {
  try {
    const packageJsonPath = path.resolve(process.cwd(), "manager-app", "package.json");
    const raw = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    return String(parsed.version ?? "").trim();
  } catch {
    return "";
  }
}

type GitHubReleaseAsset = {
  name: string;
  browser_download_url: string;
};

export async function findManagerReleaseAsset(
  matcher: (asset: GitHubReleaseAsset) => boolean,
) {
  try {
    const response = await fetch(
      "https://api.github.com/repos/ngcodingtn-create/ai-pilot/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "AIPilot-Portal",
        },
        next: { revalidate: 300 },
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      assets?: GitHubReleaseAsset[];
    };
    const assets = Array.isArray(payload.assets) ? payload.assets : [];
    return assets.find(matcher) ?? null;
  } catch {
    return null;
  }
}
