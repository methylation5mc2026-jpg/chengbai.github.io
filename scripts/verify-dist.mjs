import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, parseFragment } from "parse5";

const defaultDist = fileURLToPath(new URL("../dist/", import.meta.url));
const defaultSite = "https://methylation5mc2026-jpg.github.io";
// Keep this fail-closed publication allowlist aligned with src/lib/content.ts.
const publicBooks = ["aivc-whitepaper"];

function* descendants(node) {
  yield node;
  for (const child of node.childNodes ?? []) yield* descendants(child);
  if (node.content) yield* descendants(node.content);
}

function attributes(node) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
}

function textContent(node) {
  return [...descendants(node)].filter((child) => child.nodeName === "#text")
    .map((child) => child.value).join("");
}

function decodeXml(value) {
  return textContent(parseFragment(value.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")));
}

function pagePath(file, base) {
  return `${base}/${file === "index.html" ? "" : file.replace(/\/index\.html$/, "/")}`;
}

export async function verifyDist({
  distDir = defaultDist,
  basePath = process.env.GITHUB_PAGES_BASE_PATH ?? "/chengbai.github.io",
  site = defaultSite,
  publicBookSlugs = publicBooks
} = {}) {
  const base = `/${basePath.replace(/^\/+|\/+$/g, "")}`.replace(/^\/$/, "");
  const origin = new URL(site).origin;
  const files = new Map();
  const documents = new Map();
  const errors = [];
  const seenErrors = new Set();
  let references = 0;
  let feedReferences = 0;
  const fail = (code, file, message, line) => {
    const key = JSON.stringify([code, file, message]);
    if (!seenErrors.has(key)) {
      seenErrors.add(key);
      errors.push({ code, file, ...(line ? { line } : {}), message });
    }
  };

  async function walk(directory, prefix = "") {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = `${prefix}${entry.name}`;
      const full = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) fail("PUBLIC_LEAK", relative, "Deployment contains a symbolic link.");
      else if (entry.isDirectory()) await walk(full, `${relative}/`);
      else if (entry.isFile()) files.set(relative, full);
    }
  }
  await walk(distDir);

  function isUnpublished(file) {
    const book = /^(?:assets\/books|books)\/([^/]+)\//.exec(file)?.[1];
    return (book && !publicBookSlugs.includes(book)) || /^daily\/(?!index\.html$).+\.html$/.test(file);
  }

  for (const [file, full] of files) {
    if (isUnpublished(file)) fail("PUBLIC_LEAK", file, "Unpublished book assets or hidden daily entries are deployed.");
    if (/(?:^|\/)(?:\.git(?:hub)?(?:\/|$)|\.git(?:ignore|attributes)$|\.env(?:\.|$)|\.DS_Store$|node_modules\/|private\/|unpublished-assets\/|package(?:-lock)?\.json$)|\.(?:map|bak|pem|key|p12|pfx|sql|astro|mdx?|tsx?|ya?ml|toml)$/i.test(file)) {
      fail("PUBLIC_LEAK", file, "Source, configuration, backup, or secret material is deployed.");
    }
    if (/\.html$/i.test(file)) {
      const source = await readFile(full, "utf8");
      const document = parse(source, { sourceCodeLocationInfo: true });
      const nodes = [...descendants(document)];
      const ids = new Set(nodes.flatMap((node) => {
        const attrs = attributes(node);
        return [attrs.id, node.tagName === "a" ? attrs.name : undefined].filter(Boolean);
      }));
      documents.set(file, { source, nodes, ids });
    }
  }
  if (!documents.has("index.html")) fail("MISSING_ENTRY", "index.html", "The built homepage is missing.");

  async function checkUrl(raw, sourceFile, context, { absolute = false } = {}) {
    references += 1;
    if (/^\s*javascript:/i.test(raw)) return fail("UNSAFE_URL", sourceFile, `${context}: executable URL.`);
    let url;
    try { url = new URL(raw, `${origin}${pagePath(sourceFile, base)}`); }
    catch { return fail("INVALID_URL", sourceFile, `${context}: ${raw}`); }
    if (absolute && !/^https?:\/\//i.test(raw)) fail("FEED_URL", sourceFile, `${context}: URL must be absolute: ${raw}`);
    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) {
      if (absolute) fail("FEED_URL", sourceFile, `${context}: expected this site's origin: ${raw}`);
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return fail("INVALID_URL", sourceFile, `${context}: invalid URL encoding: ${raw}`); }
    if (base && !(pathname === base || pathname.startsWith(`${base}/`))) {
      return fail("BASE_MISSING", sourceFile, `${context}: missing ${base}: ${raw}`);
    }
    if (base && (pathname === `${base}${base}` || pathname.startsWith(`${base}${base}/`))) {
      return fail("BASE_DUPLICATED", sourceFile, `${context}: duplicated ${base}: ${raw}`);
    }
    const relative = pathname.slice(base.length).replace(/^\//, "");
    if (relative.includes("\\") || relative.includes("\0") || relative.split("/").includes("..")) {
      return fail("INVALID_URL", sourceFile, `${context}: unsafe local path: ${raw}`);
    }
    const target = files.has(relative) ? relative : `${relative.replace(/\/$/, "")}${relative ? "/" : ""}index.html`;
    if (!files.has(target)) return fail("BROKEN_LINK", sourceFile, `${context}: local target does not exist: ${raw}`);
    if (isUnpublished(target)) fail("PUBLIC_LEAK", sourceFile, `${context}: unpublished content is referenced: ${raw}`);
    if (!url.hash || url.hash === "#") return;
    let fragment;
    try { fragment = decodeURIComponent(url.hash.slice(1)).split(":~:")[0]; }
    catch { return fail("INVALID_URL", sourceFile, `${context}: invalid fragment encoding: ${raw}`); }
    if (!fragment || fragment.toLowerCase() === "top") return;
    let ids = documents.get(target)?.ids;
    if (!ids && /\.svg$/i.test(target)) {
      ids = new Set([...descendants(parseFragment(await readFile(files.get(target), "utf8")))]
        .map((node) => attributes(node).id).filter(Boolean));
    }
    if (ids && !ids.has(fragment)) fail("BROKEN_FRAGMENT", sourceFile, `${context}: target fragment does not exist: ${raw}`);
  }

  for (const [file, { nodes }] of documents) {
    const head = nodes.find((node) => node.tagName === "head");
    // Metadata in an inert template does not protect the document.
    const headNodes = head.childNodes ?? [];
    const cspNodes = headNodes.filter((node) => node.tagName === "meta" && attributes(node)["http-equiv"]?.toLowerCase() === "content-security-policy");
    if (cspNodes.length !== 1) fail("CSP", file, "Expected exactly one Content-Security-Policy meta in head.");
    const directives = new Map();
    for (const directive of (attributes(cspNodes[0] ?? {}).content ?? "").split(";")) {
      const [name, ...values] = directive.trim().split(/\s+/);
      if (name && !directives.has(name.toLowerCase())) directives.set(name.toLowerCase(), values);
    }
    const scriptSources = directives.get("script-src-elem") ?? directives.get("script-src") ?? [];
    const scriptDirectives = ["script-src", "script-src-elem", "script-src-attr"].flatMap((name) => directives.get(name) ?? []);
    if (!directives.get("script-src")?.length || scriptDirectives.includes("'unsafe-inline'") || scriptDirectives.includes("'unsafe-eval'")) {
      fail("CSP", file, "script-src must exist and must not allow unsafe-inline or unsafe-eval.");
    }
    if (directives.get("object-src")?.join(" ") !== "'none'") fail("CSP", file, "object-src must be 'none'.");
    for (const directive of ["base-uri", "form-action"]) {
      const values = directives.get(directive) ?? [];
      if (values.length !== 1 || !["'self'", "'none'"].includes(values[0])) fail("CSP", file, `${directive} must restrict navigation to 'self' or 'none'.`);
    }
    const referrer = headNodes.filter((node) => node.tagName === "meta" && attributes(node).name?.toLowerCase() === "referrer");
    if (referrer.length !== 1 || !["no-referrer", "same-origin", "strict-origin", "strict-origin-when-cross-origin"].includes(attributes(referrer[0] ?? {}).content?.toLowerCase())) {
      fail("REFERRER", file, "Expected one restrictive referrer meta in head.");
    }
    for (const node of nodes) {
      const attrs = attributes(node);
      const line = node.sourceCodeLocation?.startLine;
      if (node.tagName === "base") fail("BASE_ELEMENT", file, "Unexpected base element changes URL resolution.", line);
      for (const attribute of ["href", "src", "action"]) {
        if (attribute in attrs) await checkUrl(attrs[attribute], file, `${node.tagName}[${attribute}]`);
      }
      for (const attribute of Object.keys(attrs)) {
        if (/^on/i.test(attribute)) fail("INLINE_HANDLER", file, `${node.tagName}[${attribute}] is blocked by the required CSP.`, line);
      }
      if (node.tagName !== "script") continue;
      if (node.sourceCodeLocation?.startOffset < cspNodes[0]?.sourceCodeLocation?.startOffset) fail("CSP_ORDER", file, "A script appears before the CSP meta.", line);
      const type = attrs.type?.toLowerCase() ?? "";
      if (attrs.src || (type && !["module", "text/javascript", "application/javascript"].includes(type))) continue;
      const source = textContent(node);
      if (!source.trim()) continue;
      const permitted = ["sha256", "sha384", "sha512"].some((algorithm) => scriptSources.includes(`'${algorithm}-${createHash(algorithm).update(source).digest("base64")}'`));
      if (!permitted) fail("CSP_HASH", file, "An inline script has no matching CSP hash.", line);
    }
  }

  const feedFiles = [...files.keys()].filter((file) => file === "rss.xml" || /^sitemap[^/]*\.xml$/.test(file));
  if (!files.has("rss.xml")) fail("MISSING_FEED", "rss.xml", "RSS feed is missing.");
  if (!files.has("sitemap-index.xml")) fail("MISSING_FEED", "sitemap-index.xml", "Sitemap index is missing.");
  for (const file of feedFiles) {
    const source = await readFile(files.get(file), "utf8");
    const tag = file === "rss.xml" ? "link" : "loc";
    const matches = [...source.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}\\s*>`, "gi"))];
    if (!matches.length) fail("EMPTY_FEED", file, `No ${tag} entries found.`);
    for (const match of matches) {
      feedReferences += 1;
      await checkUrl(decodeXml(match[1].trim()), file, tag, { absolute: true });
    }
  }
  return { files: files.size, html: documents.size, references, feedReferences, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const distIndex = args.indexOf("--dist");
    const result = await verifyDist({ ...(distIndex >= 0 ? { distDir: path.resolve(args[distIndex + 1]) } : {}) });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`[verify-dist] ${result.files} files, ${result.html} HTML pages, ${result.references} URLs (${result.feedReferences} feed/sitemap URLs).`);
      for (const error of result.errors.slice(0, 60)) console.error(`[${error.code}] ${error.file}${error.line ? `:${error.line}` : ""}: ${error.message}`);
      if (result.errors.length > 60) console.error(`[verify-dist] ${result.errors.length - 60} additional errors; use --json to see all.`);
      console.log(`[verify-dist] ${result.errors.length ? `FAIL: ${result.errors.length} errors` : "PASS"}`);
    }
    process.exitCode = result.errors.length ? 1 : 0;
  } catch (error) {
    console.error(`[verify-dist] ${error.message}`);
    process.exitCode = 1;
  }
}
