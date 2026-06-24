import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../dist/", import.meta.url));
const basePath = process.env.GITHUB_PAGES_BASE_PATH ?? "/chengbai.github.io";
const normalizedBase = `/${basePath.replace(/^\/+|\/+$/g, "")}`;
const textExtensions = new Set([".html", ".xml"]);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}

function extensionOf(filePath) {
  const index = filePath.lastIndexOf(".");
  return index === -1 ? "" : filePath.slice(index).toLowerCase();
}

function prefixRootRelativeUrls(content) {
  const attrPattern = /\b(href|src|action)=("|')\/(?!\/|chengbai\.github\.io(?:\/|$))([^"']*)\2/g;
  return content.replace(attrPattern, (_match, attr, quote, path) => {
    return `${attr}=${quote}${normalizedBase}/${path}${quote}`;
  });
}

let changed = 0;

for await (const filePath of walk(distDir)) {
  const info = await stat(filePath);
  if (!info.isFile() || !textExtensions.has(extensionOf(filePath))) {
    continue;
  }

  const original = await readFile(filePath, "utf8");
  const updated = prefixRootRelativeUrls(original);
  if (updated !== original) {
    await writeFile(filePath, updated, "utf8");
    changed += 1;
  }
}

console.log(`[prefix-github-pages-base] updated ${changed} files with ${normalizedBase}`);
