import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyDist } from "../scripts/verify-dist.mjs";

const origin = "https://methylation5mc2026-jpg.github.io";
const base = "/chengbai.github.io";
const policy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; base-uri 'self'; form-action 'self'; style-src-attr 'unsafe-inline'";
const page = (body = "", csp = policy) => `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="strict-origin-when-cross-origin"></head><body>${body}</body></html>`;

async function fixture(t, entries = {}) {
  const distDir = await mkdtemp(path.join(os.tmpdir(), "verify-dist-"));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(distDir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(distDir).startsWith("verify-dist-"));
    return rm(distDir, { recursive: true, force: true });
  });
  const content = {
    "index.html": page('<h1 id="hello">Hello</h1>'),
    "rss.xml": `<rss><channel><link>${origin}${base}/</link></channel></rss>`,
    "sitemap-index.xml": `<sitemapindex><sitemap><loc>${origin}${base}/sitemap-0.xml</loc></sitemap></sitemapindex>`,
    "sitemap-0.xml": `<urlset><url><loc>${origin}${base}/</loc></url></urlset>`,
    ...entries
  };
  for (const [relative, value] of Object.entries(content)) {
    const full = path.join(distDir, relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, value);
  }
  return verifyDist({ distDir });
}

test("accepts valid base, relative and encoded fragments, public assets, and external links", async (t) => {
  const result = await fixture(t, {
    "index.html": page(`<a href="${base}/chapter/#%E4%B8%AD%E6%96%87">Chapter</a><a href="https://example.com/">External</a><img src="${base}/assets/books/aivc-whitepaper/cover.svg#title">`),
    "chapter/index.html": page('<h1 id="中文">Chapter</h1><a href="../">Home</a><a href="#中文">Heading</a>'),
    "assets/books/aivc-whitepaper/cover.svg": '<svg xmlns="http://www.w3.org/2000/svg"><title id="title">Cover</title></svg>'
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.html, 2);
});

test("rejects missing and duplicated base, broken files, and broken fragments", async (t) => {
  const result = await fixture(t, {
    "index.html": page(`<a href="/missing-base/">Bad base</a><a href="${base}${base}/">Duplicate base</a><a href="${base}/missing/">Missing</a><a href="#missing">Missing heading</a>`)
  });
  assert.deepEqual(new Set(result.errors.map((error) => error.code)), new Set(["BASE_MISSING", "BASE_DUPLICATED", "BROKEN_LINK", "BROKEN_FRAGMENT"]));
});

test("checks absolute RSS and sitemap destinations independently of HTML links", async (t) => {
  const result = await fixture(t, {
    "rss.xml": `<rss><channel><link>${origin}/</link><item><link>/article/</link></item></channel></rss>`,
    "sitemap-0.xml": `<urlset><url><loc>${origin}${base}/missing/</loc></url></urlset>`
  });
  assert.ok(result.errors.some((error) => error.file === "rss.xml" && error.code === "BASE_MISSING"));
  assert.ok(result.errors.some((error) => error.file === "rss.xml" && error.code === "FEED_URL"));
  assert.ok(result.errors.some((error) => error.file === "sitemap-0.xml" && error.code === "BROKEN_LINK"));
});

test("rejects directly accessible hidden books and sensitive build artifacts without inbound links", async (t) => {
  const result = await fixture(t, {
    "assets/books/founders-playbook/private.pdf": "private",
    "assets/books/new-hidden-book/page-01.png": "private",
    "books/founders-playbook/index.html": page(),
    "daily/hidden-note/index.html": page(),
    ".env.production": "EXAMPLE=not-a-secret",
    "_astro/source.js.map": "{}"
  });
  assert.equal(result.errors.filter((error) => error.code === "PUBLIC_LEAK").length, 6);
});

test("rejects missing policy/referrer, script policy overrides, event handlers, and executable URLs", async (t) => {
  const result = await fixture(t, {
    "index.html": '<!doctype html><html><head></head><body></body></html>',
    "unsafe/index.html": page('<a href="javascript:alert(1)" onclick="alert(1)">Unsafe</a>', `${policy}; script-src-elem 'unsafe-inline'`)
  });
  for (const code of ["CSP", "REFERRER", "UNSAFE_URL", "INLINE_HANDLER"]) assert.ok(result.errors.some((error) => error.code === code), code);
});

test("validates actual inline script bytes and CSP placement", async (t) => {
  const script = 'document.documentElement.dataset.test = "ok";';
  const hash = createHash("sha256").update(script).digest("base64");
  const csp = policy.replace("script-src 'self'", `script-src 'self' 'sha256-${hash}'`);
  const good = await fixture(t, { "index.html": page(`<script>${script}</script>`, csp) });
  assert.deepEqual(good.errors, []);
  const bad = await fixture(t, {
    "index.html": page(`<script>${script} // changed</script>`, csp),
    "early/index.html": page("", csp).replace("<head>", `<head><script>${script}</script>`)
  });
  assert.ok(bad.errors.some((error) => error.code === "CSP_HASH"));
  assert.ok(bad.errors.some((error) => error.code === "CSP_ORDER"));
});
